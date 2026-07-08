CREATE OR REPLACE FUNCTION rpc_update_checklist_items_batch(
  p_checklist_id UUID,
  p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_checklist_status checklist_status;
  v_updated_ids UUID[];
  v_failed_ids UUID[];
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'failed_item_ids', '[]'::JSONB
    );
  END IF;

  SELECT status
  INTO v_checklist_status
  FROM checklists
  WHERE id = p_checklist_id
  FOR UPDATE;

  IF v_checklist_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'checklist_not_found',
      'failed_item_ids', '[]'::JSONB
    );
  END IF;

  IF v_checklist_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'checklist_completed',
      'failed_item_ids', (
        SELECT COALESCE(
          jsonb_agg((item->>'checklist_item_id')::UUID),
          '[]'::JSONB
        )
        FROM jsonb_array_elements(p_items) AS item
      )
    );
  END IF;

  WITH input_items AS (
    SELECT
      (item->>'checklist_item_id')::UUID AS checklist_item_id,
      CASE
        WHEN item ? 'current_stock' AND item->>'current_stock' IS NOT NULL
          THEN NULLIF(item->>'current_stock', '')
        ELSE NULL
      END AS current_stock,
      COALESCE((item->>'is_missing')::BOOLEAN, false) AS is_missing,
      COALESCE((item->>'is_checked')::BOOLEAN, false) AS is_checked
    FROM jsonb_array_elements(p_items) AS item
  ),
  duplicate_items AS (
    SELECT checklist_item_id
    FROM input_items
    GROUP BY checklist_item_id
    HAVING COUNT(*) > 1
  ),
  invalid_items AS (
    SELECT input_items.checklist_item_id
    FROM input_items
    LEFT JOIN checklist_items
      ON checklist_items.id = input_items.checklist_item_id
      AND checklist_items.checklist_id = p_checklist_id
    WHERE checklist_items.id IS NULL
  ),
  failed_items AS (
    SELECT checklist_item_id FROM duplicate_items
    UNION
    SELECT checklist_item_id FROM invalid_items
  )
  SELECT COALESCE(array_agg(checklist_item_id), ARRAY[]::UUID[])
  INTO v_failed_ids
  FROM failed_items;

  IF COALESCE(array_length(v_failed_ids, 1), 0) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'item_mismatch',
      'failed_item_ids', to_jsonb(v_failed_ids)
    );
  END IF;

  WITH input_items AS (
    SELECT
      (item->>'checklist_item_id')::UUID AS checklist_item_id,
      CASE
        WHEN item ? 'current_stock' AND item->>'current_stock' IS NOT NULL
          THEN NULLIF(item->>'current_stock', '')
        ELSE NULL
      END AS current_stock,
      COALESCE((item->>'is_missing')::BOOLEAN, false) AS is_missing,
      COALESCE((item->>'is_checked')::BOOLEAN, false) AS is_checked
    FROM jsonb_array_elements(p_items) AS item
  ),
  updated_items AS (
    UPDATE checklist_items
    SET
      current_stock = input_items.current_stock,
      is_missing = input_items.is_missing,
      is_checked = input_items.is_checked
    FROM input_items
    WHERE checklist_items.id = input_items.checklist_item_id
      AND checklist_items.checklist_id = p_checklist_id
    RETURNING checklist_items.id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_updated_ids
  FROM updated_items;

  IF v_checklist_status = 'draft' THEN
    UPDATE checklists
    SET status = 'in_progress'
    WHERE id = p_checklist_id
      AND status = 'draft';

    v_checklist_status := 'in_progress';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updated_item_ids', to_jsonb(v_updated_ids),
    'checklist_status', v_checklist_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
