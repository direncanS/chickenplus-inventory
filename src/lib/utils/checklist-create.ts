import type { SupabaseClient } from '@supabase/supabase-js';
import { de } from '@/i18n/de';
import { logAudit } from '@/lib/utils/audit';
import { getISOWeekAndYear } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/types/supabase';

type ChecklistCreateRpcResult = {
  success: boolean;
  error?: string;
  checklist_id?: string;
  item_count?: number;
};

export type CreateChecklistForWeekResult =
  | { status: 'created'; checklistId: string; itemCount: number }
  | { status: 'blocked_by_active' }
  | { status: 'already_exists' }
  | { status: 'error'; message: string };

export async function createChecklistForWeek(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekStartDate: string,
  weekEndDate: string
): Promise<CreateChecklistForWeekResult> {
  try {
    const startDate = new Date(`${weekStartDate}T12:00:00`);
    if (startDate.getDay() !== 0) {
      return { status: 'error', message: de.errors.invalidInput };
    }

    const expectedEnd = new Date(startDate);
    expectedEnd.setDate(expectedEnd.getDate() + 6);
    const expectedEndStr = expectedEnd.toISOString().slice(0, 10);
    if (weekEndDate !== expectedEndStr) {
      return { status: 'error', message: de.errors.invalidInput };
    }

    const monday = new Date(startDate);
    monday.setDate(monday.getDate() + 1);
    const { isoYear, isoWeek } = getISOWeekAndYear(monday);

    const { data, error } = await supabase.rpc('rpc_create_checklist_with_snapshot', {
      p_iso_year: isoYear,
      p_iso_week: isoWeek,
      p_created_by: userId,
      p_week_start_date: weekStartDate,
      p_week_end_date: weekEndDate,
    });

    if (error) {
      logger.error('Create checklist RPC error', { userId, error: error.message });
      return { status: 'error', message: de.errors.generic };
    }

    const result = data as ChecklistCreateRpcResult;

    if (!result.success) {
      if (result.error === 'active_checklist_exists') {
        return { status: 'blocked_by_active' };
      }
      if (result.error === 'weekly_checklist_exists') {
        return { status: 'already_exists' };
      }
      return { status: 'error', message: de.errors.generic };
    }

    await logAudit({
      userId,
      action: 'checklist_created',
      entityType: 'checklist',
      entityId: result.checklist_id!,
      details: {
        isoYear,
        isoWeek,
        weekStartDate,
        weekEndDate,
        itemCount: result.item_count ?? 0,
      },
    });

    logger.info('Checklist created', {
      checklistId: result.checklist_id,
      week: `${isoYear}-W${isoWeek}`,
      weekStartDate,
      weekEndDate,
    });

    return {
      status: 'created',
      checklistId: result.checklist_id!,
      itemCount: result.item_count ?? 0,
    };
  } catch (err) {
    logger.error('Create checklist failed', {
      userId,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    return { status: 'error', message: de.errors.generic };
  }
}
