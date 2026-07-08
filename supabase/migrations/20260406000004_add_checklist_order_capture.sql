ALTER TABLE checklist_items
ADD COLUMN IF NOT EXISTS is_ordered BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ordered_quantity NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS ordered_supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS ordered_supplier_name TEXT,
ADD COLUMN IF NOT EXISTS ordered_recorded_at TIMESTAMPTZ;

ALTER TABLE checklist_items
DROP CONSTRAINT IF EXISTS checklist_items_ordered_capture_check;

ALTER TABLE checklist_items
ADD CONSTRAINT checklist_items_ordered_capture_check CHECK (
  (is_ordered = false AND ordered_quantity IS NULL AND ordered_supplier_id IS NULL AND ordered_supplier_name IS NULL AND ordered_recorded_at IS NULL)
  OR (is_ordered = true AND (ordered_quantity IS NULL OR ordered_quantity > 0))
);

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_ordered_quantity_check;

ALTER TABLE order_items
ADD CONSTRAINT order_items_ordered_quantity_check CHECK (
  (is_ordered = false AND ordered_quantity IS NULL)
  OR (is_ordered = true AND (ordered_quantity IS NULL OR ordered_quantity > 0))
);

CREATE OR REPLACE FUNCTION rpc_create_order_with_items(
  p_supplier_id UUID,
  p_checklist_id UUID,
  p_created_by UUID,
  p_items JSONB,
  p_initial_status order_status DEFAULT 'draft'
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
  v_ordered_at TIMESTAMPTZ := NULL;
BEGIN
  SELECT iso_year, iso_week INTO v_iso_year, v_iso_week
  FROM checklists WHERE id = p_checklist_id;

  IF v_iso_year IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'checklist_not_found');
  END IF;

  IF p_initial_status NOT IN ('draft', 'ordered') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_initial_status');
  END IF;

  IF p_initial_status = 'ordered' THEN
    v_ordered_at := now();
  END IF;

  LOOP
    v_seq := (
      SELECT COUNT(*) + 1
      FROM orders
      WHERE checklist_id = p_checklist_id
    ) + v_retry;

    v_order_number := 'ORD-' || v_iso_year || '-W' ||
      LPAD(v_iso_week::TEXT, 2, '0') || '-' || v_seq;

    BEGIN
      INSERT INTO orders (order_number, supplier_id, checklist_id, status, ordered_at, created_by)
      VALUES (v_order_number, p_supplier_id, p_checklist_id, p_initial_status, v_ordered_at, p_created_by)
      RETURNING id INTO v_order_id;

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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit, is_ordered, ordered_quantity)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit')::unit_type,
      COALESCE((v_item->>'is_ordered')::BOOLEAN, false),
      CASE
        WHEN v_item ? 'ordered_quantity' AND (v_item->>'ordered_quantity') IS NOT NULL AND (v_item->>'ordered_quantity') <> ''
          THEN (v_item->>'ordered_quantity')::NUMERIC
        ELSE NULL
      END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_ordered_quantity'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
