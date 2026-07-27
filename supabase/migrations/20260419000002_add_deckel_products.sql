-- ============================================================================
-- Add 3 new products to D / Verpackung with their preferred suppliers:
--   Bowl500 Deckel         → Metropol
--   Bowl1100 Deckel        → Metropol
--   Limonade Becher Deckel → Gmz
-- ============================================================================

-- Step 1: Insert new products (safe on empty storage_locations / pre-seed local)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, sort_order)
SELECT v.name, sl.id, c.id, v.unit::unit_type, v.min_stock, v.sort_order
FROM (VALUES
  ('Bowl500 Deckel',         'karton', 1, 20),
  ('Bowl1100 Deckel',        'karton', 1, 21),
  ('Limonade Becher Deckel', 'stueck', 1, 22)
) AS v(name, unit, min_stock, sort_order)
JOIN storage_locations sl ON sl.code = 'D'
JOIN categories c ON c.storage_location_id = sl.id AND c.name = 'Verpackung'
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- Step 2: Preferred supplier mappings (idempotent)
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM (VALUES
  ('Bowl500 Deckel',         'Metropol'),
  ('Bowl1100 Deckel',        'Metropol'),
  ('Limonade Becher Deckel', 'Gmz')
) AS m(product_name, supplier_name)
JOIN products p ON p.name = m.product_name
JOIN suppliers s ON s.name = m.supplier_name
ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_preferred = true;

-- Step 3: Narrow guard. Skip on empty products (local pre-seed); seed.sql
-- replicates the same inserts after migrations finish.
DO $$
DECLARE
  matched_count INT;
  expected_count INT := 3;
  product_count INT;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;

  IF product_count = 0 THEN
    RAISE NOTICE 'Products table empty — skipping guard (pre-seed local state).';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO matched_count
  FROM (VALUES
    ('Bowl500 Deckel',         'Metropol'),
    ('Bowl1100 Deckel',        'Metropol'),
    ('Limonade Becher Deckel', 'Gmz')
  ) AS m(product_name, supplier_name)
  JOIN products p ON p.name = m.product_name
  JOIN suppliers s ON s.name = m.supplier_name
  JOIN product_suppliers ps
    ON ps.product_id = p.id
   AND ps.supplier_id = s.id
   AND ps.is_preferred = true;

  IF matched_count <> expected_count THEN
    RAISE EXCEPTION
      'Seed mismatch: expected % new Deckel mappings, got %.',
      expected_count, matched_count;
  END IF;
END $$;
