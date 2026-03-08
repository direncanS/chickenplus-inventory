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
} from '@/lib/utils/report-aggregation';
import { de } from '@/i18n/de';
import { z } from 'zod';
import type { ReportData, RawChecklist, RawChecklistItem, RawOrder, RawOrderItem } from '@/types/reports';

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
      .select('id, iso_year, iso_week, status, created_at')
      .gte('created_at', `${validated.startDate}T00:00:00`)
      .lte('created_at', `${validated.endDate}T23:59:59`)
      .order('created_at', { ascending: true });

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
    const { data: rawOrders } = await supabase
      .from('orders')
      .select('id, supplier_id, status, ordered_at, delivered_at, created_at, suppliers!inner(name)')
      .gte('created_at', `${validated.startDate}T00:00:00`)
      .lte('created_at', `${validated.endDate}T23:59:59`);

    const orders: RawOrder[] = (rawOrders ?? []).map((o) => ({
      id: o.id,
      supplier_id: o.supplier_id,
      status: o.status,
      ordered_at: o.ordered_at,
      delivered_at: o.delivered_at,
      created_at: o.created_at,
      supplier_name: (o.suppliers as unknown as { name: string }).name,
    }));

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

    // Aggregate
    const data: ReportData = {
      kpis: calculateKPIs(checklists, checklistItems, orders, orderItems),
      stockTrend: buildStockTrend(checklists, checklistItems),
      orderSummary: buildOrderSummary(orders),
      supplierPerformance: buildSupplierPerformance(orders, orderItems),
      topMissingProducts: buildTopMissingProducts(checklistItems),
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
