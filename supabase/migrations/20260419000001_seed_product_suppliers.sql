-- ============================================================================
-- Seed Product → Supplier Mappings
-- Source: Monatliche_Bestandskontrolle_Chickenplus.xlsx (Mindestbestand column)
-- Outcome: 13 suppliers upserted, 104 preferred mappings set as the ONLY
--          preferred supplier per target product.
-- ============================================================================

-- Step 1: Canonical suppliers (idempotent)
INSERT INTO suppliers (name, is_active) VALUES
  ('Spar', true), ('Metro', true), ('Metropol', true), ('Gmz', true),
  ('Icerex', true), ('Intergast', true), ('KLS', true), ('Macro', true),
  ('Etci Adem', true), ('Frostmed', true), ('Orient', true),
  ('Orderking', true), ('Swan', true)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- Step 2: Expected mappings — single source of truth for this migration.
-- TEMP TABLE (not CTE) so it can be referenced from multiple subsequent statements.
-- Reused in Step 3 (reset), Step 4 (insert), Step 5 (guard).
CREATE TEMP TABLE expected_mappings (
  product_name TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO expected_mappings (product_name, supplier_name) VALUES
  -- Spar (1)
  ('Kaffee', 'Spar'),
  -- Metro (24)
  ('Kakaopulver', 'Metro'), ('Zucker', 'Metro'), ('Espressobecher', 'Metro'),
  ('Kaffeestäbchen', 'Metro'), ('Dessert Löffel', 'Metro'), ('Strohhalm', 'Metro'),
  ('Bucket takeaway', 'Metro'), ('Käsesaucebecher 230ml', 'Metro'),
  ('Deckel f Käsesauce', 'Metro'), ('Haarnetz', 'Metro'), ('Mozarellakäse', 'Metro'),
  ('Parmesan', 'Metro'), ('Pustzasalat', 'Metro'), ('Oliven', 'Metro'),
  ('Rucola', 'Metro'), ('Trüffelpaste', 'Metro'), ('Trüffelöl', 'Metro'),
  ('Senf Yellow Mustard', 'Metro'), ('Cremesahne', 'Metro'), ('Tomatensauce', 'Metro'),
  ('Buttermilch', 'Metro'), ('Veggie noChicken', 'Metro'), ('Avocado', 'Metro'),
  ('Maisstärke', 'Metro'),
  -- Metropol (25)
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
  -- Gmz (7)
  ('Kaffeebecher', 'Gmz'), ('Limonade Becher', 'Gmz'), ('Kassarolle', 'Gmz'),
  ('Gabel', 'Gmz'), ('Zahnstocher', 'Gmz'), ('Pommesbox', 'Gmz'),
  ('4Eck bowl500', 'Gmz'),
  -- Icerex (1)
  ('Limonade', 'Icerex'),
  -- Intergast (6)
  ('Cheddarsauce', 'Intergast'), ('Cheddarkäsescheiben', 'Intergast'),
  ('Speck', 'Intergast'), ('Sourcream', 'Intergast'),
  ('BBQ Honigsauce', 'Intergast'), ('Süßsauersauce', 'Intergast'),
  -- KLS (17)
  ('Essiggurke', 'KLS'), ('Röstzwiebel', 'KLS'), ('Ketchup 10kg', 'KLS'),
  ('Mayo 10kg', 'KLS'), ('Ketchup Portion', 'KLS'), ('Mayo Portion', 'KLS'),
  ('Pommes', 'KLS'), ('Chilicheese Nuggets', 'KLS'), ('Mozarellasticks', 'KLS'),
  ('Onionrings', 'KLS'), ('Profiteroles Cup', 'KLS'), ('Tiramisu Cup', 'KLS'),
  ('Paprikapulver', 'KLS'), ('Knoblauchpulver', 'KLS'), ('Zwiebelpulver', 'KLS'),
  ('Kurkuma', 'KLS'), ('Oregano', 'KLS'),
  -- Macro (6)
  ('Eisbergsalat', 'Macro'), ('Tomaten', 'Macro'), ('Rotezwiebel', 'Macro'),
  ('Hühner-Innenfilet', 'Macro'), ('Hühnerflügel', 'Macro'),
  ('Sonnenblumenöl', 'Macro'),
  -- Etci Adem (1)
  ('Rindfleisch', 'Etci Adem'),
  -- Frostmed (3)
  ('Brownie Cheesecake', 'Frostmed'), ('Himbeere Cheesecake', 'Frostmed'),
  ('Caramell Cheesecake', 'Frostmed'),
  -- Orient (4)
  ('Martins Burger Brot', 'Orient'), ('Mehl Özbasak', 'Orient'),
  ('Salz', 'Orient'), ('Schwarzer Pfeffer', 'Orient'),
  -- Orderking (1)
  ('Drucker Etiketten', 'Orderking'),
  -- Swan (8)
  ('Handtuchrolle', 'Swan'), ('Wcpapier', 'Swan'), ('Serviette', 'Swan'),
  ('Papiertücher Z wcspender', 'Swan'), ('Mistsackel160lt', 'Swan'),
  ('Geschirrspülmittel Hand', 'Swan'), ('Grillreiniger', 'Swan'),
  ('Glasreiniger', 'Swan');

-- Step 3: Clear any existing preferred flag on the 104 target products.
-- Scope is strictly limited to the target list: non-target products (e.g.
-- the 21 intentionally unmapped ones, or any future manually-assigned
-- products outside this list) are NOT touched.
-- Guarantees at most one preferred supplier per target product after Step 4,
-- even if previous mappings exist from test data or prior runs.
UPDATE product_suppliers
SET is_preferred = false
WHERE product_id IN (
  SELECT p.id FROM products p
  JOIN expected_mappings em ON em.product_name = p.name
);

-- Step 4: Upsert the canonical preferred mappings (104 rows expected)
INSERT INTO product_suppliers (product_id, supplier_id, is_preferred)
SELECT p.id, s.id, true
FROM expected_mappings em
JOIN products p ON p.name = em.product_name
JOIN suppliers s ON s.name = em.supplier_name
ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_preferred = true;

-- Step 5: Narrow guard — count only mappings from THIS migration's target list.
-- Local reset special case: Supabase runs migrations BEFORE seed.sql, so on a
-- fresh local DB the products table is empty here. In that case, Steps 3-4
-- are silent no-ops and we skip the guard; seed.sql replicates this seed
-- against the populated products table after migrations finish.
DO $$
DECLARE
  matched_count INT;
  expected_count INT := 104;
  product_count INT;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;

  IF product_count = 0 THEN
    RAISE NOTICE 'Products table empty — skipping seed guard (pre-seed local state).';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO matched_count
  FROM expected_mappings em
  JOIN products p ON p.name = em.product_name
  JOIN suppliers s ON s.name = em.supplier_name
  JOIN product_suppliers ps
    ON ps.product_id = p.id
   AND ps.supplier_id = s.id
   AND ps.is_preferred = true;

  IF matched_count <> expected_count THEN
    RAISE EXCEPTION
      'Seed mismatch: expected % target mappings, got %. Check products.name or suppliers.name mismatches.',
      expected_count, matched_count;
  END IF;
END $$;
