import { createServerClient } from '@/lib/supabase/server';
import { OrderList } from '@/components/orders/order-list';
import { transformOrders } from '@/lib/utils/transform';

export default async function OrdersPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Fetch active checklist for order suggestions
  const { data: activeChecklist } = await supabase
    .from('checklists')
    .select('id, iso_year, iso_week, status')
    .in('status', ['draft', 'in_progress', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch orders
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, ordered_at, delivered_at, notes, created_at,
      suppliers!inner(id, name),
      checklists!inner(iso_year, iso_week),
      order_items(id, product_id, quantity, unit, is_delivered,
        products!inner(name))
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <OrderList
        orders={transformOrders(orders ?? [])}
        activeChecklist={activeChecklist}
        isAdmin={isAdmin}
      />
    </div>
  );
}
