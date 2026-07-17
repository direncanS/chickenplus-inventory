'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { de } from '@/i18n/de';
import { z } from 'zod';
import {
  createRoutineOrderSchema,
  updateRoutineOrderSchema,
  addRoutineOrderItemSchema,
} from '@/lib/validations/routine-order';

type RpcResult = { success: boolean; error?: string; id?: string };

function mapRpcError(error: string | undefined): string {
  switch (error) {
    case 'unauthorized': return de.errors.unauthorized;
    case 'duplicate_routine': return de.routineOrders.duplicateRoutine;
    case 'duplicate_item': return de.routineOrders.duplicateItem;
    case 'invalid_day_of_week': return de.errors.invalidInput;
    case 'invalid_quantity': return de.errors.invalidInput;
    case 'not_found': return de.errors.notFound;
    default: return de.errors.generic;
  }
}

export async function createRoutineOrder(input: z.infer<typeof createRoutineOrderSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = createRoutineOrderSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_create_routine_order', {
      p_supplier_id: validated.supplierId,
      p_day_of_week: validated.dayOfWeek,
      p_notes: validated.notes ?? null,
    });

    if (error) {
      logger.error('Create routine order RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_order_created',
      entityType: 'routine_order',
      entityId: result.id!,
      details: { supplier_id: validated.supplierId, day_of_week: validated.dayOfWeek },
    });

    revalidatePath('/orders/routine');
    revalidatePath('/orders');
    return { success: true, id: result.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Create routine order exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function updateRoutineOrder(input: z.infer<typeof updateRoutineOrderSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = updateRoutineOrderSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_update_routine_order', {
      p_routine_id: validated.routineId,
      p_is_active: validated.isActive ?? null,
      p_notes: validated.notes ?? null,
    });

    if (error) {
      logger.error('Update routine order RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_order_updated',
      entityType: 'routine_order',
      entityId: validated.routineId,
      details: { is_active: validated.isActive, notes: validated.notes },
    });

    revalidatePath('/orders/routine');
    revalidatePath('/orders');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Update routine order exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function deleteRoutineOrder(routineId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const { data, error } = await supabase.rpc('rpc_delete_routine_order', {
      p_routine_id: routineId,
    });

    if (error) {
      logger.error('Delete routine order RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_order_deleted',
      entityType: 'routine_order',
      entityId: routineId,
    });

    revalidatePath('/orders/routine');
    revalidatePath('/orders');
    return { success: true };
  } catch (err) {
    logger.error('Delete routine order exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function addRoutineOrderItem(input: z.infer<typeof addRoutineOrderItemSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const validated = addRoutineOrderItemSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_add_routine_order_item', {
      p_routine_order_id: validated.routineOrderId,
      p_product_id: validated.productId,
      p_default_quantity: validated.defaultQuantity,
    });

    if (error) {
      logger.error('Add routine order item RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_order_item_added',
      entityType: 'routine_order_item',
      entityId: result.id!,
      details: { routine_order_id: validated.routineOrderId, product_id: validated.productId },
    });

    revalidatePath('/orders/routine');
    return { success: true, id: result.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Add routine order item exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function removeRoutineOrderItem(itemId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  try {
    const { data, error } = await supabase.rpc('rpc_remove_routine_order_item', {
      p_item_id: itemId,
    });

    if (error) {
      logger.error('Remove routine order item RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_order_item_removed',
      entityType: 'routine_order_item',
      entityId: itemId,
    });

    revalidatePath('/orders/routine');
    return { success: true };
  } catch (err) {
    logger.error('Remove routine order item exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function getAvailableProductsForRoutine(routineOrderId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };
  if (profile.role !== 'admin') return { error: de.errors.unauthorized };

  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, unit')
    .eq('is_active', true)
    .order('name');

  const { data: assigned } = await supabase
    .from('routine_order_items')
    .select('product_id')
    .eq('routine_order_id', routineOrderId);

  const assignedIds = new Set((assigned ?? []).map((a) => a.product_id));
  const available = (allProducts ?? []).filter((p) => !assignedIds.has(p.id));

  return { success: true, data: available };
}
