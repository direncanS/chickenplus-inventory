'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import {
  createProductSchema,
  toggleProductActiveSchema,
  updateProductSchema,
} from '@/lib/validations/product';
import { de } from '@/i18n/de';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';

type ProductMutationResult =
  | { success: true; productId?: string; syncedItems?: number }
  | { error: string; fieldErrors?: Record<string, string[] | undefined> };

type AdminContext =
  | { supabase: Awaited<ReturnType<typeof createServerClient>>; user: User }
  | { error: string };

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn as string };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated as string };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized as string };

  return { supabase, user };
}

function normalizeNumber(value: number | null | undefined) {
  return value ?? null;
}

async function setPreferredSupplier(
  productId: string,
  supplierId: string | null | undefined
) {
  const admin = createAdminClient();

  await admin
    .from('product_suppliers')
    .update({ is_preferred: false })
    .eq('product_id', productId)
    .eq('is_preferred', true);

  if (!supplierId) return;

  const { error } = await admin
    .from('product_suppliers')
    .upsert(
      {
        product_id: productId,
        supplier_id: supplierId,
        is_preferred: true,
      },
      { onConflict: 'product_id,supplier_id' }
    );

  if (error) {
    throw new Error(error.message);
  }
}

async function syncDraftChecklistSnapshots(productId?: string) {
  const admin = createAdminClient();

  const { data: openChecklists, error: checklistsError } = await admin
    .from('checklists')
    .select('id')
    .in('status', ['draft', 'in_progress']);

  if (checklistsError) {
    throw new Error(checklistsError.message);
  }

  const checklistIds = openChecklists?.map((checklist) => checklist.id) ?? [];
  if (checklistIds.length === 0) return 0;

  const inactiveQuery = admin
    .from('products')
    .select('id')
    .eq('is_active', false);

  if (productId) inactiveQuery.eq('id', productId);

  const { data: inactiveProducts, error: inactiveError } = await inactiveQuery;
  if (inactiveError) {
    throw new Error(inactiveError.message);
  }

  const inactiveProductIds = inactiveProducts?.map((product) => product.id) ?? [];
  if (inactiveProductIds.length > 0) {
    const { error: deleteInactiveError } = await admin
      .from('checklist_items')
      .delete()
      .in('checklist_id', checklistIds)
      .in('product_id', inactiveProductIds);

    if (deleteInactiveError) {
      throw new Error(deleteInactiveError.message);
    }
  }

  const activeQuery = admin
    .from('products')
    .select('id, name, min_stock, min_stock_max')
    .eq('is_active', true);

  if (productId) activeQuery.eq('id', productId);

  const { data: activeProducts, error: activeError } = await activeQuery;
  if (activeError) {
    throw new Error(activeError.message);
  }

  const products = activeProducts ?? [];
  if (products.length === 0) return 0;

  let syncedItems = 0;
  for (const product of products) {
    const { error: updateError } = await admin
      .from('checklist_items')
      .update({
        product_name: product.name,
        min_stock_snapshot: product.min_stock,
        min_stock_max_snapshot: product.min_stock_max,
      })
      .eq('product_id', product.id)
      .in('checklist_id', checklistIds);

    if (updateError) {
      throw new Error(updateError.message);
    }

    syncedItems += checklistIds.length;
  }

  const insertPayload = checklistIds.flatMap((checklistId) =>
    products.map((product) => ({
      checklist_id: checklistId,
      product_id: product.id,
      product_name: product.name,
      min_stock_snapshot: product.min_stock,
      min_stock_max_snapshot: product.min_stock_max,
    }))
  );

  const { error: insertError } = await admin
    .from('checklist_items')
    .upsert(insertPayload, {
      onConflict: 'checklist_id,product_id',
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return syncedItems + insertPayload.length;
}

function revalidateProductSurfaces() {
  revalidatePath('/products');
  revalidatePath('/checklist');
  revalidatePath('/dashboard');
  revalidatePath('/orders');
  revalidatePath('/suppliers');
  updateTag('product_suppliers');
}

export async function createProduct(
  input: z.infer<typeof createProductSchema>
): Promise<ProductMutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  try {
    const validated = createProductSchema.parse(input);
    const { data, error } = await auth.supabase
      .from('products')
      .insert({
        name: validated.name,
        storage_location_id: validated.storageLocationId,
        category_id: validated.categoryId,
        unit: validated.unit ?? null,
        min_stock: normalizeNumber(validated.minStock),
        min_stock_max: normalizeNumber(validated.minStockMax),
        sort_order: validated.sortOrder,
        is_active: true,
      })
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') return { error: de.products.duplicateName };
      logger.error('Create product failed', { userId: auth.user.id, error: error.message });
      return { error: de.errors.generic };
    }

    await setPreferredSupplier(data.id, validated.preferredSupplierId);
    await syncDraftChecklistSnapshots(data.id);

    await logAudit({
      userId: auth.user.id,
      action: 'product_created',
      entityType: 'product',
      entityId: data.id,
      details: { name: data.name },
    });

    revalidateProductSurfaces();
    return { success: true, productId: data.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Create product exception', {
      userId: auth.user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}

export async function updateProduct(
  input: z.infer<typeof updateProductSchema>
): Promise<ProductMutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  try {
    const validated = updateProductSchema.parse(input);
    const { error } = await auth.supabase
      .from('products')
      .update({
        name: validated.name,
        storage_location_id: validated.storageLocationId,
        category_id: validated.categoryId,
        unit: validated.unit ?? null,
        min_stock: normalizeNumber(validated.minStock),
        min_stock_max: normalizeNumber(validated.minStockMax),
        sort_order: validated.sortOrder,
        is_active: validated.isActive ?? true,
      })
      .eq('id', validated.productId);

    if (error) {
      if (error.code === '23505') return { error: de.products.duplicateName };
      logger.error('Update product failed', { userId: auth.user.id, error: error.message });
      return { error: de.errors.generic };
    }

    await setPreferredSupplier(validated.productId, validated.preferredSupplierId);
    await syncDraftChecklistSnapshots(validated.productId);

    await logAudit({
      userId: auth.user.id,
      action: 'product_updated',
      entityType: 'product',
      entityId: validated.productId,
      details: { name: validated.name },
    });

    revalidateProductSurfaces();
    return { success: true, productId: validated.productId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Update product exception', {
      userId: auth.user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}

export async function toggleProductActive(
  input: z.infer<typeof toggleProductActiveSchema>
): Promise<ProductMutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  try {
    const validated = toggleProductActiveSchema.parse(input);
    const { error } = await auth.supabase
      .from('products')
      .update({ is_active: validated.isActive })
      .eq('id', validated.productId);

    if (error) {
      logger.error('Toggle product active failed', { userId: auth.user.id, error: error.message });
      return { error: de.errors.generic };
    }

    await syncDraftChecklistSnapshots(validated.productId);

    await logAudit({
      userId: auth.user.id,
      action: validated.isActive ? 'product_activated' : 'product_deactivated',
      entityType: 'product',
      entityId: validated.productId,
    });

    revalidateProductSurfaces();
    return { success: true, productId: validated.productId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Toggle product active exception', {
      userId: auth.user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}

export async function syncActiveChecklistProducts(): Promise<ProductMutationResult> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  try {
    const syncedItems = await syncDraftChecklistSnapshots();
    await logAudit({
      userId: auth.user.id,
      action: 'product_checklist_snapshots_synced',
      entityType: 'product',
      entityId: auth.user.id,
    });

    revalidateProductSurfaces();
    return { success: true, syncedItems };
  } catch (err) {
    logger.error('Sync active checklist products exception', {
      userId: auth.user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.errors.generic };
  }
}
