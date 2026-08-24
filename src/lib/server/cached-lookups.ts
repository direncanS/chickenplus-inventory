import 'server-only';

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Near-static lookup reads, cached across requests.
 *
 * Uses the admin (service-role) client so the cached payload is shared across
 * all users. These queries are not user-scoped — suppliers, product→supplier
 * mappings are seed data. Invalidate with `revalidateTag(...)` from the admin
 * mutation actions.
 */

export interface CachedSupplierFull {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
}

export interface CachedSupplierBrief {
  id: string;
  name: string;
}

export interface CachedPreferredSupplier {
  product_id: string;
  supplier: { id: string; name: string; is_active: boolean };
}

export const getCachedSuppliersFull = unstable_cache(
  async (): Promise<CachedSupplierFull[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact_name, phone, email, address, is_active')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as CachedSupplierFull[];
  },
  ['suppliers-full'],
  { tags: ['suppliers'], revalidate: 3600 }
);

export const getCachedActiveSuppliers = unstable_cache(
  async (): Promise<CachedSupplierBrief[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as CachedSupplierBrief[];
  },
  ['suppliers-active-brief'],
  { tags: ['suppliers'], revalidate: 3600 }
);

/**
 * All preferred product→supplier mappings. Returned as a flat array so the
 * caller can build a Map<product_id, supplier> without a per-page DB round-trip.
 */
export const getCachedPreferredProductSuppliers = unstable_cache(
  async (): Promise<CachedPreferredSupplier[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('product_id, suppliers!inner(id, name, is_active)')
      .eq('is_preferred', true);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const suppliers = row.suppliers as
        | { id: string; name: string; is_active: boolean }
        | { id: string; name: string; is_active: boolean }[];
      const supplier = Array.isArray(suppliers) ? suppliers[0] : suppliers;
      return {
        product_id: row.product_id as string,
        supplier,
      };
    });
  },
  ['preferred-product-suppliers'],
  { tags: ['product_suppliers', 'suppliers'], revalidate: 3600 }
);
