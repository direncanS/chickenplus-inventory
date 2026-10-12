-- Move kitchen supplies to the depot and retire the remaining kitchen products.
-- Keep product IDs, supplier links, completed checklists and orders intact.
-- New products have no assumed unit or minimum stock.
DO $$
DECLARE
  depot_id uuid;
  packaging_id uuid;
  hygiene_id uuid;
  cooking_id uuid;
  packaging_order integer;
  hygiene_order integer;
  cooking_order integer;
  completed_items_before bigint;
  orders_before bigint;
BEGIN
  -- On a fresh reset, the updated seed supplies the final catalogue.
  IF NOT EXISTS (SELECT 1 FROM products) THEN
    RETURN;
  END IF;

  SELECT id INTO STRICT depot_id FROM storage_locations WHERE code = 'D';
  SELECT id INTO STRICT packaging_id FROM categories
    WHERE storage_location_id = depot_id AND name = 'Verpackung';
  SELECT id INTO STRICT hygiene_id FROM categories
    WHERE storage_location_id = depot_id AND name = 'Reinigung & Hygiene';
  SELECT id INTO STRICT cooking_id FROM categories
    WHERE storage_location_id = depot_id AND name = 'Kochen';

  SELECT count(*) INTO completed_items_before FROM checklist_items ci
    JOIN checklists cl ON cl.id = ci.checklist_id
    WHERE cl.status NOT IN ('draft', 'in_progress');
  SELECT count(*) INTO orders_before FROM order_items;

  IF EXISTS (
    SELECT 1 FROM products p JOIN storage_locations s ON s.id = p.storage_location_id
    WHERE s.code = 'M' AND p.name NOT IN (
      'Käsesaucebecher 230ml', 'Haarnetz', 'Drucker Etiketten',
      'Schnittlauch', 'Teebutter', 'Honig', 'Chilioil', 'Grillgewürz Billa'
    )
  ) THEN
    RAISE EXCEPTION 'Unexpected Mutfak products remain; no changes applied.';
  END IF;

  SELECT coalesce(max(sort_order), 0) INTO packaging_order FROM products WHERE category_id = packaging_id;
  SELECT coalesce(max(sort_order), 0) INTO hygiene_order FROM products WHERE category_id = hygiene_id;
  SELECT coalesce(max(sort_order), 0) INTO cooking_order FROM products WHERE category_id = cooking_id;

  UPDATE products p SET
    storage_location_id = depot_id,
    category_id = CASE WHEN p.name = 'Haarnetz' THEN hygiene_id ELSE packaging_id END,
    sort_order = CASE p.name
      WHEN 'Käsesaucebecher 230ml' THEN packaging_order + 1
      WHEN 'Drucker Etiketten' THEN packaging_order + 2
      ELSE hygiene_order + 1 END,
    updated_at = now()
  FROM storage_locations s
  WHERE p.storage_location_id = s.id AND s.code = 'M'
    AND p.name IN ('Käsesaucebecher 230ml', 'Haarnetz', 'Drucker Etiketten');

  -- Inactive products remain only as references for historical records.
  UPDATE products p SET
    is_active = false,
    storage_location_id = depot_id,
    category_id = cooking_id,
    sort_order = cooking_order + CASE p.name
      WHEN 'Schnittlauch' THEN 1 WHEN 'Teebutter' THEN 2 WHEN 'Honig' THEN 3
      WHEN 'Chilioil' THEN 4 WHEN 'Grillgewürz Billa' THEN 5 END,
    updated_at = now()
  FROM storage_locations s
  WHERE p.storage_location_id = s.id AND s.code = 'M'
    AND p.name IN ('Schnittlauch', 'Teebutter', 'Honig', 'Chilioil', 'Grillgewürz Billa');

  DELETE FROM checklist_items ci USING checklists cl, products p
  WHERE ci.checklist_id = cl.id AND ci.product_id = p.id
    AND cl.status IN ('draft', 'in_progress') AND p.is_active = false
    AND p.storage_location_id = depot_id AND p.category_id = cooking_id
    AND p.name IN ('Schnittlauch', 'Teebutter', 'Honig', 'Chilioil', 'Grillgewürz Billa');

  IF EXISTS (SELECT 1 FROM products p JOIN storage_locations s ON s.id = p.storage_location_id WHERE s.code = 'M') THEN
    RAISE EXCEPTION 'Mutfak still contains product references; no changes applied.';
  END IF;

  DELETE FROM categories c USING storage_locations s
    WHERE c.storage_location_id = s.id AND s.code = 'M';
  DELETE FROM storage_locations WHERE code = 'M';

  INSERT INTO products (name, storage_location_id, category_id, sort_order)
  SELECT new_product.name, s.id, c.id, new_product.sort_order
  FROM (VALUES
    ('Waffel-Schokoladensauce', 'KH', 'Soßen', 9),
    ('Milchschaumreiniger', 'K', 'Allgemein', 3),
    ('Kaffeemaschinen-Reinigungstabletten', 'K', 'Allgemein', 4)
  ) AS new_product(name, location_code, category_name, sort_order)
  JOIN storage_locations s ON s.code = new_product.location_code
  JOIN categories c ON c.storage_location_id = s.id AND c.name = new_product.category_name
  ON CONFLICT (storage_location_id, category_id, name) DO UPDATE SET is_active = true;

  IF (SELECT count(*) FROM products p JOIN storage_locations s ON s.id = p.storage_location_id
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active AND ((p.name = 'Waffel-Schokoladensauce' AND s.code = 'KH' AND c.name = 'Soßen')
        OR (p.name IN ('Milchschaumreiniger', 'Kaffeemaschinen-Reinigungstabletten') AND s.code = 'K' AND c.name = 'Allgemein'))) <> 3 THEN
    RAISE EXCEPTION 'Required new product locations or categories are missing.';
  END IF;

  INSERT INTO checklist_items (checklist_id, product_id, product_name, min_stock_snapshot, min_stock_max_snapshot)
  SELECT cl.id, p.id, p.name, p.min_stock, p.min_stock_max
  FROM checklists cl CROSS JOIN products p
  WHERE cl.status IN ('draft', 'in_progress') AND p.is_active
    AND ((p.name = 'Waffel-Schokoladensauce' AND p.storage_location_id = (SELECT id FROM storage_locations WHERE code = 'KH'))
      OR (p.name IN ('Milchschaumreiniger', 'Kaffeemaschinen-Reinigungstabletten') AND p.storage_location_id = (SELECT id FROM storage_locations WHERE code = 'K')))
  ON CONFLICT (checklist_id, product_id) DO NOTHING;

  IF (SELECT count(*) FROM checklist_items ci JOIN checklists cl ON cl.id = ci.checklist_id
      WHERE cl.status NOT IN ('draft', 'in_progress')) <> completed_items_before
    OR (SELECT count(*) FROM order_items) <> orders_before THEN
    RAISE EXCEPTION 'Historical checklist or order records changed.';
  END IF;
END $$;
