-- ============================================================================
-- Add product "4Eck Bowl500 Deckel" to D / Verpackung with preferred supplier Gmz.
-- Also inject the 4 Deckel products into every active weekly checklist that
-- is missing them (non-archived). Idempotent.
--
--   Limonade Becher Deckel, Bowl500 Deckel, Bowl1100 Deckel (already seeded)
--   4Eck Bowl500 Deckel                                    (NEW)
-- ============================================================================

-- Step 1: Insert new product (idempotent via unique (storage_location_id, category_id, name))
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, sort_order)
SELECT '4Eck Bowl500 Deckel', sl.id, c.id, 'karton'::unit_type, 1, 23
FROM storage_locations sl
JOIN categories c ON c.storage_location_id = sl.id AND c.name = 'Verpackung'
WHERE sl.code = 'D'
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- Step 2: Map to preferred supplier Gmz (to match 4Eck bowl500 supplier)
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM products p
JOIN suppliers s ON s.name = 'Gmz'
WHERE p.name = '4Eck Bowl500 Deckel'
ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_preferred = true;

-- Step 3: Inject the 4 Deckel products into every non-archived weekly checklist
-- where they're missing. Covers draft / in_progress / completed — archived stays
-- untouched. Uses UNIQUE(checklist_id, product_id) for idempotency.
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
WHERE cl.status <> 'archived'
  AND p.name IN (
    'Limonade Becher Deckel',
    'Bowl500 Deckel',
    'Bowl1100 Deckel',
    '4Eck Bowl500 Deckel'
  )
  AND p.is_active = true
ON CONFLICT (checklist_id, product_id) DO NOTHING;

-- Step 4: Guard — verify the new product exists and has a supplier mapping.
-- Skip if products table empty (pre-seed local state).
DO $$
DECLARE
  product_count INT;
  mapping_count INT;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  IF product_count = 0 THEN
    RAISE NOTICE 'Products table empty — skipping guard (pre-seed local state).';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO mapping_count
  FROM products p
  JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  JOIN suppliers s ON s.id = ps.supplier_id
  WHERE p.name = '4Eck Bowl500 Deckel' AND s.name = 'Gmz';

  IF mapping_count <> 1 THEN
    RAISE EXCEPTION
      '4Eck Bowl500 Deckel missing preferred supplier Gmz (found %).', mapping_count;
  END IF;
END $$;
