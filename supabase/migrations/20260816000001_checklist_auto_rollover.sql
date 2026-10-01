-- Auto-rollover: carry an incomplete checklist (draft/in_progress) from a past
-- week forward into the current week without losing entered data. Adds a
-- carried_over_at marker and an RPC that moves the week fields in place.

-- ============================================
-- 1. Track when a checklist was carried over
-- ============================================
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS carried_over_at TIMESTAMPTZ;

-- ============================================
-- 2. RPC: rpc_rollover_checklist_to_week
--    Moves an existing incomplete checklist to the target week, preserving all
--    checklist_items (current_stock, is_checked, overrides). Idempotent and
--    guarded so it never overwrites an existing checklist for the target week
--    and never touches a checklist that is not genuinely in the past.
-- ============================================
CREATE OR REPLACE FUNCTION rpc_rollover_checklist_to_week(
  p_checklist_id UUID,
  p_iso_year INTEGER,
  p_iso_week INTEGER,
  p_week_start_date DATE,
  p_week_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_status TEXT;
  v_week_end DATE;
BEGIN
  -- Target week must be free (unique constraint would reject a collision anyway)
  IF EXISTS (
    SELECT 1 FROM checklists
    WHERE week_start_date = p_week_start_date
      AND id <> p_checklist_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_week_exists');
  END IF;

  SELECT status, week_end_date INTO v_status, v_week_end
  FROM checklists
  WHERE id = p_checklist_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Only carry over incomplete checklists that are genuinely in the past
  IF v_status NOT IN ('draft', 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_active');
  END IF;

  IF v_week_end >= p_week_start_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_stale');
  END IF;

  UPDATE checklists
  SET
    iso_year = p_iso_year,
    iso_week = p_iso_week,
    checklist_date = p_week_start_date,
    week_start_date = p_week_start_date,
    week_end_date = p_week_end_date,
    carried_over_at = now()
  WHERE id = p_checklist_id;

  RETURN jsonb_build_object('success', true, 'checklist_id', p_checklist_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
