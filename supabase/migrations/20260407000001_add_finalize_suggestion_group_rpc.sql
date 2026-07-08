CREATE OR REPLACE FUNCTION rpc_finalize_suggestion_group(
  p_checklist_id UUID,
  p_supplier_id UUID,
  p_supplier_name TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_item JSONB;
  v_ordered_items JSONB := '[]'::JSONB;
  v_order_result JSONB;
  v_order_id UUID := NULL;
  v_order_number TEXT := NULL;
  v_now TIMESTAMPTZ := now();
  v_updated INTEGER;
  v_supplier_active BOOLEAN;
  v_ordered_quantity NUMERIC;
BEGIN
  IF p_supplier_id IS NOT NULL THEN
    SELECT is_active INTO v_supplier_active
    FROM suppliers
    WHERE id = p_supplier_id;

    IF v_supplier_active IS DISTINCT FROM TRUE THEN
      RETURN jsonb_build_object('success', false, 'error', 'inactive_supplier');
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item->>'is_ordered')::BOOLEAN, false) THEN
      v_ordered_quantity := CASE
        WHEN v_item ? 'ordered_quantity'
          AND (v_item->>'ordered_quantity') IS NOT NULL
          AND (v_item->>'ordered_quantity') <> ''
          THEN (v_item->>'ordered_quantity')::NUMERIC
        ELSE NULL
      END;

      v_ordered_items := v_ordered_items || jsonb_build_array(
        jsonb_build_object(
          'product_id', (v_item->>'product_id')::UUID,
          'quantity', (v_item->>'quantity')::NUMERIC,
          'unit', v_item->>'unit',
          'is_ordered', true,
          'ordered_quantity', v_ordered_quantity
        )
      );
    END IF;
  END LOOP;

  IF p_supplier_id IS NOT NULL AND jsonb_array_length(v_ordered_items) > 0 THEN
    v_order_result := rpc_create_order_with_items(
      p_supplier_id,
      p_checklist_id,
      p_created_by,
      v_ordered_items,
      'ordered'
    );

    IF COALESCE((v_order_result->>'success')::BOOLEAN, false) = false THEN
      RETURN v_order_result;
    END IF;

    v_order_id := (v_order_result->>'order_id')::UUID;
    v_order_number := v_order_result->>'order_number';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_ordered_quantity := CASE
      WHEN COALESCE((v_item->>'is_ordered')::BOOLEAN, false)
        AND v_item ? 'ordered_quantity'
        AND (v_item->>'ordered_quantity') IS NOT NULL
        AND (v_item->>'ordered_quantity') <> ''
        THEN (v_item->>'ordered_quantity')::NUMERIC
      ELSE NULL
    END;

    UPDATE checklist_items
    SET
      is_ordered = COALESCE((v_item->>'is_ordered')::BOOLEAN, false),
      ordered_quantity = v_ordered_quantity,
      ordered_supplier_id = CASE
        WHEN COALESCE((v_item->>'is_ordered')::BOOLEAN, false) THEN p_supplier_id
        ELSE NULL
      END,
      ordered_supplier_name = CASE
        WHEN COALESCE((v_item->>'is_ordered')::BOOLEAN, false) THEN p_supplier_name
        ELSE NULL
      END,
      ordered_recorded_at = CASE
        WHEN COALESCE((v_item->>'is_ordered')::BOOLEAN, false) THEN v_now
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = (v_item->>'checklist_item_id')::UUID
      AND checklist_id = p_checklist_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated <> 1 THEN
      RAISE EXCEPTION 'checklist_item_not_found';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ordered_quantity');
  WHEN OTHERS THEN
    IF SQLERRM = 'checklist_item_not_found' THEN
      RETURN jsonb_build_object('success', false, 'error', 'checklist_item_not_found');
    END IF;

    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
