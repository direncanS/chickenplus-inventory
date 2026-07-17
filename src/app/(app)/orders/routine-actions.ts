'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { de } from '@/i18n/de';
import { z } from 'zod';
import {
  generateRoutineInstancesSchema,
  confirmRoutineInstanceSchema,
  skipRoutineInstanceSchema,
  adjustRoutineInstanceItemSchema,
} from '@/lib/validations/routine-order';

type RpcResult = {
  success: boolean;
  error?: string;
  instances_created?: number;
  instances_backfilled?: number;
  action?: string;
  order_id?: string;
  order_number?: string;
  details?: string;
};

function mapRpcError(error: string | undefined): string {
  switch (error) {
    case 'unauthorized': return de.errors.unauthorized;
    case 'instance_not_found': return de.errors.notFound;
    case 'instance_already_resolved': return de.errors.generic;
    case 'checklist_not_completed': return de.routineOrders.checklistRequired;
    case 'order_creation_failed': return de.errors.generic;
    case 'invalid_quantity': return de.errors.invalidInput;
    case 'item_not_found': return de.errors.notFound;
    default: return de.errors.generic;
  }
}

export async function generateRoutineInstances(input: z.infer<typeof generateRoutineInstancesSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = generateRoutineInstancesSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_generate_routine_instances', {
      p_iso_year: validated.isoYear,
      p_iso_week: validated.isoWeek,
      p_week_start_date: validated.weekStartDate,
      p_checklist_id: validated.checklistId ?? null,
    });

    if (error) {
      logger.error('Generate routine instances RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_instances_generated',
      entityType: 'routine_order_instance',
      entityId: user.id,
      details: {
        iso_year: validated.isoYear,
        iso_week: validated.isoWeek,
        instances_created: result.instances_created,
        instances_backfilled: result.instances_backfilled,
      },
    });

    revalidatePath('/orders');
    return {
      success: true,
      instancesCreated: result.instances_created ?? 0,
      instancesBackfilled: result.instances_backfilled ?? 0,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Generate routine instances exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function confirmRoutineInstance(input: z.infer<typeof confirmRoutineInstanceSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = confirmRoutineInstanceSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_confirm_routine_instance', {
      p_instance_id: validated.instanceId,
      p_checklist_id: validated.checklistId,
    });

    if (error) {
      logger.error('Confirm routine instance RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_instance_confirmed',
      entityType: 'routine_order_instance',
      entityId: validated.instanceId,
      details: {
        action: result.action,
        order_id: result.order_id,
        order_number: result.order_number,
      },
    });

    revalidatePath('/orders');
    return { success: true, action: result.action, orderNumber: result.order_number };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Confirm routine instance exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function skipRoutineInstance(input: z.infer<typeof skipRoutineInstanceSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = skipRoutineInstanceSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_skip_routine_instance', {
      p_instance_id: validated.instanceId,
      p_checklist_id: validated.checklistId,
    });

    if (error) {
      logger.error('Skip routine instance RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    await logAudit({
      userId: user.id,
      action: 'routine_instance_skipped',
      entityType: 'routine_order_instance',
      entityId: validated.instanceId,
    });

    revalidatePath('/orders');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Skip routine instance exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function adjustRoutineInstanceItem(input: z.infer<typeof adjustRoutineInstanceItemSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = adjustRoutineInstanceItemSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_adjust_routine_instance_item', {
      p_item_id: validated.itemId,
      p_adjusted_quantity: validated.adjustedQuantity ?? null,
      p_is_included: validated.isIncluded ?? null,
    });

    if (error) {
      logger.error('Adjust routine instance item RPC failed', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as unknown as RpcResult;
    if (!result.success) {
      return { error: mapRpcError(result.error) };
    }

    revalidatePath('/orders');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Adjust routine instance item exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}
