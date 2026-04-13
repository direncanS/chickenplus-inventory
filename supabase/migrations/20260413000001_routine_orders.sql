-- ============================================
-- Routine Orders - Tables, RPC, RLS, Indexes
-- ============================================

-- ============================================
-- 1. routine_orders (Template)
-- ============================================
CREATE TABLE routine_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, day_of_week)
);

CREATE TRIGGER set_routine_orders_updated_at
  BEFORE UPDATE ON routine_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. routine_order_items (Template products)
-- ============================================
CREATE TABLE routine_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_order_id UUID NOT NULL REFERENCES routine_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  default_quantity NUMERIC(10,2) NOT NULL CHECK (default_quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(routine_order_id, product_id)
);

CREATE TRIGGER set_routine_order_items_updated_at
  BEFORE UPDATE ON routine_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. routine_order_instances (Weekly instances)
-- ============================================
CREATE TABLE routine_order_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_order_id UUID NOT NULL REFERENCES routine_orders(id),
  checklist_id UUID REFERENCES checklists(id),
  order_id UUID REFERENCES orders(id),
  iso_year INTEGER NOT NULL,
  iso_week INTEGER NOT NULL CHECK (iso_week BETWEEN 1 AND 53),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'skipped')),
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(routine_order_id, iso_year, iso_week)
);

CREATE INDEX idx_routine_instances_week ON routine_order_instances (iso_year, iso_week);
CREATE INDEX idx_routine_instances_order ON routine_order_instances (order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER set_routine_order_instances_updated_at
  BEFORE UPDATE ON routine_order_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. routine_order_instance_items (Weekly product copies)
-- ============================================
CREATE TABLE routine_order_instance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES routine_order_instances(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  default_quantity NUMERIC(10,2) NOT NULL CHECK (default_quantity > 0),
  adjusted_quantity NUMERIC(10,2) CHECK (adjusted_quantity IS NULL OR adjusted_quantity > 0),
  is_included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, product_id)
);

CREATE TRIGGER set_routine_order_instance_items_updated_at
  BEFORE UPDATE ON routine_order_instance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS: Read-only tables, mutations via RPC
-- ============================================
ALTER TABLE routine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_order_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_order_instance_items ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated
CREATE POLICY routine_orders_select ON routine_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY routine_order_items_select ON routine_order_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY routine_order_instances_select ON routine_order_instances
  FOR SELECT TO authenticated USING (true);
CREATE POLICY routine_order_instance_items_select ON routine_order_instance_items
  FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies → all mutations go through SECURITY DEFINER RPCs

-- ============================================
-- Helper: check admin + active
-- ============================================
CREATE OR REPLACE FUNCTION _routine_check_admin()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION _routine_check_active()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- RPC 1: Create routine order (admin)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_create_routine_order(
  p_supplier_id UUID,
  p_day_of_week TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM _routine_check_admin();

  INSERT INTO routine_orders (supplier_id, day_of_week, notes)
  VALUES (p_supplier_id, p_day_of_week, p_notes)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_day_of_week');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_routine');
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 2: Update routine order (admin)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_update_routine_order(
  p_routine_id UUID,
  p_is_active BOOLEAN DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  PERFORM _routine_check_admin();

  UPDATE routine_orders
  SET
    is_active = COALESCE(p_is_active, is_active),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_routine_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 3: Delete routine order (admin)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_delete_routine_order(
  p_routine_id UUID
)
RETURNS JSONB AS $$
BEGIN
  PERFORM _routine_check_admin();

  DELETE FROM routine_orders WHERE id = p_routine_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 4: Add routine order item (admin)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_add_routine_order_item(
  p_routine_order_id UUID,
  p_product_id UUID,
  p_default_quantity NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM _routine_check_admin();

  INSERT INTO routine_order_items (routine_order_id, product_id, default_quantity)
  VALUES (p_routine_order_id, p_product_id, p_default_quantity)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_item');
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 5: Remove routine order item (admin)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_remove_routine_order_item(
  p_item_id UUID
)
RETURNS JSONB AS $$
BEGIN
  PERFORM _routine_check_admin();

  DELETE FROM routine_order_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 6: Generate routine instances (idempotent)
-- ============================================
CREATE OR REPLACE FUNCTION rpc_generate_routine_instances(
  p_iso_year INTEGER,
  p_iso_week INTEGER,
  p_week_start_date DATE,
  p_checklist_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_routine RECORD;
  v_item RECORD;
  v_instance_id UUID;
  v_instances_created INTEGER := 0;
  v_instances_backfilled INTEGER := 0;
  v_scheduled_date DATE;
  v_day_offset INTEGER;
  v_existing_instance_id UUID;
BEGIN
  PERFORM _routine_check_active();

  FOR v_routine IN
    SELECT ro.id, ro.day_of_week
    FROM routine_orders ro
    JOIN suppliers s ON s.id = ro.supplier_id
    WHERE ro.is_active = true AND s.is_active = true
  LOOP
    -- Calculate scheduled date from week start + day offset
    -- week_start_date is Monday (ISO week start)
    v_day_offset := CASE v_routine.day_of_week
      WHEN 'montag' THEN 0
      WHEN 'dienstag' THEN 1
      WHEN 'mittwoch' THEN 2
      WHEN 'donnerstag' THEN 3
      WHEN 'freitag' THEN 4
      WHEN 'samstag' THEN 5
      WHEN 'sonntag' THEN 6
    END;
    v_scheduled_date := p_week_start_date + v_day_offset;

    -- Check if instance already exists for this routine+week
    SELECT id INTO v_existing_instance_id
    FROM routine_order_instances
    WHERE routine_order_id = v_routine.id
      AND iso_year = p_iso_year
      AND iso_week = p_iso_week;

    IF v_existing_instance_id IS NOT NULL THEN
      -- Backfill: update checklist_id if it was NULL and we now have one
      IF p_checklist_id IS NOT NULL THEN
        UPDATE routine_order_instances
        SET checklist_id = p_checklist_id
        WHERE id = v_existing_instance_id
          AND checklist_id IS NULL;

        IF FOUND THEN
          v_instances_backfilled := v_instances_backfilled + 1;
        END IF;
      END IF;

      CONTINUE;
    END IF;

    -- Create new instance
    INSERT INTO routine_order_instances (
      routine_order_id, checklist_id, iso_year, iso_week, scheduled_date
    ) VALUES (
      v_routine.id, p_checklist_id, p_iso_year, p_iso_week, v_scheduled_date
    ) RETURNING id INTO v_instance_id;

    -- Copy items from template (only active products)
    FOR v_item IN
      SELECT roi.product_id, roi.default_quantity
      FROM routine_order_items roi
      JOIN products p ON p.id = roi.product_id
      WHERE roi.routine_order_id = v_routine.id
        AND p.is_active = true
    LOOP
      INSERT INTO routine_order_instance_items (
        instance_id, product_id, default_quantity
      ) VALUES (
        v_instance_id, v_item.product_id, v_item.default_quantity
      );
    END LOOP;

    v_instances_created := v_instances_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'instances_created', v_instances_created,
    'instances_backfilled', v_instances_backfilled
  );
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 7: Confirm routine instance → create real order
-- ============================================
CREATE OR REPLACE FUNCTION rpc_confirm_routine_instance(
  p_instance_id UUID,
  p_checklist_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_instance RECORD;
  v_checklist_status checklist_status;
  v_supplier_id UUID;
  v_items JSONB := '[]'::JSONB;
  v_item RECORD;
  v_order_result JSONB;
  v_item_count INTEGER := 0;
BEGIN
  PERFORM _routine_check_active();

  -- Get instance
  SELECT roi.*, ro.supplier_id
  INTO v_instance
  FROM routine_order_instances roi
  JOIN routine_orders ro ON ro.id = roi.routine_order_id
  WHERE roi.id = p_instance_id;

  IF v_instance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'instance_not_found');
  END IF;

  IF v_instance.status != 'pending' OR v_instance.order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'instance_already_resolved');
  END IF;

  -- Check checklist is completed
  SELECT status INTO v_checklist_status
  FROM checklists WHERE id = p_checklist_id;

  IF v_checklist_status IS NULL OR v_checklist_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'checklist_not_completed');
  END IF;

  v_supplier_id := v_instance.supplier_id;

  -- Build items array from instance items
  FOR v_item IN
    SELECT ii.product_id,
           COALESCE(ii.adjusted_quantity, ii.default_quantity) as quantity,
           p.unit
    FROM routine_order_instance_items ii
    JOIN products p ON p.id = ii.product_id
    WHERE ii.instance_id = p_instance_id
      AND ii.is_included = true
      AND COALESCE(ii.adjusted_quantity, ii.default_quantity) > 0
  LOOP
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_item.product_id,
        'quantity', v_item.quantity,
        'unit', v_item.unit,
        'is_ordered', true,
        'ordered_quantity', v_item.quantity
      )
    );
    v_item_count := v_item_count + 1;
  END LOOP;

  -- If no items to order, skip instead
  IF v_item_count = 0 THEN
    UPDATE routine_order_instances
    SET status = 'skipped',
        confirmed_by = auth.uid(),
        confirmed_at = now()
    WHERE id = p_instance_id;

    RETURN jsonb_build_object('success', true, 'action', 'skipped_no_items');
  END IF;

  -- Create real order via existing RPC
  v_order_result := rpc_create_order_with_items(
    v_supplier_id,
    p_checklist_id,
    auth.uid(),
    v_items,
    'ordered'
  );

  IF NOT (v_order_result->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'order_creation_failed',
      'details', v_order_result->>'error'
    );
  END IF;

  -- Link instance to order
  UPDATE routine_order_instances
  SET order_id = (v_order_result->>'order_id')::UUID,
      checklist_id = p_checklist_id,
      confirmed_by = auth.uid(),
      confirmed_at = now()
  WHERE id = p_instance_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'confirmed',
    'order_id', v_order_result->>'order_id',
    'order_number', v_order_result->>'order_number'
  );
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 8: Skip routine instance
-- ============================================
CREATE OR REPLACE FUNCTION rpc_skip_routine_instance(
  p_instance_id UUID,
  p_checklist_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_instance RECORD;
  v_checklist_status checklist_status;
BEGIN
  PERFORM _routine_check_active();

  SELECT * INTO v_instance
  FROM routine_order_instances
  WHERE id = p_instance_id;

  IF v_instance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'instance_not_found');
  END IF;

  IF v_instance.status != 'pending' OR v_instance.order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'instance_already_resolved');
  END IF;

  -- Check checklist is completed
  SELECT status INTO v_checklist_status
  FROM checklists WHERE id = p_checklist_id;

  IF v_checklist_status IS NULL OR v_checklist_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'checklist_not_completed');
  END IF;

  UPDATE routine_order_instances
  SET status = 'skipped',
      confirmed_by = auth.uid(),
      confirmed_at = now()
  WHERE id = p_instance_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC 9: Adjust routine instance item
-- ============================================
CREATE OR REPLACE FUNCTION rpc_adjust_routine_instance_item(
  p_item_id UUID,
  p_adjusted_quantity NUMERIC DEFAULT NULL,
  p_is_included BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_instance_status TEXT;
  v_instance_order_id UUID;
BEGIN
  PERFORM _routine_check_active();

  -- Check instance is still pending
  SELECT roi.status, roi.order_id
  INTO v_instance_status, v_instance_order_id
  FROM routine_order_instance_items ii
  JOIN routine_order_instances roi ON roi.id = ii.instance_id
  WHERE ii.id = p_item_id;

  IF v_instance_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'item_not_found');
  END IF;

  IF v_instance_status != 'pending' OR v_instance_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'instance_already_resolved');
  END IF;

  UPDATE routine_order_instance_items
  SET
    adjusted_quantity = CASE
      WHEN p_adjusted_quantity IS NOT NULL THEN p_adjusted_quantity
      ELSE adjusted_quantity
    END,
    is_included = COALESCE(p_is_included, is_included)
  WHERE id = p_item_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  WHEN OTHERS THEN
    IF SQLERRM = 'unauthorized' THEN
      RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
