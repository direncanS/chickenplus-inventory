import { describe, it, expect } from 'vitest';
import {
  calculateKPIs,
  buildStockTrend,
  buildOrderSummary,
  buildSupplierPerformance,
  buildTopMissingProducts,
} from '@/lib/utils/report-aggregation';
import type {
  RawChecklist,
  RawChecklistItem,
  RawOrder,
  RawOrderItem,
} from '@/types/reports';

// ── Test data factories ──

function makeChecklist(overrides: Partial<RawChecklist> = {}): RawChecklist {
  return {
    id: 'cl-1',
    iso_year: 2026,
    iso_week: 10,
    status: 'completed',
    created_at: '2026-03-02T10:00:00Z',
    ...overrides,
  };
}

function makeChecklistItem(overrides: Partial<RawChecklistItem> = {}): RawChecklistItem {
  return {
    id: 'ci-1',
    checklist_id: 'cl-1',
    product_name: 'Hähnchen',
    is_missing: false,
    is_checked: true,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<RawOrder> = {}): RawOrder {
  return {
    id: 'ord-1',
    supplier_id: 'sup-1',
    status: 'delivered',
    ordered_at: '2026-03-02T10:00:00Z',
    delivered_at: '2026-03-04T10:00:00Z',
    created_at: '2026-03-02T10:00:00Z',
    supplier_name: 'Lieferant A',
    ...overrides,
  };
}

function makeOrderItem(overrides: Partial<RawOrderItem> = {}): RawOrderItem {
  return {
    id: 'oi-1',
    order_id: 'ord-1',
    is_delivered: true,
    ...overrides,
  };
}

// ── calculateKPIs ──

describe('calculateKPIs', () => {
  it('returns zeros for empty data', () => {
    const result = calculateKPIs([], [], [], []);
    expect(result).toEqual({
      totalChecklists: 0,
      avgMissingProducts: 0,
      totalOrders: 0,
      deliveryRate: 0,
    });
  });

  it('counts only completed checklists', () => {
    const checklists = [
      makeChecklist({ id: 'cl-1', status: 'completed' }),
      makeChecklist({ id: 'cl-2', status: 'draft' }),
      makeChecklist({ id: 'cl-3', status: 'in_progress' }),
    ];
    const result = calculateKPIs(checklists, [], [], []);
    expect(result.totalChecklists).toBe(1);
  });

  it('calculates average missing products per completed checklist', () => {
    const checklists = [
      makeChecklist({ id: 'cl-1', status: 'completed' }),
      makeChecklist({ id: 'cl-2', status: 'completed' }),
    ];
    const items = [
      makeChecklistItem({ checklist_id: 'cl-1', is_missing: true }),
      makeChecklistItem({ checklist_id: 'cl-1', is_missing: true }),
      makeChecklistItem({ checklist_id: 'cl-1', is_missing: false }),
      makeChecklistItem({ checklist_id: 'cl-2', is_missing: true }),
      makeChecklistItem({ checklist_id: 'cl-2', is_missing: false }),
    ];
    const result = calculateKPIs(checklists, items, [], []);
    // 3 missing / 2 checklists = 1.5
    expect(result.avgMissingProducts).toBe(1.5);
  });

  it('ignores missing items from non-completed checklists', () => {
    const checklists = [
      makeChecklist({ id: 'cl-1', status: 'completed' }),
      makeChecklist({ id: 'cl-2', status: 'draft' }),
    ];
    const items = [
      makeChecklistItem({ checklist_id: 'cl-1', is_missing: true }),
      makeChecklistItem({ checklist_id: 'cl-2', is_missing: true }),
      makeChecklistItem({ checklist_id: 'cl-2', is_missing: true }),
    ];
    const result = calculateKPIs(checklists, items, [], []);
    expect(result.avgMissingProducts).toBe(1);
  });

  it('counts total orders', () => {
    const orders = [makeOrder(), makeOrder({ id: 'ord-2' })];
    const result = calculateKPIs([], [], orders, []);
    expect(result.totalOrders).toBe(2);
  });

  it('calculates delivery rate correctly', () => {
    const orderItems = [
      makeOrderItem({ is_delivered: true }),
      makeOrderItem({ id: 'oi-2', is_delivered: true }),
      makeOrderItem({ id: 'oi-3', is_delivered: false }),
      makeOrderItem({ id: 'oi-4', is_delivered: false }),
    ];
    const result = calculateKPIs([], [], [], orderItems);
    expect(result.deliveryRate).toBe(50);
  });

  it('returns 0 delivery rate when no order items', () => {
    const result = calculateKPIs([], [], [makeOrder()], []);
    expect(result.deliveryRate).toBe(0);
  });
});

// ── buildStockTrend ──

describe('buildStockTrend', () => {
  it('returns empty array for no checklists', () => {
    expect(buildStockTrend([], [])).toEqual([]);
  });

  it('only includes completed checklists', () => {
    const checklists = [
      makeChecklist({ id: 'cl-1', status: 'completed' }),
      makeChecklist({ id: 'cl-2', status: 'draft' }),
    ];
    const items = [
      makeChecklistItem({ checklist_id: 'cl-1' }),
      makeChecklistItem({ checklist_id: 'cl-2' }),
    ];
    const result = buildStockTrend(checklists, items);
    expect(result).toHaveLength(1);
  });

  it('sorts by year then week', () => {
    const checklists = [
      makeChecklist({ id: 'cl-2', iso_year: 2026, iso_week: 12, created_at: '2026-03-16T10:00:00Z' }),
      makeChecklist({ id: 'cl-1', iso_year: 2026, iso_week: 10, created_at: '2026-03-02T10:00:00Z' }),
      makeChecklist({ id: 'cl-3', iso_year: 2025, iso_week: 52, created_at: '2025-12-22T10:00:00Z' }),
    ];
    const result = buildStockTrend(checklists, []);
    expect(result.map((r) => r.weekLabel)).toEqual(['KW 52', 'KW 10', 'KW 12']);
  });

  it('counts missing and total items per checklist', () => {
    const checklists = [makeChecklist({ id: 'cl-1' })];
    const items = [
      makeChecklistItem({ id: 'ci-1', checklist_id: 'cl-1', is_missing: true }),
      makeChecklistItem({ id: 'ci-2', checklist_id: 'cl-1', is_missing: false }),
      makeChecklistItem({ id: 'ci-3', checklist_id: 'cl-1', is_missing: true }),
    ];
    const result = buildStockTrend(checklists, items);
    expect(result[0].missingCount).toBe(2);
    expect(result[0].totalItems).toBe(3);
  });
});

// ── buildOrderSummary ──

describe('buildOrderSummary', () => {
  it('returns empty array for no orders', () => {
    expect(buildOrderSummary([])).toEqual([]);
  });

  it('groups orders by week and status', () => {
    const orders = [
      makeOrder({ id: 'o1', status: 'draft', created_at: '2026-03-02T10:00:00Z' }),
      makeOrder({ id: 'o2', status: 'delivered', created_at: '2026-03-03T10:00:00Z' }),
      makeOrder({ id: 'o3', status: 'cancelled', created_at: '2026-03-04T10:00:00Z' }),
    ];
    const result = buildOrderSummary(orders);
    // All in the same week (KW 10 of 2026)
    expect(result).toHaveLength(1);
    expect(result[0].draft).toBe(1);
    expect(result[0].delivered).toBe(1);
    expect(result[0].cancelled).toBe(1);
    expect(result[0].ordered).toBe(0);
  });

  it('counts partially_delivered as ordered', () => {
    const orders = [
      makeOrder({ id: 'o1', status: 'partially_delivered', created_at: '2026-03-02T10:00:00Z' }),
    ];
    const result = buildOrderSummary(orders);
    expect(result[0].ordered).toBe(1);
  });

  it('sorts results chronologically', () => {
    const orders = [
      makeOrder({ id: 'o2', status: 'draft', created_at: '2026-03-16T10:00:00Z' }),
      makeOrder({ id: 'o1', status: 'draft', created_at: '2026-03-02T10:00:00Z' }),
    ];
    const result = buildOrderSummary(orders);
    expect(result).toHaveLength(2);
    expect(result[0].weekLabel).toBe('KW 10');
    expect(result[1].weekLabel).toBe('KW 12');
  });
});

// ── buildSupplierPerformance ──

describe('buildSupplierPerformance', () => {
  it('returns empty array for no orders', () => {
    expect(buildSupplierPerformance([], [])).toEqual([]);
  });

  it('calculates order count per supplier', () => {
    const orders = [
      makeOrder({ id: 'o1', supplier_id: 'sup-1', supplier_name: 'A' }),
      makeOrder({ id: 'o2', supplier_id: 'sup-1', supplier_name: 'A' }),
      makeOrder({ id: 'o3', supplier_id: 'sup-2', supplier_name: 'B' }),
    ];
    const result = buildSupplierPerformance(orders, []);
    expect(result).toHaveLength(2);
    expect(result[0].orderCount).toBe(2); // sorted by count desc
    expect(result[1].orderCount).toBe(1);
  });

  it('calculates delivery rate per supplier', () => {
    const orders = [makeOrder({ id: 'o1', supplier_id: 'sup-1' })];
    const items = [
      makeOrderItem({ id: 'oi-1', order_id: 'o1', is_delivered: true }),
      makeOrderItem({ id: 'oi-2', order_id: 'o1', is_delivered: false }),
    ];
    const result = buildSupplierPerformance(orders, items);
    expect(result[0].deliveryRate).toBe(50);
  });

  it('calculates average delivery days', () => {
    const orders = [
      makeOrder({
        id: 'o1',
        supplier_id: 'sup-1',
        ordered_at: '2026-03-02T10:00:00Z',
        delivered_at: '2026-03-04T10:00:00Z',
      }),
      makeOrder({
        id: 'o2',
        supplier_id: 'sup-1',
        ordered_at: '2026-03-10T10:00:00Z',
        delivered_at: '2026-03-14T10:00:00Z',
      }),
    ];
    const result = buildSupplierPerformance(orders, []);
    // (2 + 4) / 2 = 3
    expect(result[0].avgDeliveryDays).toBe(3);
  });

  it('returns null avgDeliveryDays when no delivery dates', () => {
    const orders = [
      makeOrder({ id: 'o1', supplier_id: 'sup-1', ordered_at: null, delivered_at: null }),
    ];
    const result = buildSupplierPerformance(orders, []);
    expect(result[0].avgDeliveryDays).toBeNull();
  });

  it('returns 0 delivery rate when no items', () => {
    const orders = [makeOrder({ id: 'o1', supplier_id: 'sup-1' })];
    const result = buildSupplierPerformance(orders, []);
    expect(result[0].deliveryRate).toBe(0);
  });
});

// ── buildTopMissingProducts ──

describe('buildTopMissingProducts', () => {
  it('returns empty array for no items', () => {
    expect(buildTopMissingProducts([])).toEqual([]);
  });

  it('returns empty array when nothing is missing', () => {
    const items = [
      makeChecklistItem({ is_missing: false }),
    ];
    expect(buildTopMissingProducts(items)).toEqual([]);
  });

  it('counts occurrences of missing products', () => {
    const items = [
      makeChecklistItem({ id: '1', product_name: 'Hähnchen', is_missing: true }),
      makeChecklistItem({ id: '2', product_name: 'Hähnchen', is_missing: true }),
      makeChecklistItem({ id: '3', product_name: 'Reis', is_missing: true }),
    ];
    const result = buildTopMissingProducts(items);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ productName: 'Hähnchen', count: 2 });
    expect(result[1]).toEqual({ productName: 'Reis', count: 1 });
  });

  it('respects limit parameter', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      makeChecklistItem({ id: `ci-${i}`, product_name: `Produkt ${i}`, is_missing: true })
    );
    const result = buildTopMissingProducts(items, 5);
    expect(result).toHaveLength(5);
  });

  it('sorts by count descending', () => {
    const items = [
      makeChecklistItem({ id: '1', product_name: 'A', is_missing: true }),
      makeChecklistItem({ id: '2', product_name: 'B', is_missing: true }),
      makeChecklistItem({ id: '3', product_name: 'B', is_missing: true }),
      makeChecklistItem({ id: '4', product_name: 'C', is_missing: true }),
      makeChecklistItem({ id: '5', product_name: 'C', is_missing: true }),
      makeChecklistItem({ id: '6', product_name: 'C', is_missing: true }),
    ];
    const result = buildTopMissingProducts(items);
    expect(result[0].productName).toBe('C');
    expect(result[1].productName).toBe('B');
    expect(result[2].productName).toBe('A');
  });

  it('ignores non-missing items', () => {
    const items = [
      makeChecklistItem({ id: '1', product_name: 'Hähnchen', is_missing: true }),
      makeChecklistItem({ id: '2', product_name: 'Hähnchen', is_missing: false }),
      makeChecklistItem({ id: '3', product_name: 'Reis', is_missing: false }),
    ];
    const result = buildTopMissingProducts(items);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(1);
  });
});
