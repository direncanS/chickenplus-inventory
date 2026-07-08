-- Keep order delivery status derived from item-level truth, including rollback.
CREATE OR REPLACE FUNCTION rpc_update_order_delivery(
  p_order_id UUID,
  p_item_deliveries JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_delivery JSONB;
  v_total_items INTEGER;
  v_delivered_items INTEGER;
  v_new_status order_status;
  v_current_status order_status;
BEGIN
  SELECT status INTO v_current_status
  FROM orders
  WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_current_status IN ('delivered', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_editable');
  END IF;

  FOR v_delivery IN SELECT * FROM jsonb_array_elements(p_item_deliveries)
  LOOP
    UPDATE order_items
    SET is_delivered = (v_delivery->>'is_delivered')::BOOLEAN
    WHERE id = (v_delivery->>'order_item_id')::UUID
      AND order_id = p_order_id;
  END LOOP;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_delivered = true)
  INTO v_total_items, v_delivered_items
  FROM order_items
  WHERE order_id = p_order_id;

  IF v_delivered_items = v_total_items AND v_total_items > 0 THEN
    v_new_status := 'delivered';
    UPDATE orders
    SET status = 'delivered', delivered_at = now()
    WHERE id = p_order_id;
  ELSIF v_delivered_items > 0 THEN
    v_new_status := 'partially_delivered';
    UPDATE orders
    SET status = 'partially_delivered', delivered_at = NULL
    WHERE id = p_order_id;
  ELSE
    v_new_status := 'ordered';
    UPDATE orders
    SET status = 'ordered', delivered_at = NULL
    WHERE id = p_order_id;
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
