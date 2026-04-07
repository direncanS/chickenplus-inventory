'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logger } from '@/lib/utils/logger';
import { reportDateRangeSchema } from '@/lib/validations/reports';
import {
  calculateKPIs,
  buildStockTrend,
  buildOrderSummary,
  buildSupplierPerformance,
  buildTopMissingProducts,
  buildOrderedProducts,
} from '@/lib/utils/report-aggregation';
import { de } from '@/i18n/de';
import { z } from 'zod';
import type {
  ReportData,
  RawChecklist,
  RawChecklistItem,
  RawOrder,
  RawOrderItem,
  RawOrderedProduct,
} from '@/types/reports';

export async function getReportData(input: { startDate: string; endDate: string }): Promise<
  { success: true; data: ReportData } | { error: string }
> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = reportDateRangeSchema.parse(input);

    // Fetch checklists in date range
    const { data: rawChecklists } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, status, checklist_date, created_at')
      .gte('checklist_date', validated.startDate)
      .lte('checklist_date', validated.endDate)
      .order('checklist_date', { ascending: true });

    const checklists: RawChecklist[] = rawChecklists ?? [];
    const checklistIds = checklists.map((c) => c.id);

    // Fetch checklist items for these checklists
    let checklistItems: RawChecklistItem[] = [];
    if (checklistIds.length > 0) {
      const { data: rawItems } = await supabase
        .from('checklist_items')
        .select('id, checklist_id, product_name, is_missing, is_checked')
        .in('checklist_id', checklistIds);
      checklistItems = rawItems ?? [];
    }

    // Fetch orders in date range with supplier name
    let orders: RawOrder[] = [];
    if (checklistIds.length > 0) {
      const { data: rawOrders } = await supabase
        .from('orders')
        .select(`
          id, supplier_id, status, ordered_at, delivered_at, created_at,
          suppliers!inner(name),
          checklists!inner(iso_year, iso_week, checklist_date)
        `)
        .in('checklist_id', checklistIds);

      orders = (rawOrders ?? []).map((o) => {
        const supplier = Array.isArray(o.suppliers) ? o.suppliers[0] : o.suppliers;
        const checklist = Array.isArray(o.checklists) ? o.checklists[0] : o.checklists;

        return {
          id: o.id,
          supplier_id: o.supplier_id,
          status: o.status,
          ordered_at: o.ordered_at,
          delivered_at: o.delivered_at,
          created_at: o.created_at,
          checklist_date: checklist.checklist_date,
          iso_year: checklist.iso_year,
          iso_week: checklist.iso_week,
          supplier_name: supplier.name,
        };
      });
    }

    const orderIds = orders.map((o) => o.id);

    // Fetch order items
    let orderItems: RawOrderItem[] = [];
    if (orderIds.length > 0) {
      const { data: rawOrderItems } = await supabase
        .from('order_items')
        .select('id, order_id, is_delivered')
        .in('order_id', orderIds);
      orderItems = rawOrderItems ?? [];
    }

    const orderedProducts: RawOrderedProduct[] = [];

    // Use the narrowest honest interpretation of "ordered products":
    // 1. explicit item-level product captures on real supplier orders
    // 2. explicit unassigned checklist captures when no supplier order exists
    // We intentionally do not infer product-level truth from order status alone.
    const reportableOrderIds = orders
      .filter((order) => order.status === 'ordered' || order.status === 'partially_delivered' || order.status === 'delivered')
      .map((order) => order.id);

    if (reportableOrderIds.length > 0) {
      const { data: rawOrderedOrderItems } = await supabase
        .from('order_items')
        .select(`
          id,
          ordered_quantity,
          products!inner(name, unit),
          orders!inner(
            ordered_at,
            created_at,
            suppliers!inner(name),
            checklists!inner(iso_year, iso_week, checklist_date)
          )
        `)
        .in('order_id', reportableOrderIds)
        .eq('is_ordered', true);

      orderedProducts.push(
        ...((rawOrderedOrderItems ?? []).map((item) => {
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          const supplier = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers;
          const checklist = Array.isArray(order.checklists) ? order.checklists[0] : order.checklists;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;

          return {
            record_id: item.id,
            source: 'supplier_order' as const,
            ordered_at: order.ordered_at ?? order.created_at,
            checklist_date: checklist.checklist_date,
            iso_year: checklist.iso_year,
            iso_week: checklist.iso_week,
            supplier_name: supplier.name,
            product_name: product.name,
            ordered_quantity: item.ordered_quantity == null ? null : Number(item.ordered_quantity),
            unit: product.unit ?? null,
          };
        }) as RawOrderedProduct[])
      );
    }

    if (checklistIds.length > 0) {
      const { data: rawUnassignedCaptures } = await supabase
        .from('checklist_items')
        .select(`
          id,
          product_name,
          ordered_quantity,
          ordered_recorded_at,
          checklists!inner(iso_year, iso_week, checklist_date),
          products(unit)
        `)
        .in('checklist_id', checklistIds)
        .eq('is_ordered', true)
        .is('ordered_supplier_id', null)
        .not('ordered_recorded_at', 'is', null)
        .order('ordered_recorded_at', { ascending: false });

      orderedProducts.push(
        ...((rawUnassignedCaptures ?? []).map((item) => {
          const checklist = Array.isArray(item.checklists) ? item.checklists[0] : item.checklists;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;

          return {
            record_id: item.id,
            source: 'unassigned_capture' as const,
            ordered_at: item.ordered_recorded_at,
            checklist_date: checklist.checklist_date,
            iso_year: checklist.iso_year,
            iso_week: checklist.iso_week,
            supplier_name: de.orders.notAssigned,
            product_name: item.product_name,
            ordered_quantity: item.ordered_quantity == null ? null : Number(item.ordered_quantity),
            unit: product?.unit ?? null,
          };
        }) as RawOrderedProduct[])
      );
    }

    // Aggregate
    const data: ReportData = {
      kpis: calculateKPIs(checklists, checklistItems, orders, orderItems),
      stockTrend: buildStockTrend(checklists, checklistItems),
      orderSummary: buildOrderSummary(orders),
      supplierPerformance: buildSupplierPerformance(orders, orderItems),
      topMissingProducts: buildTopMissingProducts(checklistItems),
      orderedProducts: buildOrderedProducts(orderedProducts),
    };

    return { success: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Get report data failed', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}
