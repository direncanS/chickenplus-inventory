-- Reorder D / Verpackung products so that complementary/related items sit next
-- to each other (each base product immediately followed by its lid/Deckel).
-- Idempotent: matches products by name within the Verpackung category.

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
