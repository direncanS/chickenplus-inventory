import { createServerClient } from '@/lib/supabase/server';
import { SupplierList } from '@/components/suppliers/supplier-list';
import { requireAppViewer } from '@/lib/supabase/app-viewer';

export default async function SuppliersPage() {
  const supabase = await createServerClient();
  const [viewer, { data: suppliers }] = await Promise.all([
    requireAppViewer(),
    supabase
      .from('suppliers')
      .select('id, name, contact_name, phone, email, address, is_active')
      .order('name'),
  ]);

  return (
    <div className="space-y-4">
      <SupplierList suppliers={suppliers ?? []} isAdmin={viewer.isAdmin} />
    </div>
  );
}
