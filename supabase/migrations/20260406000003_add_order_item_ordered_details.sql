ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS is_ordered BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ordered_quantity NUMERIC(10,2);

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_ordered_quantity_check;

ALTER TABLE order_items
ADD CONSTRAINT order_items_ordered_quantity_check CHECK (
  (is_ordered = false AND ordered_quantity IS NULL)
  OR (is_ordered = true AND ordered_quantity IS NOT NULL AND ordered_quantity > 0)
);

CREATE OR REPLACE FUNCTION rpc_update_order_items_ordered(
  p_order_id UUID,
  p_ordered_items JSONB DEFAULT '[]'::JSONB,
  p_mark_ordered BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_item JSONB;
  v_current_status order_status;
  v_updated_items INTEGER := 0;
BEGIN
  SELECT status
  INTO v_current_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_current_status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_editable');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_ordered_items, '[]'::JSONB))
  LOOP
    UPDATE order_items
    SET
      is_ordered = COALESCE((v_item->>'is_ordered')::BOOLEAN, false),
      ordered_quantity = CASE
        WHEN COALESCE((v_item->>'is_ordered')::BOOLEAN, false)
          THEN (v_item->>'ordered_quantity')::NUMERIC
        ELSE NULL
      END
    WHERE id = (v_item->>'order_item_id')::UUID
      AND order_id = p_order_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'order_item_not_found');
    END IF;

    v_updated_items := v_updated_items + 1;
  END LOOP;

  IF p_mark_ordered THEN
    UPDATE orders
    SET status = 'ordered',
        ordered_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'ordered',
      'updated_items', v_updated_items
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_current_status,
    'updated_items', v_updated_items
  );
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ordered_quantity');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
