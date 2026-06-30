-- ============================================
-- Test Suppliers & Product Mappings
-- Smoke Test Phase A (A-P03b)
-- ============================================
-- Bu script staging ortaminda Supabase Dashboard > SQL Editor'de calistirilir.
-- Seed data (products) onceden yuklenmis olmalidir.
--
-- Fixture:
--   Metro Test       → preferred: Cola, Pommesbox
--   Transgourmet Test → secondary: Cola
--   Backer Test      → secondary: Pommes, Mayo 10kg
--   Rotezwiebel      → mapping'siz (Nicht zugewiesen'e duser)
-- ============================================

-- 1. Test Suppliers (4 adet, biri mapping'siz kalacak)
INSERT INTO suppliers (name, contact_person, phone, email, address)
VALUES
  ('Metro Test', 'Test Kontakt', '+43 1 000 0001', 'metro@test.local', 'Teststr. 1, Wien'),
  ('Transgourmet Test', 'Test Kontakt', '+43 1 000 0002', 'transgourmet@test.local', 'Teststr. 2, Wien'),
  ('Backer Test', 'Test Kontakt', '+43 1 000 0003', 'backer@test.local', 'Teststr. 3, Wien'),
  ('Lieferdienst Placeholder', NULL, NULL, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- 2. Product Mappings
-- Metro Test: preferred for Cola and Pommesbox
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred, unit_price, notes)
SELECT
  p.id,
  s.id,
  true,
  NULL,
  'Test mapping - preferred'
FROM products p, suppliers s
WHERE p.name = 'Cola' AND s.name = 'Metro Test'
ON CONFLICT (product_id, supplier_id) DO NOTHING;

INSERT INTO product_suppliers (product_id, supplier_id, is_preferred, unit_price, notes)
SELECT
  p.id,
  s.id,
  true,
  NULL,
  'Test mapping - preferred'
FROM products p, suppliers s
WHERE p.name = 'Pommesbox' AND s.name = 'Metro Test'
ON CONFLICT (product_id, supplier_id) DO NOTHING;

-- Transgourmet Test: secondary for Cola
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred, unit_price, notes)
SELECT
  p.id,
  s.id,
  false,
  NULL,
  'Test mapping - secondary'
FROM products p, suppliers s
WHERE p.name = 'Cola' AND s.name = 'Transgourmet Test'
ON CONFLICT (product_id, supplier_id) DO NOTHING;

-- Backer Test: secondary for Pommes and Mayo 10kg
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred, unit_price, notes)
SELECT
  p.id,
  s.id,
  false,
  NULL,
  'Test mapping - secondary'
FROM products p, suppliers s
WHERE p.name = 'Pommes' AND s.name = 'Backer Test'
ON CONFLICT (product_id, supplier_id) DO NOTHING;

INSERT INTO product_suppliers (product_id, supplier_id, is_preferred, unit_price, notes)
SELECT
  p.id,
  s.id,
  false,
  NULL,
  'Test mapping - secondary'
FROM products p, suppliers s
WHERE p.name = 'Mayo 10kg' AND s.name = 'Backer Test'
ON CONFLICT (product_id, supplier_id) DO NOTHING;

-- 3. Dogrulama sorgulari
-- Asagidaki SELECT'ler insert sonrasi kontrol icin kullanilabilir:

-- Supplier sayisi (en az 3 test + varsa diger)
-- SELECT COUNT(*) AS supplier_count FROM suppliers;

-- Mapping sayisi (5 mapping beklenir)
-- SELECT COUNT(*) AS mapping_count FROM product_suppliers;

-- Preferred mapping kontrolu (2 preferred beklenir: Cola->Metro, Pommesbox->Metro)
-- SELECT p.name AS product, s.name AS supplier, ps.is_preferred
-- FROM product_suppliers ps
-- JOIN products p ON ps.product_id = p.id
-- JOIN suppliers s ON ps.supplier_id = s.id
-- ORDER BY s.name, p.name;

-- Mapping'siz urun kontrolu (Rotezwiebel dahil)
-- SELECT p.name FROM products p
-- WHERE p.is_active = true
--   AND NOT EXISTS (
--     SELECT 1 FROM product_suppliers ps WHERE ps.product_id = p.id
--   )
-- ORDER BY p.name;
