import { createServerClient } from '@/lib/supabase/server';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { redirect } from 'next/navigation';
import { RoutineOrderManager } from '@/components/routine-orders/routine-order-manager';
import { getCachedActiveSuppliers } from '@/lib/server/cached-lookups';

export default async function RoutineOrdersPage() {
  const supabase = await createServerClient();
  const viewer = await requireAppViewer();

  if (!viewer.isAdmin) {
    redirect('/orders');
  }

  const [{ data: routines }, suppliers] = await Promise.all([
    supabase
      .from('routine_orders')
      .select(`
        id, supplier_id, day_of_week, is_active, notes, created_at,
        suppliers!inner(id, name, is_active),
        routine_order_items(
          id, product_id, default_quantity,
          products!inner(id, name, unit, is_active)
        )
      `)
      .order('day_of_week')
      .order('created_at'),
    getCachedActiveSuppliers(),
  ]);

  return (
    <div className="space-y-4">
      <RoutineOrderManager
        routines={routines ?? []}
        suppliers={suppliers}
      />
    </div>
  );
}
