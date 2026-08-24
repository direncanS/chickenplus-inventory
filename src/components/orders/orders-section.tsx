import { createServerClient } from '@/lib/supabase/server';
import { OrderList } from '@/components/orders/order-list';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { transformOrders } from '@/lib/utils/transform';

interface Props {
  activeChecklist: {
    id: string;
    iso_year: number;
    iso_week: number;
    status: string;
    order_generation_status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | null;
    order_generation_orders_created: number | null;
    order_generation_error: string | null;
  } | null;
  isAdmin: boolean;
}

export async function OrdersSection({ activeChecklist, isAdmin }: Props) {
  const supabase = await createServerClient();
  const canShowChecklistSuggestions = activeChecklist?.status === 'completed';

  const [ordersResult, initialSuggestions] = await Promise.all([
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
    canShowChecklistSuggestions
      ? getOrderSuggestions(supabase, activeChecklist.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof getOrderSuggestions>>),
  ]);

  const orders = ordersResult.data ?? [];

  const orderListKey = [
    activeChecklist?.id ?? 'no-checklist',
    activeChecklist?.status ?? 'no-status',
    String(initialSuggestions.length),
    ...orders.map((order) => `${order.id}:${order.status}`),
  ].join('|');

  return (
    <OrderList
      key={orderListKey}
      orders={transformOrders(orders)}
      activeChecklist={activeChecklist}
      initialSuggestions={initialSuggestions}
      isAdmin={isAdmin}
    />
  );
}
