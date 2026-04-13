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
