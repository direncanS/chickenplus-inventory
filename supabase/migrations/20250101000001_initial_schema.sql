-- ============================================
-- Chickenplus Bestandskontrolle - Initial Schema
-- ============================================

-- Enum Types
CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE checklist_status AS ENUM ('draft', 'in_progress', 'completed');
CREATE TYPE order_status AS ENUM ('draft', 'ordered', 'partially_delivered', 'delivered', 'cancelled');
CREATE TYPE unit_type AS ENUM ('koli', 'karton', 'kiste', 'pack', 'stueck', 'flasche', 'kg', 'kuebel');

-- ============================================
-- Helper function for updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper function for RLS role checks
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 1. profiles
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profile creation trigger (auto-create on auth.users insert)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. storage_locations
-- ============================================
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_storage_locations_updated_at
  BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. categories
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(storage_location_id, name)
);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. products
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  unit unit_type,
  min_stock NUMERIC(10,2),
  min_stock_max NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(storage_location_id, category_id, name)
);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. suppliers
-- ============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. product_suppliers
-- ============================================
CREATE TABLE product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  unit_price NUMERIC(12,2) CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

-- Partial unique index: max 1 preferred supplier per product
CREATE UNIQUE INDEX idx_one_preferred_per_product
  ON product_suppliers (product_id)
  WHERE is_preferred = true;

CREATE TRIGGER set_product_suppliers_updated_at
  BEFORE UPDATE ON product_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. checklists
-- ============================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_year INTEGER NOT NULL,
  iso_week INTEGER NOT NULL CHECK (iso_week BETWEEN 1 AND 53),
  status checklist_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(iso_year, iso_week)
);

-- Partial unique index: only 1 active (draft/in_progress) checklist at a time
CREATE UNIQUE INDEX idx_single_active_checklist
  ON checklists ((true))
  WHERE status IN ('draft', 'in_progress');

CREATE TRIGGER set_checklists_updated_at
  BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. checklist_items
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  min_stock_snapshot NUMERIC(10,2),
  min_stock_max_snapshot NUMERIC(10,2),
  current_stock NUMERIC(10,2) CHECK (current_stock >= 0),
  missing_amount_calculated NUMERIC(10,2) CHECK (missing_amount_calculated >= 0),
  missing_amount_final NUMERIC(10,2) CHECK (missing_amount_final >= 0),
  is_missing_overridden BOOLEAN NOT NULL DEFAULT false,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checklist_id, product_id)
);

CREATE TRIGGER set_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. orders
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  checklist_id UUID NOT NULL REFERENCES checklists(id),
  status order_status NOT NULL DEFAULT 'draft',
  ordered_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. order_items
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit unit_type NOT NULL,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. audit_log
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: profiles
-- ============================================
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: storage_locations
-- ============================================
CREATE POLICY storage_locations_select ON storage_locations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY storage_locations_insert ON storage_locations
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY storage_locations_update ON storage_locations
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: categories
-- ============================================
CREATE POLICY categories_select ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY categories_insert ON categories
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY categories_update ON categories
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: products
-- ============================================
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY products_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY products_update ON products
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: suppliers
-- ============================================
CREATE POLICY suppliers_select ON suppliers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY suppliers_insert ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY suppliers_update ON suppliers
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: product_suppliers
-- ============================================
CREATE POLICY product_suppliers_select ON product_suppliers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY product_suppliers_insert ON product_suppliers
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY product_suppliers_update ON product_suppliers
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================
-- RLS Policies: checklists
-- ============================================
CREATE POLICY checklists_select ON checklists
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY checklists_insert ON checklists
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY checklists_update ON checklists
  FOR UPDATE TO authenticated
  USING (
    status != 'completed'
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    status != 'completed'
    OR get_user_role() = 'admin'
  );

-- ============================================
-- RLS Policies: checklist_items
-- ============================================
CREATE POLICY checklist_items_select ON checklist_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY checklist_items_insert ON checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY checklist_items_update ON checklist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_items.checklist_id
      AND checklists.status != 'completed'
    )
  );

-- ============================================
-- RLS Policies: orders
-- ============================================
CREATE POLICY orders_select ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY orders_insert ON orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY orders_update ON orders
  FOR UPDATE TO authenticated
  USING (
    status NOT IN ('delivered', 'cancelled')
    OR (get_user_role() = 'admin')
  );

-- ============================================
-- RLS Policies: order_items
-- ============================================
CREATE POLICY order_items_select ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY order_items_insert ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY order_items_update ON order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.status NOT IN ('delivered', 'cancelled')
    )
  );

-- ============================================
-- RLS Policies: audit_log (admin SELECT only, writes via service role)
-- ============================================
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');
