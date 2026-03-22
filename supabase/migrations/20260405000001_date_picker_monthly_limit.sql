-- Date picker, monthly limit, cleanup by month, and product changes

-- ============================================
-- 1. Add checklist_date column
-- ============================================
ALTER TABLE checklists ADD COLUMN checklist_date DATE;
UPDATE checklists SET checklist_date = (created_at AT TIME ZONE 'Europe/Vienna')::DATE;
ALTER TABLE checklists ALTER COLUMN checklist_date SET NOT NULL;

-- ============================================
-- 2. Update RPC: rpc_create_checklist_with_snapshot
--    - New parameter: p_checklist_date
--    - New check: monthly limit (max 5 per month)
-- ============================================
-- Drop old 3-parameter overload to prevent PostgREST ambiguity
DROP FUNCTION IF EXISTS rpc_create_checklist_with_snapshot(INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION rpc_create_checklist_with_snapshot(
  p_iso_year INTEGER,
  p_iso_week INTEGER,
  p_created_by UUID,
  p_checklist_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_checklist_id UUID;
  v_item_count INTEGER;
  v_date DATE;
  v_month_count INTEGER;
BEGIN
  v_date := COALESCE(p_checklist_date, CURRENT_DATE);

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

  -- Check monthly limit (max 5 per month)
  SELECT COUNT(*) INTO v_month_count
  FROM checklists
  WHERE EXTRACT(YEAR FROM checklist_date) = EXTRACT(YEAR FROM v_date)
    AND EXTRACT(MONTH FROM checklist_date) = EXTRACT(MONTH FROM v_date);

  IF v_month_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'monthly_limit_reached'
    );
  END IF;

  -- Create checklist
  INSERT INTO checklists (iso_year, iso_week, checklist_date, status, created_by)
  VALUES (p_iso_year, p_iso_week, v_date, 'draft', p_created_by)
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
-- 3. New cleanup RPC: rpc_cleanup_previous_months
--    Deletes all checklists and orders from before the current month
-- ============================================
CREATE OR REPLACE FUNCTION rpc_cleanup_previous_months(p_current_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE;
  v_deleted_orders INTEGER;
  v_deleted_checklists INTEGER;
BEGIN
  v_month_start := date_trunc('month', p_current_date)::DATE;

  -- 1. Delete orders first (FK constraint: orders.checklist_id → checklists.id)
  -- order_items will be deleted via CASCADE
  WITH deleted AS (
    DELETE FROM orders
    WHERE checklist_id IN (
      SELECT id FROM checklists WHERE checklist_date < v_month_start
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_orders FROM deleted;

  -- 2. Delete old checklists (checklist_items will be deleted via CASCADE)
  WITH deleted AS (
    DELETE FROM checklists
    WHERE checklist_date < v_month_start
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_checklists FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_checklists', v_deleted_checklists,
    'deleted_orders', v_deleted_orders,
    'month_start', v_month_start
  );
END;
$$;

-- ============================================
-- 4. Product changes
-- ============================================
UPDATE products SET is_active = false WHERE name = 'FritzApfelkirsch';
UPDATE products SET is_active = false WHERE name = 'SariyerCola';

-- Idempotent + safe on empty storage_locations (local reset before seed.sql).
-- On production this ran with data already present; here the SELECT form
-- simply inserts zero rows when storage_locations is empty, and seed.sql
-- will add the product during local reset.
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, sort_order)
SELECT
  'Fritz Ananas Limette',
  sl.id,
  c.id,
  'kiste',
  1,
  17
FROM storage_locations sl
JOIN categories c
  ON c.storage_location_id = sl.id
 AND c.name = 'Getränke'
WHERE sl.code = 'D'
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- ============================================
-- 5. Drop the unique constraint on (iso_year, iso_week)
--    since we now allow multiple checklists per week (limited by month)
-- ============================================
ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_iso_year_iso_week_key;
