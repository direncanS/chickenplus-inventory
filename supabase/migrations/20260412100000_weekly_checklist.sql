-- Weekly checklist system: convert from daily dates to weekly date ranges (Sunday-Saturday)

-- ============================================
-- 1. Add week_start_date and week_end_date columns
-- ============================================
ALTER TABLE checklists ADD COLUMN week_start_date DATE;
ALTER TABLE checklists ADD COLUMN week_end_date DATE;

-- ============================================
-- 2. Backfill existing data: compute Sunday-Saturday range from checklist_date
--    Sunday = start of week, Saturday = end of week
-- ============================================
UPDATE checklists
SET
  week_start_date = checklist_date - EXTRACT(DOW FROM checklist_date)::INTEGER,
  week_end_date   = checklist_date - EXTRACT(DOW FROM checklist_date)::INTEGER + 6;

-- ============================================
-- 3. Make columns NOT NULL after backfill
-- ============================================
ALTER TABLE checklists ALTER COLUMN week_start_date SET NOT NULL;
ALTER TABLE checklists ALTER COLUMN week_end_date SET NOT NULL;

-- ============================================
-- 4. Add unique constraint on week_start_date (one checklist per week)
-- ============================================
ALTER TABLE checklists ADD CONSTRAINT checklists_week_start_date_key UNIQUE (week_start_date);

-- ============================================
-- 5. Update RPC: rpc_create_checklist_with_snapshot
--    - Replace p_checklist_date with p_week_start_date / p_week_end_date
--    - Remove monthly limit check
--    - Add weekly uniqueness check
-- ============================================
DROP FUNCTION IF EXISTS rpc_create_checklist_with_snapshot(INTEGER, INTEGER, UUID, DATE);

CREATE OR REPLACE FUNCTION rpc_create_checklist_with_snapshot(
  p_iso_year INTEGER,
  p_iso_week INTEGER,
  p_created_by UUID,
  p_week_start_date DATE,
  p_week_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_checklist_id UUID;
  v_item_count INTEGER;
BEGIN
  -- Check no active checklist exists (draft or in_progress)
  IF EXISTS (
    SELECT 1 FROM checklists
    WHERE status IN ('draft', 'in_progress')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'active_checklist_exists'
    );
  END IF;

  -- Check no checklist exists for this week (any status)
  IF EXISTS (
    SELECT 1 FROM checklists
    WHERE week_start_date = p_week_start_date
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'weekly_checklist_exists'
    );
  END IF;

  -- Create checklist with week range
  INSERT INTO checklists (
    iso_year, iso_week, checklist_date,
    week_start_date, week_end_date,
    status, created_by
  )
  VALUES (
    p_iso_year, p_iso_week, p_week_start_date,
    p_week_start_date, p_week_end_date,
    'draft', p_created_by
  )
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
