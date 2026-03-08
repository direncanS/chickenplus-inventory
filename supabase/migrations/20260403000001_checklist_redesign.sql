-- Checklist Redesign: is_missing boolean, current_stock → TEXT

-- 1. Add is_missing boolean column
ALTER TABLE checklist_items
  ADD COLUMN is_missing BOOLEAN NOT NULL DEFAULT false;

-- 2. Convert current_stock from NUMERIC to TEXT
ALTER TABLE checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_current_stock_check;
ALTER TABLE checklist_items
  ALTER COLUMN current_stock TYPE TEXT USING current_stock::TEXT;

-- 3. Migrate existing data: missing_amount_final > 0 → is_missing = true
UPDATE checklist_items SET is_missing = true
  WHERE missing_amount_final IS NOT NULL AND missing_amount_final > 0;
