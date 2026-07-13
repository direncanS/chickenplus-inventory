// Auto-generated types will go here after `supabase gen types typescript`
// For now, define the application types manually

export interface Profile {
  id: string;
  display_name: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageLocation {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  storage_location_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  storage_location_id: string;
  category_id: string;
  unit: string;
  min_stock: number | null;
  min_stock_max: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  is_preferred: boolean;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: string;
  iso_year: number;
  iso_week: number;
  checklist_date: string;
  week_start_date: string;
  week_end_date: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_by: string;
  completed_by: string | null;
  order_generation_status: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  order_generation_started_at: string | null;
  order_generation_finished_at: string | null;
  order_generation_orders_created: number;
  order_generation_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  current_stock: string | null;
  missing_amount_calculated: number | null;
  missing_amount_final: number | null;
  is_missing_overridden: boolean;
  is_missing: boolean;
  is_checked: boolean;
  is_ordered: boolean;
  ordered_quantity: number | null;
  ordered_supplier_id: string | null;
  ordered_supplier_name: string | null;
  ordered_recorded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  supplier_id: string;
  checklist_id: string;
  status: 'draft' | 'ordered' | 'partially_delivered' | 'delivered' | 'cancelled';
  ordered_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  is_delivered: boolean;
  is_ordered: boolean;
  ordered_quantity: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RoutineOrder {
  id: string;
  supplier_id: string;
  day_of_week: 'montag' | 'dienstag' | 'mittwoch' | 'donnerstag' | 'freitag' | 'samstag' | 'sonntag';
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineOrderItem {
  id: string;
  routine_order_id: string;
  product_id: string;
  default_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface RoutineOrderInstance {
  id: string;
  routine_order_id: string;
  checklist_id: string | null;
  order_id: string | null;
  iso_year: number;
  iso_week: number;
  scheduled_date: string;
  status: 'pending' | 'skipped';
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineOrderInstanceItem {
  id: string;
  instance_id: string;
  product_id: string;
  default_quantity: number;
  adjusted_quantity: number | null;
  is_included: boolean;
  created_at: string;
  updated_at: string;
}

// Extended types with joins
export interface ChecklistItemWithProduct extends ChecklistItem {
  storage_location_name: string;
  storage_location_code: string;
  storage_location_sort_order: number;
  category_name: string;
  category_sort_order: number;
  product_sort_order: number;
  unit: string;
}

export interface OrderWithSupplier extends Order {
  supplier_name: string;
}

export interface OrderItemWithProduct extends OrderItem {
  product_name: string;
}
