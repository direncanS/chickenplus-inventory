import type {
  ReportKPIs,
  StockTrendPoint,
  OrderSummaryPoint,
  SupplierPerformance,
  MissingProduct,
  RawChecklist,
  RawChecklistItem,
  RawOrder,
  RawOrderItem,
} from '@/types/reports';

/**
 * Calculate KPI metrics from raw data.
 */
export function calculateKPIs(
  checklists: RawChecklist[],
  checklistItems: RawChecklistItem[],
  orders: RawOrder[],
  orderItems: RawOrderItem[]
): ReportKPIs {
  const completedChecklists = checklists.filter((c) => c.status === 'completed');
  const totalChecklists = completedChecklists.length;

  // Average missing products per completed checklist
  let avgMissingProducts = 0;
  if (totalChecklists > 0) {
    const completedIds = new Set(completedChecklists.map((c) => c.id));
    const missingCount = checklistItems.filter(
      (item) => completedIds.has(item.checklist_id) && item.is_missing
    ).length;
    avgMissingProducts = Math.round((missingCount / totalChecklists) * 10) / 10;
  }

  const totalOrders = orders.length;

  // Delivery rate: percentage of delivered order items
  let deliveryRate = 0;
  if (orderItems.length > 0) {
    const deliveredCount = orderItems.filter((oi) => oi.is_delivered).length;
    deliveryRate = Math.round((deliveredCount / orderItems.length) * 100);
  }

  return { totalChecklists, avgMissingProducts, totalOrders, deliveryRate };
}

/**
 * Build stock trend data points (one per checklist, sorted by week).
 */
export function buildStockTrend(
  checklists: RawChecklist[],
  checklistItems: RawChecklistItem[]
): StockTrendPoint[] {
  const itemsByChecklist = new Map<string, RawChecklistItem[]>();
  for (const item of checklistItems) {
    const existing = itemsByChecklist.get(item.checklist_id) ?? [];
    existing.push(item);
    itemsByChecklist.set(item.checklist_id, existing);
  }

  return checklists
    .filter((c) => c.status === 'completed')
    .sort((a, b) => {
      if (a.iso_year !== b.iso_year) return a.iso_year - b.iso_year;
      return a.iso_week - b.iso_week;
    })
    .map((cl) => {
      const items = itemsByChecklist.get(cl.id) ?? [];
      return {
        weekLabel: `KW ${cl.iso_week}`,
        date: cl.created_at,
        missingCount: items.filter((i) => i.is_missing).length,
        totalItems: items.length,
      };
    });
}

/**
 * Build order summary by week (grouped by ISO week).
 */
export function buildOrderSummary(orders: RawOrder[]): OrderSummaryPoint[] {
  const weekMap = new Map<string, OrderSummaryPoint>();

  for (const order of orders) {
    const date = new Date(order.created_at);
    const weekInfo = getISOWeekInfo(date);
    const key = `${weekInfo.year}-${weekInfo.week}`;

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        weekLabel: `KW ${weekInfo.week}`,
        draft: 0,
        ordered: 0,
        delivered: 0,
        cancelled: 0,
      });
    }

    const point = weekMap.get(key)!;
    if (order.status === 'draft') point.draft++;
    else if (order.status === 'ordered' || order.status === 'partially_delivered') point.ordered++;
    else if (order.status === 'delivered') point.delivered++;
    else if (order.status === 'cancelled') point.cancelled++;
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/**
 * Calculate supplier performance metrics.
 */
export function buildSupplierPerformance(
  orders: RawOrder[],
  orderItems: RawOrderItem[]
): SupplierPerformance[] {
  const itemsByOrder = new Map<string, RawOrderItem[]>();
  for (const item of orderItems) {
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(item);
    itemsByOrder.set(item.order_id, existing);
  }

  const supplierMap = new Map<string, {
    supplierName: string;
    orders: RawOrder[];
    totalItems: number;
    deliveredItems: number;
    deliveryDaysTotal: number;
    deliveryDaysCount: number;
  }>();

  for (const order of orders) {
    if (!supplierMap.has(order.supplier_id)) {
      supplierMap.set(order.supplier_id, {
        supplierName: order.supplier_name,
        orders: [],
        totalItems: 0,
        deliveredItems: 0,
        deliveryDaysTotal: 0,
        deliveryDaysCount: 0,
      });
    }

    const entry = supplierMap.get(order.supplier_id)!;
    entry.orders.push(order);

    const items = itemsByOrder.get(order.id) ?? [];
    entry.totalItems += items.length;
    entry.deliveredItems += items.filter((i) => i.is_delivered).length;

    if (order.ordered_at && order.delivered_at) {
      const orderedDate = new Date(order.ordered_at);
      const deliveredDate = new Date(order.delivered_at);
      const days = Math.round(
        (deliveredDate.getTime() - orderedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0) {
        entry.deliveryDaysTotal += days;
        entry.deliveryDaysCount++;
      }
    }
  }

  return Array.from(supplierMap.entries())
    .map(([supplierId, data]) => ({
      supplierId,
      supplierName: data.supplierName,
      orderCount: data.orders.length,
      deliveryRate: data.totalItems > 0
        ? Math.round((data.deliveredItems / data.totalItems) * 100)
        : 0,
      avgDeliveryDays: data.deliveryDaysCount > 0
        ? Math.round((data.deliveryDaysTotal / data.deliveryDaysCount) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

/**
 * Find top N most frequently missing products.
 */
export function buildTopMissingProducts(
  checklistItems: RawChecklistItem[],
  limit: number = 10
): MissingProduct[] {
  const countMap = new Map<string, number>();

  for (const item of checklistItems) {
    if (item.is_missing) {
      const current = countMap.get(item.product_name) ?? 0;
      countMap.set(item.product_name, current + 1);
    }
  }

  return Array.from(countMap.entries())
    .map(([productName, count]) => ({ productName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get ISO week number and year from a date.
 */
function getISOWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}
