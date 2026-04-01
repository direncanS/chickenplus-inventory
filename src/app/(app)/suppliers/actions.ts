'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { createSupplierSchema, updateSupplierSchema, productSupplierSchema } from '@/lib/validations/supplier';
import { de } from '@/i18n/de';
import { z } from 'zod';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

export async function createSupplier(input: z.infer<typeof createSupplierSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = createSupplierSchema.parse(input);

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: validated.name,
        contact_name: validated.contactName ?? null,
        phone: validated.phone ?? null,
        email: validated.email || null,
        address: validated.address ?? null,
      })
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: de.suppliers.duplicateName };
      }
      logger.error('Create supplier failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'supplier_created',
      entityType: 'supplier',
      entityId: data.id,
      details: { name: data.name },
    });

    revalidatePath('/suppliers');
    return { success: true, data: { id: data.id, name: data.name } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Create supplier exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function updateSupplier(input: z.infer<typeof updateSupplierSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = updateSupplierSchema.parse(input);

    // If deactivating, check for open orders
    if (validated.isActive === false) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', validated.supplierId)
        .in('status', OPEN_ORDER_STATUSES);

      if (count && count > 0) {
        return { error: de.suppliers.hasOpenOrders };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.contactName !== undefined) updateData.contact_name = validated.contactName;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.email !== undefined) updateData.email = validated.email || null;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive;

    const { error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', validated.supplierId);

    if (error) {
      logger.error('Update supplier failed', { userId: user.id, supplierId: validated.supplierId, error: error.message });
      return { error: de.errors.generic };
    }

    if (validated.isActive === false) {
      await logAudit({
        userId: user.id,
        action: 'supplier_deactivated',
        entityType: 'supplier',
        entityId: validated.supplierId,
      });
    }

    revalidatePath('/suppliers');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Update supplier exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function setProductSupplier(input: z.infer<typeof productSupplierSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = productSupplierSchema.parse(input);

    // If setting as preferred, clear other preferred flags first
    if (validated.isPreferred) {
      await supabase
        .from('product_suppliers')
        .update({ is_preferred: false })
        .eq('product_id', validated.productId)
        .eq('is_preferred', true);
    }

    const { error } = await supabase
      .from('product_suppliers')
      .upsert(
        {
          product_id: validated.productId,
          supplier_id: validated.supplierId,
          is_preferred: validated.isPreferred,
          unit_price: validated.unitPrice ?? null,
        },
        { onConflict: 'product_id,supplier_id' }
      );

    if (error) {
      logger.error('Set product supplier failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    revalidatePath('/suppliers');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    return { error: de.errors.generic };
  }
}

export async function getSupplierProducts(supplierId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const { data, error } = await supabase
    .from('product_suppliers')
    .select('id, product_id, is_preferred, products!inner(id, name, is_active)')
    .eq('supplier_id', supplierId);

  if (error) {
    logger.error('Get supplier products failed', { supplierId, error: error.message });
    return { error: de.errors.generic };
  }

  const products = (data ?? []).map((ps) => {
    const product = Array.isArray(ps.products) ? ps.products[0] : ps.products;
    return {
      mappingId: ps.id,
      productId: ps.product_id,
      productName: (product as { name: string }).name,
      isActive: (product as { is_active: boolean }).is_active,
      isPreferred: ps.is_preferred,
    };
  });

  return { success: true, data: products };
}

export async function getAvailableProducts(supplierId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  // Get all active products
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  // Get already assigned products for this supplier
  const { data: assigned } = await supabase
    .from('product_suppliers')
    .select('product_id')
    .eq('supplier_id', supplierId);

  const assignedIds = new Set((assigned ?? []).map((a) => a.product_id));
  const available = (allProducts ?? []).filter((p) => !assignedIds.has(p.id));

  return { success: true, data: available };
}

export async function removeProductSupplier(productId: string, supplierId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const { error } = await supabase
      .from('product_suppliers')
      .delete()
      .eq('product_id', productId)
      .eq('supplier_id', supplierId);

    if (error) {
      logger.error('Remove product supplier failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    revalidatePath('/suppliers');
    return { success: true };
  } catch (err) {
    logger.error('Remove product supplier exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}
