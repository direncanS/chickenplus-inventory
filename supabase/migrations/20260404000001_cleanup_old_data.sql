-- Cleanup old checklists and related orders (4-month retention)
-- Called on-demand when a new checklist is created

CREATE OR REPLACE FUNCTION rpc_cleanup_old_data(p_months INTEGER DEFAULT 4)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted_orders INTEGER;
  v_deleted_checklists INTEGER;
BEGIN
  v_cutoff := NOW() - (p_months || ' months')::INTERVAL;

  -- 1. Delete orders first (FK constraint: orders.checklist_id → checklists.id, no CASCADE)
  -- order_items will be deleted via CASCADE
  WITH deleted AS (
    DELETE FROM orders
    WHERE checklist_id IN (
      SELECT id FROM checklists WHERE created_at < v_cutoff
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_orders FROM deleted;

  -- 2. Delete old checklists (checklist_items will be deleted via CASCADE)
  WITH deleted AS (
    DELETE FROM checklists
    WHERE created_at < v_cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_checklists FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_checklists', v_deleted_checklists,
    'deleted_orders', v_deleted_orders,
    'cutoff_date', v_cutoff
  );
END;
$$;
