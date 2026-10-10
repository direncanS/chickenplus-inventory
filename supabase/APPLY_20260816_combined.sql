-- ============================================================================
-- Combined migration bundle (2026-08-16) — paste into Supabase SQL Editor and run.
-- Idempotent: safe to run once against the production database.
--   1) checklist auto-rollover  (carried_over_at + rpc_rollover_checklist_to_week)
--   2) reorder D/Verpackung products
--   3) product complements (complement_of_id + Deckel↔base links)
-- ============================================================================

-- ---- 1) checklist auto-rollover -------------------------------------------
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS carried_over_at TIMESTAMPTZ;

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

-- ---- 2) reorder D/Verpackung products -------------------------------------
UPDATE products p
SET sort_order = v.sort_order,
    updated_at = now()
FROM (VALUES
  ('Kaffeebecher', 1),
  ('Espressobecher', 2),
  ('Limonade Becher', 3),
  ('Limonade Becher Deckel', 4),
  ('Kassarolle', 5),
  ('Pommestüte', 6),
  ('Pommesbox', 7),
  ('Menübox', 8),
  ('Bucket', 9),
  ('Bowl500', 10),
  ('Bowl500 Deckel', 11),
  ('Bowl1100', 12),
  ('Bowl1100 Deckel', 13),
  ('4Eck bowl500', 14),
  ('4Eck Bowl500 Deckel', 15),
  ('Coleslaw Becher', 16),
  ('Papiertasche', 17),
  ('Papiertasche Wolt', 18),
  ('Papiertüte', 19),
  ('Burgerpapier', 20),
  ('Papier f Serviertablette', 21),
  ('Deckel f Käsesauce', 22)
) AS v(name, sort_order)
JOIN storage_locations sl ON sl.code = 'D'
JOIN categories c ON c.storage_location_id = sl.id AND c.name = 'Verpackung'
WHERE p.category_id = c.id
  AND p.name = v.name;

-- ---- 3) product complements -----------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS complement_of_id UUID REFERENCES products(id);

CREATE INDEX IF NOT EXISTS idx_products_complement_of_id
  ON products(complement_of_id)
  WHERE complement_of_id IS NOT NULL;

UPDATE products deckel
SET complement_of_id = base.id,
    updated_at = now()
FROM products base, (VALUES
  ('Bowl500 Deckel', 'Bowl500'),
  ('Bowl1100 Deckel', 'Bowl1100'),
  ('4Eck Bowl500 Deckel', '4Eck bowl500'),
  ('Limonade Becher Deckel', 'Limonade Becher')
) AS m(deckel_name, base_name)
WHERE deckel.name = m.deckel_name
  AND base.name = m.base_name
  AND deckel.category_id = base.category_id;
