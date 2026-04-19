-- ============================================================================
-- Remove test suppliers that leaked into production from test-suppliers.sql
-- (Metro Test, Transgourmet Test, Backer Test, Lieferdienst Placeholder)
--
-- Strategy:
--   - If any orders reference these suppliers (rare), keep the rows but flag
--     them as inactive so they disappear from the UI without violating the FK.
--   - Otherwise: clean up product_suppliers mappings, then delete suppliers.
-- Idempotent: re-running after cleanup is a no-op.
-- ============================================================================

DO $$
DECLARE
  test_names TEXT[] := ARRAY[
    'Metro Test',
    'Transgourmet Test',
    'Backer Test',
    'Lieferdienst Placeholder'
  ];
  blocking_orders INT;
  deleted_mappings INT;
  deleted_suppliers INT;
BEGIN
  SELECT COUNT(*) INTO blocking_orders
  FROM orders
  WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = ANY(test_names));

  IF blocking_orders > 0 THEN
    UPDATE suppliers
    SET is_active = false
    WHERE name = ANY(test_names);
    RAISE NOTICE
      'Test suppliers deactivated (% linked orders prevent deletion).',
      blocking_orders;
  ELSE
    DELETE FROM product_suppliers
    WHERE supplier_id IN (SELECT id FROM suppliers WHERE name = ANY(test_names));
    GET DIAGNOSTICS deleted_mappings = ROW_COUNT;

    DELETE FROM suppliers WHERE name = ANY(test_names);
    GET DIAGNOSTICS deleted_suppliers = ROW_COUNT;

    RAISE NOTICE
      'Removed % test suppliers and % product mappings.',
      deleted_suppliers, deleted_mappings;
  END IF;
END $$;
