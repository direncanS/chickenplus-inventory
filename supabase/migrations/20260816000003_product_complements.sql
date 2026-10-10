-- Complementary products: link a product (e.g. a lid) to its base product so the
-- checklist view can always render the complement directly after its base,
-- independent of manual sort_order.

-- ============================================
-- 1. Self-referencing complement link
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS complement_of_id UUID REFERENCES products(id);

CREATE INDEX IF NOT EXISTS idx_products_complement_of_id
  ON products(complement_of_id)
  WHERE complement_of_id IS NOT NULL;

-- ============================================
-- 2. Populate known Deckel ↔ base pairs (same category)
-- ============================================
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
