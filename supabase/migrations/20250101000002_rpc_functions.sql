-- ============================================
-- RPC Functions for atomic operations
-- ============================================

-- ============================================
-- rpc_bootstrap_admin: First admin setup
-- ============================================
CREATE OR REPLACE FUNCTION rpc_bootstrap_admin(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Only succeed if no admin exists yet
  UPDATE profiles
  SET role = 'admin', updated_at = now()
  WHERE id = p_user_id
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin already exists or user not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- rpc_create_checklist_with_snapshot: Create checklist + snapshot items
-- ============================================
CREATE OR REPLACE FUNCTION rpc_create_checklist_with_snapshot(
  p_iso_year INTEGER,
  p_iso_week INTEGER,
  p_created_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_checklist_id UUID;
  v_item_count INTEGER;
BEGIN
  -- Check no active checklist exists
  IF EXISTS (
    SELECT 1 FROM checklists
    WHERE status IN ('draft', 'in_progress')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'active_checklist_exists'
    );
  END IF;

  -- Check no duplicate week
  IF EXISTS (
    SELECT 1 FROM checklists
    WHERE iso_year = p_iso_year AND iso_week = p_iso_week
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'duplicate_week'
    );
  END IF;

  -- Create checklist
  INSERT INTO checklists (iso_year, iso_week, status, created_by)
  VALUES (p_iso_year, p_iso_week, 'draft', p_created_by)
  RETURNING id INTO v_checklist_id;

  -- Snapshot all active products
  INSERT INTO checklist_items (
    checklist_id, product_id, product_name,
    min_stock_snapshot, min_stock_max_snapshot
  )
  SELECT
    v_checklist_id,
    p.id,
    p.name,
    p.min_stock,
    p.min_stock_max
  FROM products p
  WHERE p.is_active = true
  ORDER BY p.sort_order;

  GET DIAGNOSTICS v_item_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'checklist_id', v_checklist_id,
    'item_count', v_item_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- rpc_create_order_with_retry: Create order with unique number
-- ============================================
CREATE OR REPLACE FUNCTION rpc_create_order_with_items(
  p_supplier_id UUID,
  p_checklist_id UUID,
  p_created_by UUID,
  p_items JSONB  -- array of {product_id, quantity, unit}
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_iso_year INTEGER;
  v_iso_week INTEGER;
  v_seq INTEGER;
  v_retry INTEGER := 0;
  v_item JSONB;
BEGIN
  -- Get checklist week info
  SELECT iso_year, iso_week INTO v_iso_year, v_iso_week
  FROM checklists WHERE id = p_checklist_id;

  IF v_iso_year IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'checklist_not_found');
  END IF;

  -- Retry loop for unique order number
  LOOP
    v_seq := (
      SELECT COUNT(*) + 1
      FROM orders
      WHERE checklist_id = p_checklist_id
    ) + v_retry;

    v_order_number := 'ORD-' || v_iso_year || '-W' ||
      LPAD(v_iso_week::TEXT, 2, '0') || '-' || v_seq;

    BEGIN
      INSERT INTO orders (order_number, supplier_id, checklist_id, status, created_by)
      VALUES (v_order_number, p_supplier_id, p_checklist_id, 'draft', p_created_by)
      RETURNING id INTO v_order_id;

      -- Success, exit loop
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_retry := v_retry + 1;
      IF v_retry >= 3 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'order_number_conflict'
        );
      END IF;
    END;
  END LOOP;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit')::unit_type
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- rpc_update_order_delivery: Update delivery status atomically
-- ============================================
CREATE OR REPLACE FUNCTION rpc_update_order_delivery(
  p_order_id UUID,
  p_item_deliveries JSONB  -- array of {order_item_id, is_delivered}
)
RETURNS JSONB AS $$
DECLARE
  v_delivery JSONB;
  v_total_items INTEGER;
  v_delivered_items INTEGER;
  v_new_status order_status;
  v_current_status order_status;
BEGIN
  -- Get current order status
  SELECT status INTO v_current_status
  FROM orders WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_current_status IN ('delivered', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_editable');
  END IF;

  -- Update individual item deliveries
  FOR v_delivery IN SELECT * FROM jsonb_array_elements(p_item_deliveries)
  LOOP
    UPDATE order_items
    SET is_delivered = (v_delivery->>'is_delivered')::BOOLEAN
    WHERE id = (v_delivery->>'order_item_id')::UUID
    AND order_id = p_order_id;
  END LOOP;

  -- Count totals for auto status transition
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_delivered = true)
  INTO v_total_items, v_delivered_items
  FROM order_items WHERE order_id = p_order_id;

  -- Determine new status
  IF v_delivered_items = v_total_items THEN
    v_new_status := 'delivered';
    UPDATE orders
    SET status = 'delivered', delivered_at = now()
    WHERE id = p_order_id;
  ELSIF v_delivered_items > 0 THEN
    v_new_status := 'partially_delivered';
    UPDATE orders
    SET status = 'partially_delivered'
    WHERE id = p_order_id;
  ELSE
    v_new_status := v_current_status;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', v_new_status,
    'delivered_items', v_delivered_items,
    'total_items', v_total_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
