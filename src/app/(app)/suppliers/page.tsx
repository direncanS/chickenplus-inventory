import { SupplierList } from '@/components/suppliers/supplier-list';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { getCachedSuppliersFull } from '@/lib/server/cached-lookups';

export default async function SuppliersPage() {
  const [viewer, suppliers] = await Promise.all([
    requireAppViewer(),
    getCachedSuppliersFull(),
  ]);

  return (
    <div className="space-y-4">
      <SupplierList suppliers={suppliers} isAdmin={viewer.isAdmin} />
    </div>
  );
}
