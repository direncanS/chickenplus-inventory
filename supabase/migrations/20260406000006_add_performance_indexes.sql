CREATE INDEX IF NOT EXISTS idx_checklists_status_created_at
  ON checklists (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklists_checklist_date_status
  ON checklists (checklist_date, status);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id
  ON checklist_items (checklist_id);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id_is_missing_is_ordered
  ON checklist_items (checklist_id, is_missing, is_ordered);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id_is_checked
  ON checklist_items (checklist_id, is_checked);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id_is_missing
  ON checklist_items (checklist_id, is_missing);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_checklist_id_status
  ON orders (checklist_id, status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id_is_preferred
  ON product_suppliers (product_id, is_preferred);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id
  ON product_suppliers (supplier_id);
