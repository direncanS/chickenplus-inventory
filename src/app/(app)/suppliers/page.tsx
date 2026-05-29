import { SupplierList } from '@/components/suppliers/supplier-list';
import {
  SupplierMappingHealth,
  type SupplierMappingHealthProduct,
} from '@/components/suppliers/supplier-mapping-health';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { getCachedSuppliersFull } from '@/lib/server/cached-lookups';
import { createServerClient } from '@/lib/supabase/server';

export default async function SuppliersPage() {
  const supabase = await createServerClient();
  const [viewer, suppliers, productsResult] = await Promise.all([
    requireAppViewer(),
    getCachedSuppliersFull(),
    supabase
      .from('products')
      .select(
        `
        id,
        name,
        is_active,
        storage_locations!inner(code, name, sort_order),
        categories!inner(name, sort_order),
        product_suppliers(
          supplier_id,
          is_preferred,
          suppliers(id, name, is_active)
        )
      `
      )
      .eq('is_active', true),
  ]);

  if (productsResult.error) throw productsResult.error;

  const mappingHealthProducts = ((productsResult.data ?? []) as unknown as Array<
    Omit<SupplierMappingHealthProduct, 'storage_locations' | 'categories' | 'product_suppliers'> & {
      storage_locations:
        | SupplierMappingHealthProduct['storage_locations']
        | SupplierMappingHealthProduct['storage_locations'][];
      categories:
        | SupplierMappingHealthProduct['categories']
        | SupplierMappingHealthProduct['categories'][];
      product_suppliers: Array<
        Omit<SupplierMappingHealthProduct['product_suppliers'][number], 'suppliers'> & {
          suppliers:
            | SupplierMappingHealthProduct['product_suppliers'][number]['suppliers']
            | NonNullable<SupplierMappingHealthProduct['product_suppliers'][number]['suppliers']>[];
        }
      >;
    }
  >)
    .map((product) => ({
      ...product,
      storage_locations: Array.isArray(product.storage_locations)
        ? product.storage_locations[0]
        : product.storage_locations,
      categories: Array.isArray(product.categories) ? product.categories[0] : product.categories,
      product_suppliers: product.product_suppliers.map((mapping) => ({
        ...mapping,
        suppliers: Array.isArray(mapping.suppliers) ? mapping.suppliers[0] ?? null : mapping.suppliers,
      })),
    }))
    .filter((product): product is SupplierMappingHealthProduct =>
      Boolean(product.storage_locations && product.categories)
    );

  return (
    <div className="space-y-4">
      <SupplierMappingHealth
        products={mappingHealthProducts}
        suppliers={suppliers}
        isAdmin={viewer.isAdmin}
      />
      <SupplierList suppliers={suppliers} isAdmin={viewer.isAdmin} />
    </div>
  );
}
