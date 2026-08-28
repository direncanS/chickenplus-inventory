'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { createChecklistForWeek } from '@/lib/utils/checklist-create';
import { logger } from '@/lib/utils/logger';
import {
  createChecklistSchema,
  updateChecklistItemSchema,
  updateChecklistItemsBatchSchema,
  completeChecklistSchema,
  reopenChecklistSchema,
} from '@/lib/validations/checklist';
import { de } from '@/i18n/de';
import { z } from 'zod';

const correctChecklistWeekSchema = z.object({
  sourceChecklistId: z.string().uuid(),
  targetWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type ChecklistBatchRpcResult = {
  success: boolean;
  error?: 'checklist_not_found' | 'checklist_completed' | 'item_mismatch' | 'invalid_input';
  updated_item_ids?: string[];
  failed_item_ids?: string[];
  checklist_status?: 'draft' | 'in_progress' | 'completed';
};

export async function createChecklist(input: { weekStartDate: string; weekEndDate: string }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = createChecklistSchema.parse(input);
    const { weekStartDate, weekEndDate } = validated;
    const result = await createChecklistForWeek(supabase, user.id, weekStartDate, weekEndDate);

    if (result.status === 'blocked_by_active') {
      return { error: de.checklist.activeExists };
    }
    if (result.status === 'already_exists') {
      return { error: de.checklist.weeklyChecklistExists };
    }
    if (result.status === 'error') {
      return { error: result.message };
    }

    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true, checklistId: result.checklistId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Create checklist failed', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function correctChecklistWeek(
  input: z.infer<typeof correctChecklistWeekSchema>
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = correctChecklistWeekSchema.parse(input);

    const { data: checklist, error: checklistError } = await supabase
      .from('checklists')
      .select('id, iso_year, iso_week, week_start_date, week_end_date, status')
      .eq('id', validated.sourceChecklistId)
      .maybeSingle();

    if (checklistError) {
      logger.error('Fetch checklist for week correction failed', {
        userId: user.id,
        checklistId: validated.sourceChecklistId,
        error: checklistError.message,
      });
      return { error: de.checklist.correctionFailed };
    }

    if (!checklist) {
      return { error: de.errors.notFound };
    }

    if (
      checklist.week_start_date === validated.targetWeekStart &&
      checklist.week_end_date === validated.targetWeekEnd
    ) {
      return { error: de.checklist.correctionNotNeeded };
    }

    const { count: linkedOrdersCount, error: linkedOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('checklist_id', checklist.id);

    if (linkedOrdersError) {
      logger.error('Check linked orders for checklist week correction failed', {
        userId: user.id,
        checklistId: checklist.id,
        error: linkedOrdersError.message,
      });
      return { error: de.checklist.correctionFailed };
    }

    if ((linkedOrdersCount ?? 0) > 0) {
      return { error: de.checklist.correctionBlockedOrders };
    }

    const admin = createAdminClient();

    const { error: deleteItemsError } = await admin
      .from('checklist_items')
      .delete()
      .eq('checklist_id', checklist.id);

    if (deleteItemsError) {
      logger.error('Delete checklist items for week correction failed', {
        userId: user.id,
        checklistId: checklist.id,
        error: deleteItemsError.message,
      });
      return { error: de.checklist.correctionFailed };
    }

    const { error: deleteChecklistError } = await admin
      .from('checklists')
      .delete()
      .eq('id', checklist.id);

    if (deleteChecklistError) {
      logger.error('Delete checklist for week correction failed', {
        userId: user.id,
        checklistId: checklist.id,
        error: deleteChecklistError.message,
      });
      return { error: de.checklist.correctionFailed };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_deleted',
      entityType: 'checklist',
      entityId: checklist.id,
      details: {
        reason: 'wrong_week_correction',
        originalIsoYear: checklist.iso_year,
        originalIsoWeek: checklist.iso_week,
        originalWeekStartDate: checklist.week_start_date,
        originalWeekEndDate: checklist.week_end_date,
        targetWeekStartDate: validated.targetWeekStart,
        targetWeekEndDate: validated.targetWeekEnd,
      },
    });

    const createResult = await createChecklistForWeek(
      supabase,
      user.id,
      validated.targetWeekStart,
      validated.targetWeekEnd
    );

    if (createResult.status === 'created') {
      revalidatePath('/checklist');
      revalidatePath('/dashboard');
      return { success: true, checklistId: createResult.checklistId };
    }

    if (createResult.status === 'already_exists') {
      const { data: currentWeekChecklist } = await supabase
        .from('checklists')
        .select('id')
        .eq('week_start_date', validated.targetWeekStart)
        .maybeSingle();

      revalidatePath('/checklist');
      revalidatePath('/dashboard');
      return { success: true, checklistId: currentWeekChecklist?.id ?? null };
    }

    if (createResult.status === 'blocked_by_active') {
      return { error: de.checklist.activeExists };
    }

    return { error: de.checklist.correctionFailed };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }

    logger.error('Checklist week correction failed', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.checklist.correctionFailed };
  }
}

export async function updateChecklistItem(input: z.infer<typeof updateChecklistItemSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateChecklistItemSchema.parse(input);

    // Get current item to check checklist status
    const { data: item } = await supabase
      .from('checklist_items')
      .select('id, checklist_id')
      .eq('id', validated.checklistItemId)
      .single();

    if (!item) return { error: de.errors.notFound };

    // Check checklist is not completed
    const { data: checklist } = await supabase
      .from('checklists')
      .select('status')
      .eq('id', item.checklist_id)
      .single();

    if (!checklist || checklist.status === 'completed') {
      return { error: de.errors.unauthorized };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (validated.currentStock !== undefined) {
      updatePayload.current_stock = validated.currentStock;
    }
    if (validated.isMissing !== undefined) {
      updatePayload.is_missing = validated.isMissing;
    }
    if (validated.isChecked !== undefined) {
      updatePayload.is_checked = validated.isChecked;
    }

    // Update item
    const { data: updated, error } = await supabase
      .from('checklist_items')
      .update(updatePayload)
      .eq('id', validated.checklistItemId)
      .select('id, current_stock, is_missing, is_checked')
      .single();

    if (error) {
      logger.error('Update checklist item failed', { userId: user.id, itemId: validated.checklistItemId, error: error.message });
      return { error: de.checklist.saveFailed };
    }

    // Auto-transition draft → in_progress
    if (checklist.status === 'draft') {
      await supabase
        .from('checklists')
        .update({ status: 'in_progress' })
        .eq('id', item.checklist_id)
        .eq('status', 'draft');
    }

    // No revalidatePath for auto-save — return narrow response
    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Update checklist item exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.checklist.saveFailed };
  }
}

export async function updateChecklistItemsBatch(
  input: z.infer<typeof updateChecklistItemsBatchSchema>
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = updateChecklistItemsBatchSchema.parse(input);

    const { data, error } = await supabase.rpc('rpc_update_checklist_items_batch', {
      p_checklist_id: validated.checklistId,
      p_items: validated.items.map((item) => ({
        checklist_item_id: item.checklistItemId,
        current_stock: item.currentStock,
        is_missing: item.isMissing,
        is_checked: item.isChecked,
      })),
    });

    if (error) {
      logger.error('Batch update checklist items RPC error', {
        userId: user.id,
        checklistId: validated.checklistId,
        error: error.message,
      });
      return { error: de.checklist.saveFailed };
    }

    const result = data as ChecklistBatchRpcResult;
    if (!result.success) {
      switch (result.error) {
        case 'checklist_not_found':
        case 'item_mismatch':
          return {
            error: de.errors.notFound,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        case 'checklist_completed':
          return {
            error: de.errors.unauthorized,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        case 'invalid_input':
          return {
            error: de.errors.invalidInput,
            failedItemIds: result.failed_item_ids ?? [],
            errorCode: result.error,
          };
        default:
          return {
            error: de.checklist.saveFailed,
            failedItemIds: result.failed_item_ids ?? [],
          };
      }
    }

    return {
      success: true,
      updatedItemIds: result.updated_item_ids ?? [],
      checklistStatus: result.checklist_status ?? 'in_progress',
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput, fieldErrors: err.flatten().fieldErrors };
    }
    logger.error('Batch update checklist items exception', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { error: de.checklist.saveFailed };
  }
}

export async function completeChecklist(input: z.infer<typeof completeChecklistSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const validated = completeChecklistSchema.parse(input);

    // Server-side validation: fresh read of all items
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_checked')
      .eq('checklist_id', validated.checklistId);

    if (!items || items.length === 0) {
      return { error: de.errors.notFound };
    }

    const allChecked = items.every((i) => i.is_checked);
    if (!allChecked) {
      return { error: de.checklist.allCheckedRequired };
    }

    // Complete
    const { data: completedChecklist, error } = await supabase
      .from('checklists')
      .update({
        status: 'completed',
        completed_by: user.id,
        order_generation_status: 'idle',
        order_generation_started_at: null,
        order_generation_finished_at: null,
        order_generation_orders_created: 0,
        order_generation_error: null,
      })
      .eq('id', validated.checklistId)
      .in('status', ['draft', 'in_progress'])
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('Complete checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    if (!completedChecklist) {
      logger.error('Complete checklist affected no rows', { userId: user.id, checklistId: validated.checklistId });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_completed',
      entityType: 'checklist',
      entityId: validated.checklistId,
      details: { itemCount: items.length },
    });

    logger.info('Checklist completed', {
      checklistId: validated.checklistId,
      orderGenerationStatus: 'idle',
    });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    revalidatePath('/orders');
    return { success: true, orderGenerationStatus: 'idle' as const };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: de.errors.invalidInput };
    }
    logger.error('Complete checklist exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}

export async function reopenChecklist(input: z.infer<typeof reopenChecklistSchema>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  // Admin only
  if (profile.role !== 'admin') {
    return { error: de.errors.unauthorized };
  }

  try {
    const validated = reopenChecklistSchema.parse(input);

    const { error } = await supabase
      .from('checklists')
      .update({
        status: 'in_progress',
        completed_by: null,
        order_generation_status: 'idle',
        order_generation_started_at: null,
        order_generation_finished_at: null,
        order_generation_orders_created: 0,
        order_generation_error: null,
      })
      .eq('id', validated.checklistId)
      .eq('status', 'completed');

    if (error) {
      logger.error('Reopen checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_reopened',
      entityType: 'checklist',
      entityId: validated.checklistId,
    });

    logger.info('Checklist reopened', { checklistId: validated.checklistId });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    logger.error('Reopen checklist exception', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
  }
}
