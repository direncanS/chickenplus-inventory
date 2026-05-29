import { createServerClient } from '@/lib/supabase/server';
import { OrderList } from '@/components/orders/order-list';
import { getOrderSuggestions } from '@/lib/server/order-suggestions';
import { transformOrders } from '@/lib/utils/transform';

type OrderItemActionState = {
  is_delivered: boolean;
  is_ordered: boolean;
  ordered_quantity: number | null;
};

type OrderActionState = {
  status: string;
  order_items?: OrderItemActionState[] | null;
};

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

function hasOrderAction(order: OrderActionState) {
  if (order.status !== 'draft') return true;

  return (order.order_items ?? []).some(
    (item) => item.is_ordered || item.ordered_quantity !== null || item.is_delivered
  );
}

export async function OrdersSection({ activeChecklist, isAdmin }: Props) {
  const supabase = await createServerClient();
  const canShowChecklistSuggestions = activeChecklist?.status === 'completed';

  const [ordersResult, initialSuggestions] = await Promise.all([
    activeChecklist
      ? supabase
          .from('orders')
          .select(`
            id, order_number, status, ordered_at, delivered_at, notes, created_at,
            suppliers!inner(id, name),
            checklists!inner(iso_year, iso_week),
            order_items(id, product_id, quantity, unit, is_delivered, is_ordered, ordered_quantity,
              products!inner(name))
          `)
          .eq('checklist_id', activeChecklist.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canShowChecklistSuggestions
      ? getOrderSuggestions(supabase, activeChecklist.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof getOrderSuggestions>>),
  ]);

  const orders = (ordersResult.data ?? []).filter((order) =>
    hasOrderAction(order as OrderActionState)
  );

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
