'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getActiveProfile } from '@/lib/supabase/auth-helpers';
import { logAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/logger';
import { calculateMissing } from '@/lib/utils/calculations';
import { getISOWeekAndYear } from '@/lib/utils/date';
import { updateChecklistItemSchema, completeChecklistSchema, reopenChecklistSchema } from '@/lib/validations/checklist';
import { de } from '@/i18n/de';
import { z } from 'zod';

export async function createChecklist() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: de.auth.notLoggedIn };

  const profile = await getActiveProfile(supabase, user.id);
  if (!profile) return { error: de.auth.accountDeactivated };

  try {
    const { isoYear, isoWeek } = getISOWeekAndYear();

    const { data, error } = await supabase.rpc('rpc_create_checklist_with_snapshot', {
      p_iso_year: isoYear,
      p_iso_week: isoWeek,
      p_created_by: user.id,
    });

    if (error) {
      logger.error('Create checklist RPC error', { userId: user.id, error: error.message });
      return { error: de.errors.generic };
    }

    const result = data as { success: boolean; error?: string; checklist_id?: string; item_count?: number };

    if (!result.success) {
      if (result.error === 'active_checklist_exists') {
        return { error: de.checklist.activeExists };
      }
      if (result.error === 'duplicate_week') {
        return { error: de.checklist.duplicateWeek };
      }
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_created',
      entityType: 'checklist',
      entityId: result.checklist_id!,
      details: { isoYear, isoWeek, itemCount: result.item_count },
    });

    logger.info('Checklist created', { checklistId: result.checklist_id, week: `${isoYear}-W${isoWeek}` });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true, checklistId: result.checklist_id };
  } catch (err) {
    logger.error('Create checklist failed', { userId: user.id, error: err instanceof Error ? err.message : 'Unknown' });
    return { error: de.errors.generic };
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
      .select('id, checklist_id, min_stock_snapshot, is_missing_overridden')
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

    // Calculate missing amount server-side
    const missingCalculated = calculateMissing(validated.currentStock, item.min_stock_snapshot);

    // Determine override state
    const isOverridden = validated.isMissingOverridden ?? item.is_missing_overridden;
    const missingFinal = isOverridden && validated.missingAmountFinal !== undefined
      ? validated.missingAmountFinal
      : missingCalculated;

    // Update item
    const { data: updated, error } = await supabase
      .from('checklist_items')
      .update({
        current_stock: validated.currentStock,
        missing_amount_calculated: missingCalculated,
        missing_amount_final: missingFinal,
        is_missing_overridden: isOverridden,
        is_checked: validated.isChecked ?? false,
      })
      .eq('id', validated.checklistItemId)
      .select('id, current_stock, missing_amount_calculated, missing_amount_final, is_missing_overridden, is_checked')
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
      .select('is_checked, current_stock')
      .eq('checklist_id', validated.checklistId);

    if (!items || items.length === 0) {
      return { error: de.errors.notFound };
    }

    const allChecked = items.every((i) => i.is_checked);
    if (!allChecked) {
      return { error: de.checklist.allCheckedRequired };
    }

    const allHaveStock = items.every((i) => i.current_stock !== null);
    if (!allHaveStock) {
      return { error: de.checklist.allStockRequired };
    }

    // Complete
    const { error } = await supabase
      .from('checklists')
      .update({ status: 'completed', completed_by: user.id })
      .eq('id', validated.checklistId)
      .in('status', ['draft', 'in_progress']);

    if (error) {
      logger.error('Complete checklist failed', { userId: user.id, checklistId: validated.checklistId, error: error.message });
      return { error: de.errors.generic };
    }

    await logAudit({
      userId: user.id,
      action: 'checklist_completed',
      entityType: 'checklist',
      entityId: validated.checklistId,
      details: { itemCount: items.length },
    });

    logger.info('Checklist completed', { checklistId: validated.checklistId });
    revalidatePath('/checklist');
    revalidatePath('/dashboard');
    return { success: true };
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
      .update({ status: 'in_progress', completed_by: null })
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
