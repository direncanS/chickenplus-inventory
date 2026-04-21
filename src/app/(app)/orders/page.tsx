import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { OrderList } from '@/components/orders/order-list';
import { WeeklyRoutineDashboard } from '@/components/routine-orders/weekly-routine-dashboard';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { transformOrders } from '@/lib/utils/transform';
import { getISOWeekAndYear } from '@/lib/utils/date';

export default async function OrdersPage() {
  const supabase = await createServerClient();

  // Round 1: independent queries in parallel.
  const [
    viewer,
    { data: activeChecklist },
    { data: orders },
    { count: routineCount },
  ] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('checklists')
      .select(`
        id, iso_year, iso_week, status,
        order_generation_status, order_generation_started_at, order_generation_finished_at,
        order_generation_orders_created, order_generation_error
      `)
      .in('status', ['draft', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(`
        id, order_number, status, ordered_at, delivered_at, notes, created_at,
        suppliers!inner(id, name),
        checklists!inner(iso_year, iso_week),
        order_items(id, product_id, quantity, unit, is_delivered, is_ordered, ordered_quantity,
          products!inner(name))
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('routine_orders')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const canShowChecklistSuggestions = activeChecklist?.status === 'completed';
  const currentWeek = activeChecklist
    ? { isoYear: activeChecklist.iso_year, isoWeek: activeChecklist.iso_week }
    : getISOWeekAndYear();

  // Round 2: all three depend on activeChecklist — run in parallel.
  const [
    initialSuggestions,
    { data: routineInstances },
    checklistItemsResult,
  ] = await Promise.all([
    canShowChecklistSuggestions
      ? getOrderSuggestions(supabase, activeChecklist.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof getOrderSuggestions>>),
    supabase
      .from('routine_order_instances')
      .select(`
        id, routine_order_id, checklist_id, order_id, iso_year, iso_week,
        scheduled_date, status, confirmed_by, confirmed_at, notes,
        routine_orders!inner(
          id, supplier_id, day_of_week, is_active,
          suppliers!inner(id, name)
        ),
        routine_order_instance_items(
          id, product_id, default_quantity, adjusted_quantity, is_included,
          products!inner(id, name, unit)
        )
      `)
      .eq('iso_year', currentWeek.isoYear)
      .eq('iso_week', currentWeek.isoWeek)
      .order('scheduled_date'),
    canShowChecklistSuggestions
      ? supabase
          .from('checklist_items')
          .select('product_id, product_name, is_missing, missing_amount_final')
          .eq('checklist_id', activeChecklist.id)
      : Promise.resolve({ data: [] as Array<{
          product_id: string;
          product_name: string;
          is_missing: boolean;
          missing_amount_final: number | null;
        }> }),
  ]);

  const checklistItems = checklistItemsResult.data ?? [];

  const orderListKey = [
    activeChecklist?.id ?? 'no-checklist',
    activeChecklist?.status ?? 'no-status',
    String(initialSuggestions.length),
    ...(orders ?? []).map((order) => `${order.id}:${order.status}`),
  ].join('|');

  return (
    <div className="space-y-4">
      {viewer.isAdmin && (
        <div className="flex justify-end">
          <Link
            href="/orders/routine"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Routine verwalten
          </Link>
        </div>
      )}

      <WeeklyRoutineDashboard
        instances={routineInstances ?? []}
        activeChecklist={activeChecklist}
        checklistItems={checklistItems}
        isoYear={currentWeek.isoYear}
        isoWeek={currentWeek.isoWeek}
        hasActiveRoutines={(routineCount ?? 0) > 0}
      />

      <OrderList
        key={orderListKey}
        orders={transformOrders(orders ?? [])}
        activeChecklist={activeChecklist}
        initialSuggestions={initialSuggestions}
        isAdmin={viewer.isAdmin}
      />
    </div>
  );
}
