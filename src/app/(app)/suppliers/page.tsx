import { createServerClient } from '@/lib/supabase/server';
import { SupplierList } from '@/components/suppliers/supplier-list';

export default async function SuppliersPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, phone, email, address, is_active')
    .order('name');

  return (
    <div className="space-y-4">
      <SupplierList suppliers={suppliers ?? []} isAdmin={isAdmin} />
    </div>
  );
}
