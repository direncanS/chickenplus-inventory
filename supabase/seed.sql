-- ============================================
-- Chickenplus Bestandskontrolle - Seed Data
-- 7 storage locations, 16 categories, 126 products
-- ============================================

-- Storage Locations (7)
INSERT INTO storage_locations (code, name, sort_order) VALUES
  ('D', 'Depo / Lager', 1),
  ('KH', 'Kühlhaus Chickenplus', 2),
  ('KH-DIYAR', 'Kühlhaus Diyar', 3),
  ('TK', 'Tiefküche', 4),
  ('B', 'Basics', 5),
  ('M', 'Mutfak', 6),
  ('K', 'Kaffee', 7)
ON CONFLICT (code) DO NOTHING;

-- Categories (16: 11 named + 5 general for locations without sub-categories)
-- D: Depo / Lager (6 categories)
INSERT INTO categories (storage_location_id, name, sort_order) VALUES
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Getränke', 1),
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Verpackung', 2),
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Besteck & Zubehör', 3),
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Soßen & Konserven', 4),
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Kochen', 5),
  ((SELECT id FROM storage_locations WHERE code = 'D'), 'Reinigung & Hygiene', 6)
ON CONFLICT (storage_location_id, name) DO NOTHING;

-- KH: Kühlhaus Chickenplus (5 categories)
INSERT INTO categories (storage_location_id, name, sort_order) VALUES
  ((SELECT id FROM storage_locations WHERE code = 'KH'), 'Fleisch', 1),
  ((SELECT id FROM storage_locations WHERE code = 'KH'), 'Milchprodukte', 2),
  ((SELECT id FROM storage_locations WHERE code = 'KH'), 'Gemüse & Salat', 3),
  ((SELECT id FROM storage_locations WHERE code = 'KH'), 'Soßen', 4),
  ((SELECT id FROM storage_locations WHERE code = 'KH'), 'Sonstiges', 5)
ON CONFLICT (storage_location_id, name) DO NOTHING;

-- Single-category locations (Allgemein)
INSERT INTO categories (storage_location_id, name, sort_order) VALUES
  ((SELECT id FROM storage_locations WHERE code = 'KH-DIYAR'), 'Allgemein', 1),
  ((SELECT id FROM storage_locations WHERE code = 'TK'), 'Allgemein', 1),
  ((SELECT id FROM storage_locations WHERE code = 'B'), 'Allgemein', 1),
  ((SELECT id FROM storage_locations WHERE code = 'M'), 'Allgemein', 1),
  ((SELECT id FROM storage_locations WHERE code = 'K'), 'Allgemein', 1)
ON CONFLICT (storage_location_id, name) DO NOTHING;

-- ============================================
-- Products (126 total)
-- ============================================

-- D / Getränke (19 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Cola', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 10, NULL, 1),
  ('Colazero', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 8, NULL, 2),
  ('Fanta', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 3, NULL, 3),
  ('Sprite', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 3, NULL, 4),
  ('EisteeZitrone', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 6, NULL, 5),
  ('EisteePfirsich', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 6, NULL, 6),
  ('SariyerCola', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 3, NULL, 7),
  ('Redbull', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 2, NULL, 8),
  ('Uludag', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 5, NULL, 9),
  ('VöslauerStill', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 2, NULL, 10),
  ('VöslauerPrickelnd', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'koli', 2, NULL, 11),
  ('Fritzkola Original', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 2, NULL, 12),
  ('FritzkolaSuperzero', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 2, NULL, 13),
  ('FritzLimo', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 14),
  ('Fritzorange', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 15),
  ('FritzMischmarsch', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 16),
  ('FritzApfelkirsch', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 17),
  ('FritzTraubeschorle', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 18),
  ('Caprisonne', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'karton', 3, NULL, 19),
  ('Fritz Ananas Limette', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Getränke'), 'kiste', 1, NULL, 20)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- D / Verpackung (19 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Kaffeebecher', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 1),
  ('Espressobecher', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 2),
  ('Limonade Becher', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'stueck', NULL, NULL, 3),
  ('Kassarolle', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'stueck', 6, NULL, 4),
  ('Pommestüte', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 5),
  ('Pommesbox', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 3, 4, 6),
  ('Menübox', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 7),
  ('Bucket takeaway', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'pack', 1, 2, 8),
  ('Bucket', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 9),
  ('Bowl500', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 3, NULL, 10),
  ('Bowl1100', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 3, NULL, 11),
  ('4Eck bowl500', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 12),
  ('Coleslaw Becher', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'stueck', 50, NULL, 13),
  ('Papiertasche', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 2, NULL, 14),
  ('Papiertasche Wolt', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 2, NULL, 15),
  ('Papiertüte', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 16),
  ('Burgerpapier', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'pack', 3, NULL, 17),
  ('Papier f Serviertablette', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'pack', 3, NULL, 18),
  ('Deckel f Käsesauce', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'pack', 3, NULL, 19),
  ('Bowl500 Deckel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 20),
  ('Bowl1100 Deckel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'karton', 1, NULL, 21),
  ('Limonade Becher Deckel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Verpackung'), 'stueck', 1, NULL, 22)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- D / Besteck & Zubehör (5 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Kaffeestäbchen', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Besteck & Zubehör'), 'pack', 1, NULL, 1),
  ('Dessert Löffel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Besteck & Zubehör'), 'pack', 1, NULL, 2),
  ('Gabel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Besteck & Zubehör'), 'pack', 6, NULL, 3),
  ('Strohhalm', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Besteck & Zubehör'), 'pack', 3, NULL, 4),
  ('Zahnstocher', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Besteck & Zubehör'), 'stueck', NULL, NULL, 5)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- D / Soßen & Konserven (12 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Essiggurke', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 6, NULL, 1),
  ('Jalapenos', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 4, NULL, 2),
  ('Röstzwiebel', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'pack', 2, NULL, 3),
  ('Sirache', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'karton', 4, NULL, 4),
  ('Tomatensauce', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'koli', 1, NULL, 5),
  ('Senf Yellow Mustard', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 4, NULL, 6),
  ('Mais', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 4, NULL, 7),
  ('Pustzasalat', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 3, NULL, 8),
  ('Oliven', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'stueck', 1, NULL, 9),
  ('Makarna', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'pack', 10, NULL, 10),
  ('Zucker', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Soßen & Konserven'), 'karton', 1, NULL, 11)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- D / Kochen (3 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Maisstärke', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Kochen'), 'kg', 10, NULL, 1),
  ('Mehl Özbasak', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Kochen'), 'koli', 20, NULL, 2),
  ('Sonnenblumenöl', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Kochen'), 'karton', 12, NULL, 3)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- D / Reinigung & Hygiene (9 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Handschuhe', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'karton', 1, NULL, 1),
  ('Handtuchrolle', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'pack', 18, NULL, 2),
  ('Wcpapier', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'pack', 1, NULL, 3),
  ('Serviette', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'karton', 3, NULL, 4),
  ('Papiertücher Z wcspender', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'karton', 3, NULL, 5),
  ('Mistsackel160lt', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'pack', 4, NULL, 6),
  ('Geschirrspülmittel Hand', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'stueck', 2, NULL, 7),
  ('Grillreiniger', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'stueck', 2, NULL, 8),
  ('Glasreiniger', (SELECT id FROM storage_locations WHERE code = 'D'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'D' AND c.name = 'Reinigung & Hygiene'), 'stueck', 1, NULL, 9)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH / Fleisch (3 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Speck', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Fleisch'), 'pack', 3, NULL, 1),
  ('Hühnerflügel', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Fleisch'), 'kiste', 7, NULL, 2),
  ('Hühner-Innenfilet', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Fleisch'), 'kiste', 10, NULL, 3)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH / Milchprodukte (7 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Cheddarsauce', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'karton', 10, NULL, 1),
  ('Cheddarkäsescheiben', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'karton', 3, NULL, 2),
  ('Mozarellakäse', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'pack', 2, NULL, 3),
  ('Parmesan', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'kg', 1, NULL, 4),
  ('Cremesahne', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'koli', 1, NULL, 5),
  ('Buttermilch', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'koli', 3, NULL, 6),
  ('Milch', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Milchprodukte'), 'koli', 1, NULL, 7)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH / Gemüse & Salat (3 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Rucola', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Gemüse & Salat'), 'kiste', 4, NULL, 1),
  ('Eisbergsalat', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Gemüse & Salat'), 'kiste', 7, 8, 2),
  ('Tomaten', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Gemüse & Salat'), 'kiste', 3, NULL, 3)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH / Soßen (8 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Sourcream', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'koli', 3, NULL, 1),
  ('BBQ Honigsauce', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'koli', 3, NULL, 2),
  ('Süßsauersauce', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'koli', 2, NULL, 3),
  ('Sweetchili', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'flasche', 3, NULL, 4),
  ('Ketchup 10kg', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'kuebel', 2, NULL, 5),
  ('Mayo 10kg', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'kuebel', 5, NULL, 6),
  ('Ketchup Portion', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'karton', 2, NULL, 7),
  ('Mayo Portion', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Soßen'), 'karton', 2, NULL, 8)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH / Sonstiges (4 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Trüffelpaste', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Sonstiges'), 'flasche', 2, NULL, 1),
  ('Trüffelöl', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Sonstiges'), 'flasche', 2, NULL, 2),
  ('Coleslaw', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Sonstiges'), 'kg', 10, NULL, 3),
  ('Wrap', (SELECT id FROM storage_locations WHERE code = 'KH'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH' AND c.name = 'Sonstiges'), 'karton', 1, NULL, 4)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- KH-DIYAR / Allgemein (2 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Rotezwiebel', (SELECT id FROM storage_locations WHERE code = 'KH-DIYAR'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH-DIYAR' AND c.name = 'Allgemein'), 'kg', 25, 30, 1),
  ('Rindfleisch', (SELECT id FROM storage_locations WHERE code = 'KH-DIYAR'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'KH-DIYAR' AND c.name = 'Allgemein'), 'kg', 25, NULL, 2)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- TK / Allgemein (14 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Pommes', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 10, NULL, 1),
  ('Chilicheese Nuggets', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 1, NULL, 2),
  ('Mozarellasticks', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 1, NULL, 3),
  ('Onionrings', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 1, NULL, 4),
  ('Hühner-Innenfilet TK', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'kiste', 10, NULL, 5),
  ('Veggie noChicken', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'pack', 1, NULL, 6),
  ('Avocado', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'pack', 2, NULL, 7),
  ('Martins Burger Brot', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 20, NULL, 8),
  ('Profiteroles Cup', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 4, NULL, 9),
  ('Tiramisu Cup', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'karton', 2, NULL, 10),
  ('Brownie Cheesecake', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'pack', 3, NULL, 11),
  ('Himbeere Cheesecake', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'pack', 3, NULL, 12),
  ('Caramell Cheesecake', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'pack', 3, NULL, 13),
  ('Limonade', (SELECT id FROM storage_locations WHERE code = 'TK'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'TK' AND c.name = 'Allgemein'), 'flasche', 6, NULL, 14)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- B / Allgemein (8 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Salz', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'kuebel', 3, NULL, 1),
  ('Paprikapulver', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', 10, NULL, 2),
  ('Knoblauchpulver', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', 10, NULL, 3),
  ('Schwarzer Pfeffer', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', 10, NULL, 4),
  ('Zwiebelpulver', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', 10, NULL, 5),
  ('Kurkuma', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', 5, NULL, 6),
  ('Oregano', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'pack', NULL, NULL, 7),
  ('Saucebecher 50ml', (SELECT id FROM storage_locations WHERE code = 'B'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'B' AND c.name = 'Allgemein'), 'karton', 3, NULL, 8)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- M / Allgemein (8 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Schnittlauch', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', NULL, NULL, 1),
  ('Teebutter', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', 20, NULL, 2),
  ('Honig', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', NULL, NULL, 3),
  ('Chilioil', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', 1, NULL, 4),
  ('Grillgewürz Billa', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', 1, NULL, 5),
  ('Käsesaucebecher 230ml', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'pack', 10, NULL, 6),
  ('Haarnetz', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'pack', 1, NULL, 7),
  ('Drucker Etiketten', (SELECT id FROM storage_locations WHERE code = 'M'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'M' AND c.name = 'Allgemein'), 'stueck', 6, NULL, 8)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- K / Allgemein (2 products)
INSERT INTO products (name, storage_location_id, category_id, unit, min_stock, min_stock_max, sort_order) VALUES
  ('Kaffee', (SELECT id FROM storage_locations WHERE code = 'K'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'K' AND c.name = 'Allgemein'), 'pack', 3, NULL, 1),
  ('Kakaopulver', (SELECT id FROM storage_locations WHERE code = 'K'), (SELECT c.id FROM categories c JOIN storage_locations sl ON c.storage_location_id = sl.id WHERE sl.code = 'K' AND c.name = 'Allgemein'), 'pack', 1, NULL, 2)
ON CONFLICT (storage_location_id, category_id, name) DO NOTHING;

-- ============================================
-- Suppliers & Preferred Mappings
-- Mirrors migration 20260419000001_seed_product_suppliers.sql, which no-ops
-- on local reset because products don't exist yet when migrations run.
-- ============================================

INSERT INTO suppliers (name, is_active) VALUES
  ('Spar', true), ('Metro', true), ('Metropol', true), ('Gmz', true),
  ('Icerex', true), ('Intergast', true), ('KLS', true), ('Macro', true),
  ('Etci Adem', true), ('Frostmed', true), ('Orient', true),
  ('Orderking', true), ('Swan', true)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM products p
JOIN (VALUES
  ('Kaffee', 'Spar'),
  ('Kakaopulver', 'Metro'), ('Zucker', 'Metro'), ('Espressobecher', 'Metro'),
  ('Kaffeestäbchen', 'Metro'), ('Dessert Löffel', 'Metro'), ('Strohhalm', 'Metro'),
  ('Bucket takeaway', 'Metro'), ('Käsesaucebecher 230ml', 'Metro'),
  ('Deckel f Käsesauce', 'Metro'), ('Haarnetz', 'Metro'), ('Mozarellakäse', 'Metro'),
  ('Parmesan', 'Metro'), ('Pustzasalat', 'Metro'), ('Oliven', 'Metro'),
  ('Rucola', 'Metro'), ('Trüffelpaste', 'Metro'), ('Trüffelöl', 'Metro'),
  ('Senf Yellow Mustard', 'Metro'), ('Cremesahne', 'Metro'), ('Tomatensauce', 'Metro'),
  ('Buttermilch', 'Metro'), ('Veggie noChicken', 'Metro'), ('Avocado', 'Metro'),
  ('Maisstärke', 'Metro'),
  ('Cola', 'Metropol'), ('Colazero', 'Metropol'), ('Fanta', 'Metropol'),
  ('Sprite', 'Metropol'), ('EisteeZitrone', 'Metropol'), ('EisteePfirsich', 'Metropol'),
  ('SariyerCola', 'Metropol'), ('Redbull', 'Metropol'), ('Uludag', 'Metropol'),
  ('VöslauerStill', 'Metropol'), ('VöslauerPrickelnd', 'Metropol'),
  ('Fritzkola Original', 'Metropol'), ('FritzkolaSuperzero', 'Metropol'),
  ('FritzLimo', 'Metropol'), ('Fritzorange', 'Metropol'),
  ('FritzMischmarsch', 'Metropol'), ('FritzTraubeschorle', 'Metropol'),
  ('Caprisonne', 'Metropol'), ('Bowl500', 'Metropol'), ('Bowl1100', 'Metropol'),
  ('Jalapenos', 'Metropol'), ('Mais', 'Metropol'), ('Sirache', 'Metropol'),
  ('Sweetchili', 'Metropol'), ('Wrap', 'Metropol'),
  ('Bowl500 Deckel', 'Metropol'), ('Bowl1100 Deckel', 'Metropol'),
  ('Kaffeebecher', 'Gmz'), ('Limonade Becher', 'Gmz'), ('Kassarolle', 'Gmz'),
  ('Gabel', 'Gmz'), ('Zahnstocher', 'Gmz'), ('Pommesbox', 'Gmz'),
  ('4Eck bowl500', 'Gmz'), ('Limonade Becher Deckel', 'Gmz'),
  ('Limonade', 'Icerex'),
  ('Cheddarsauce', 'Intergast'), ('Cheddarkäsescheiben', 'Intergast'),
  ('Speck', 'Intergast'), ('Sourcream', 'Intergast'),
  ('BBQ Honigsauce', 'Intergast'), ('Süßsauersauce', 'Intergast'),
  ('Essiggurke', 'KLS'), ('Röstzwiebel', 'KLS'), ('Ketchup 10kg', 'KLS'),
  ('Mayo 10kg', 'KLS'), ('Ketchup Portion', 'KLS'), ('Mayo Portion', 'KLS'),
  ('Pommes', 'KLS'), ('Chilicheese Nuggets', 'KLS'), ('Mozarellasticks', 'KLS'),
  ('Onionrings', 'KLS'), ('Profiteroles Cup', 'KLS'), ('Tiramisu Cup', 'KLS'),
  ('Paprikapulver', 'KLS'), ('Knoblauchpulver', 'KLS'), ('Zwiebelpulver', 'KLS'),
  ('Kurkuma', 'KLS'), ('Oregano', 'KLS'),
  ('Eisbergsalat', 'Macro'), ('Tomaten', 'Macro'), ('Rotezwiebel', 'Macro'),
  ('Hühner-Innenfilet', 'Macro'), ('Hühnerflügel', 'Macro'),
  ('Sonnenblumenöl', 'Macro'),
  ('Rindfleisch', 'Etci Adem'),
  ('Brownie Cheesecake', 'Frostmed'), ('Himbeere Cheesecake', 'Frostmed'),
  ('Caramell Cheesecake', 'Frostmed'),
  ('Martins Burger Brot', 'Orient'), ('Mehl Özbasak', 'Orient'),
  ('Salz', 'Orient'), ('Schwarzer Pfeffer', 'Orient'),
  ('Drucker Etiketten', 'Orderking'),
  ('Handtuchrolle', 'Swan'), ('Wcpapier', 'Swan'), ('Serviette', 'Swan'),
  ('Papiertücher Z wcspender', 'Swan'), ('Mistsackel160lt', 'Swan'),
  ('Geschirrspülmittel Hand', 'Swan'), ('Grillreiniger', 'Swan'),
  ('Glasreiniger', 'Swan')
) AS m(product_name, supplier_name) ON p.name = m.product_name
JOIN suppliers s ON s.name = m.supplier_name
ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_preferred = true;
