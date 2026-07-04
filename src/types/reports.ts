// Report data types for the Berichte page

export type ReportPeriod = '4weeks' | '1month' | '3months' | 'custom';

export interface ReportDateRange {
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
}

export interface ReportKPIs {
  totalChecklists: number;
  avgMissingProducts: number;
  totalOrders: number;
  deliveryRate: number; // 0-100 percentage
}

export interface StockTrendPoint {
  weekLabel: string; // e.g. "KW 12"
  date: string;      // ISO date for sorting
  missingCount: number;
  totalItems: number;
}

export interface OrderSummaryPoint {
  weekLabel: string;
  draft: number;
  ordered: number;
  delivered: number;
  cancelled: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  orderCount: number;
  deliveryRate: number;       // 0-100 percentage
  avgDeliveryDays: number | null;
}

export interface MissingProduct {
  productName: string;
  count: number;
}

export interface ReportData {
  kpis: ReportKPIs;
  stockTrend: StockTrendPoint[];
  orderSummary: OrderSummaryPoint[];
  supplierPerformance: SupplierPerformance[];
  topMissingProducts: MissingProduct[];
}

// Raw data types from Supabase queries (before aggregation)
export interface RawChecklist {
  id: string;
  iso_year: number;
  iso_week: number;
  status: string;
  created_at: string;
}

export interface RawChecklistItem {
  id: string;
  checklist_id: string;
  product_name: string;
  is_missing: boolean;
  is_checked: boolean;
}

export interface RawOrder {
  id: string;
  supplier_id: string;
  status: string;
  ordered_at: string | null;
  delivered_at: string | null;
  created_at: string;
  supplier_name: string;
}

export interface RawOrderItem {
  id: string;
  order_id: string;
  is_delivered: boolean;
}
