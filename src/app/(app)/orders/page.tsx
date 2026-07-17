import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { PageIntro } from '@/components/layout/page-intro';
import { OrderList } from '@/components/orders/order-list';
import { WeeklyRoutineDashboard } from '@/components/routine-orders/weekly-routine-dashboard';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { transformOrders } from '@/lib/utils/transform';
import { getISOWeekAndYear } from '@/lib/utils/date';

export default async function OrdersPage() {
  const supabase = await createServerClient();
  const [viewer, { data: activeChecklist }, { data: orders }] = await Promise.all([
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
  ]);

  const canShowChecklistSuggestions = activeChecklist?.status === 'completed';

  const initialSuggestions = canShowChecklistSuggestions
    ? await getOrderSuggestions(supabase, activeChecklist.id)
    : [];

  // Routine instances for the current week
  const currentWeek = activeChecklist
    ? { isoYear: activeChecklist.iso_year, isoWeek: activeChecklist.iso_week }
    : getISOWeekAndYear();

  const { data: routineInstances } = await supabase
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
    .order('scheduled_date');

  // Check if routines exist (for showing "Woche vorbereiten" button)
  const { count: routineCount } = await supabase
    .from('routine_orders')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Checklist items for comparison (only when checklist is completed)
  let checklistItems: Array<{
    product_id: string;
    product_name: string;
    is_missing: boolean;
    missing_amount_final: number | null;
  }> = [];

  if (canShowChecklistSuggestions) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('product_id, product_name, is_missing, missing_amount_final')
      .eq('checklist_id', activeChecklist.id);
    checklistItems = items ?? [];
  }

  const orderListKey = [
    activeChecklist?.id ?? 'no-checklist',
    activeChecklist?.status ?? 'no-status',
    String(initialSuggestions.length),
    ...(orders ?? []).map((order) => `${order.id}:${order.status}`),
  ].join('|');

  return (
    <div className="space-y-4">
      <PageIntro
        eyebrow="Bestellübersicht"
        title="Bestellungen"
        description="Verwalten Sie offene Lieferantenbestellungen, prüfen Sie Vorschlagsgruppen und behalten Sie Lieferzustände klar im Blick."
        actions={
          viewer.isAdmin ? (
            <Link
              href="/orders/routine"
              className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Routine verwalten
            </Link>
          ) : undefined
        }
      />

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
