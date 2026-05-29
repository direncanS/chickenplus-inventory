-- ============================================================================
-- Update D / Depo products:
-- - Add "Fritz honig melone" under Getränke with preferred supplier Metropol.
-- - Deactivate "Bucket takeaway" and remove it from unfinished checklists.
-- ============================================================================

INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, sort_order)
SELECT
  'Fritz honig melone',
  sl.id,
  c.id,
  'kiste'::unit_type,
  1,
  21
FROM storage_locations sl
JOIN categories c
  ON c.storage_location_id = sl.id
 AND c.name = 'Getränke'
WHERE sl.code = 'D'
ON CONFLICT (storage_location_id, category_id, name)
DO UPDATE SET
  unit = EXCLUDED.unit,
  min_stock = EXCLUDED.min_stock,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM products p
JOIN suppliers s ON s.name = 'Metropol'
WHERE p.name = 'Fritz honig melone'
ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_preferred = true;

UPDATE products
SET is_active = false,
    updated_at = now()
WHERE name = 'Bucket takeaway';

DELETE FROM checklist_items ci
USING checklists cl, products p
WHERE ci.checklist_id = cl.id
  AND ci.product_id = p.id
  AND p.name = 'Bucket takeaway'
  AND cl.status IN ('draft', 'in_progress');

INSERT INTO checklist_items (
  checklist_id,
  product_id,
  product_name,
  min_stock_snapshot,
  min_stock_max_snapshot
)
SELECT
  cl.id,
  p.id,
  p.name,
  p.min_stock,
  p.min_stock_max
FROM checklists cl
CROSS JOIN products p
WHERE cl.status IN ('draft', 'in_progress')
  AND p.name = 'Fritz honig melone'
  AND p.is_active = true
ON CONFLICT (checklist_id, product_id) DO NOTHING;

DO $$
DECLARE
  product_count INT;
  mapping_count INT;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  IF product_count = 0 THEN
    RAISE NOTICE 'Products table empty - skipping guard (pre-seed local state).';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO mapping_count
  FROM products p
  JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  JOIN suppliers s ON s.id = ps.supplier_id
  WHERE p.name = 'Fritz honig melone'
    AND p.is_active = true
    AND s.name = 'Metropol';

  IF mapping_count <> 1 THEN
    RAISE EXCEPTION
      'Fritz honig melone missing preferred supplier Metropol (found %).', mapping_count;
  END IF;
END $$;
