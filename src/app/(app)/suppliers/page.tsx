import { createServerClient } from '@/lib/supabase/server';
import { PageIntro } from '@/components/layout/page-intro';
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
      <PageIntro
        eyebrow="Verwaltung"
        title="Lieferanten"
        description="Verwalten Sie Lieferantendaten, bevorzugte Zuordnungen und Produktbeziehungen in einer klareren Admin-Oberfläche."
      />
      <SupplierList suppliers={suppliers ?? []} isAdmin={viewer.isAdmin} />
    </div>
  );
}
