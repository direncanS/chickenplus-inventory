import { redirect } from 'next/navigation';
import { ProductManager, type ProductManagerData } from '@/components/products/product-manager';
import { requireAppViewer } from '@/lib/supabase/app-viewer';
import { createServerClient } from '@/lib/supabase/server';

export default async function ProductsPage() {
  const viewer = await requireAppViewer();
  if (!viewer.isAdmin) {
    redirect('/dashboard');
  }

  const supabase = await createServerClient();

  const [productsResult, storageLocationsResult, categoriesResult, suppliersResult] =
    await Promise.all([
      supabase
        .from('products')
        .select(
          `
          id,
          name,
          storage_location_id,
          category_id,
          unit,
          min_stock,
          min_stock_max,
          sort_order,
          is_active,
          updated_at,
          storage_locations!inner(id, code, name, sort_order),
          categories!inner(id, name, sort_order),
          product_suppliers(
            supplier_id,
            is_preferred,
            suppliers(id, name, is_active)
          )
        `
        ),
      supabase.from('storage_locations').select('id, code, name, sort_order').order('sort_order'),
      supabase.from('categories').select('id, storage_location_id, name, sort_order').order('sort_order'),
      supabase
        .from('suppliers')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name'),
    ]);

  if (productsResult.error) throw productsResult.error;
  if (storageLocationsResult.error) throw storageLocationsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (suppliersResult.error) throw suppliersResult.error;

  const products = ((productsResult.data ?? []) as unknown as Array<
    Omit<ProductManagerData['products'][number], 'storage_locations' | 'categories'> & {
      storage_locations: ProductManagerData['products'][number]['storage_locations'] | ProductManagerData['products'][number]['storage_locations'][];
      categories: ProductManagerData['products'][number]['categories'] | ProductManagerData['products'][number]['categories'][];
      product_suppliers: Array<
        Omit<ProductManagerData['products'][number]['product_suppliers'][number], 'suppliers'> & {
          suppliers:
            | ProductManagerData['products'][number]['product_suppliers'][number]['suppliers']
            | NonNullable<ProductManagerData['products'][number]['product_suppliers'][number]['suppliers']>[];
        }
      >;
    }
  >)
    .map((product) => ({
      ...product,
      storage_locations: Array.isArray(product.storage_locations)
        ? product.storage_locations[0]
        : product.storage_locations,
      categories: Array.isArray(product.categories)
        ? product.categories[0]
        : product.categories,
      product_suppliers: product.product_suppliers.map((item) => ({
        ...item,
        suppliers: Array.isArray(item.suppliers) ? item.suppliers[0] ?? null : item.suppliers,
      })),
    }))
    .filter((product): product is ProductManagerData['products'][number] =>
      Boolean(product.storage_locations && product.categories)
    )
    .sort(
    (a, b) =>
      a.storage_locations.sort_order - b.storage_locations.sort_order ||
      a.categories.sort_order - b.categories.sort_order ||
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name, 'de')
  );

  return (
    <ProductManager
      products={products}
      storageLocations={storageLocationsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      suppliers={suppliersResult.data ?? []}
    />
  );
}
