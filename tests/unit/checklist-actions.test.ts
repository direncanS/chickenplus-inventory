import { beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from '@/i18n/de';

vi.mock('server-only', () => ({}));

const {
  createServerClientMock,
  createAdminClientMock,
  getActiveProfileMock,
  logAuditMock,
  createChecklistForWeekMock,
  revalidatePathMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getActiveProfileMock: vi.fn(),
  logAuditMock: vi.fn(),
  createChecklistForWeekMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  updateTag: () => undefined,
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}));

vi.mock('@/lib/supabase/auth-helpers', () => ({
  getActiveProfile: (...args: unknown[]) => getActiveProfileMock(...args),
}));

vi.mock('@/lib/utils/audit', () => ({
  logAudit: (...args: unknown[]) => logAuditMock(...args),
}));

vi.mock('@/lib/utils/checklist-create', () => ({
  createChecklistForWeek: (...args: unknown[]) => createChecklistForWeekMock(...args),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: vi.fn(),
  },
}));

const userId = '11111111-1111-4111-8111-111111111111';
const checklistId = '22222222-2222-4222-8222-222222222222';
const newChecklistId = '33333333-3333-4333-8333-333333333333';

function createSupabaseStub(options: {
  checklist?: Record<string, unknown> | null;
  linkedOrdersCount?: number;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'checklists') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          maybeSingle: vi.fn().mockResolvedValue({ data: options.checklist ?? null, error: null }),
        };
        return query;
      }

      if (table === 'orders') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn().mockResolvedValue({ count: options.linkedOrdersCount ?? 0, error: null }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('correctChecklistWeek', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    createAdminClientMock.mockReset();
    getActiveProfileMock.mockReset();
    logAuditMock.mockReset();
    createChecklistForWeekMock.mockReset();
    revalidatePathMock.mockReset();
    loggerErrorMock.mockReset();

    getActiveProfileMock.mockResolvedValue({
      id: userId,
      role: 'staff',
      is_active: true,
    });
  });

  it('deletes the wrong-week checklist and recreates it for the target week', async () => {
    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        checklist: {
          id: checklistId,
          iso_year: 2026,
          iso_week: 15,
          week_start_date: '2026-04-05',
          week_end_date: '2026-04-11',
          status: 'draft',
        },
        linkedOrdersCount: 0,
      })
    );

    const deleteItemsEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteChecklistEqMock = vi.fn().mockResolvedValue({ error: null });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'checklist_items') {
          return {
            delete: vi.fn(() => ({
              eq: deleteItemsEqMock,
            })),
          };
        }

        if (table === 'checklists') {
          return {
            delete: vi.fn(() => ({
              eq: deleteChecklistEqMock,
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    createChecklistForWeekMock.mockResolvedValue({
      status: 'created',
      checklistId: newChecklistId,
      itemCount: 12,
    });

    const { correctChecklistWeek } = await import('@/app/(app)/checklist/actions');

    const result = await correctChecklistWeek({
      sourceChecklistId: checklistId,
      targetWeekStart: '2026-04-12',
      targetWeekEnd: '2026-04-18',
    });

    expect(result).toEqual({ success: true, checklistId: newChecklistId });
    expect(deleteItemsEqMock).toHaveBeenCalledWith('checklist_id', checklistId);
    expect(deleteChecklistEqMock).toHaveBeenCalledWith('id', checklistId);
    expect(createChecklistForWeekMock).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      '2026-04-12',
      '2026-04-18'
    );
    expect(logAuditMock).toHaveBeenCalledWith({
      userId,
      action: 'checklist_deleted',
      entityType: 'checklist',
      entityId: checklistId,
      details: expect.objectContaining({
        reason: 'wrong_week_correction',
        originalIsoWeek: 15,
        targetWeekStartDate: '2026-04-12',
      }),
    });
  });

  it('returns a no-op error when the checklist already belongs to the target week', async () => {
    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        checklist: {
          id: checklistId,
          iso_year: 2026,
          iso_week: 16,
          week_start_date: '2026-04-12',
          week_end_date: '2026-04-18',
          status: 'draft',
        },
      })
    );

    const { correctChecklistWeek } = await import('@/app/(app)/checklist/actions');

    const result = await correctChecklistWeek({
      sourceChecklistId: checklistId,
      targetWeekStart: '2026-04-12',
      targetWeekEnd: '2026-04-18',
    });

    expect(result).toEqual({ error: de.checklist.correctionNotNeeded });
    expect(createAdminClientMock).not.toHaveBeenCalled();
    expect(createChecklistForWeekMock).not.toHaveBeenCalled();
  });

  it('blocks automatic correction when linked orders exist', async () => {
    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        checklist: {
          id: checklistId,
          iso_year: 2026,
          iso_week: 15,
          week_start_date: '2026-04-05',
          week_end_date: '2026-04-11',
          status: 'completed',
        },
        linkedOrdersCount: 1,
      })
    );

    const { correctChecklistWeek } = await import('@/app/(app)/checklist/actions');

    const result = await correctChecklistWeek({
      sourceChecklistId: checklistId,
      targetWeekStart: '2026-04-12',
      targetWeekEnd: '2026-04-18',
    });

    expect(result).toEqual({ error: de.checklist.correctionBlockedOrders });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it('returns a correction error if recreation fails after deletion', async () => {
    createServerClientMock.mockResolvedValue(
      createSupabaseStub({
        checklist: {
          id: checklistId,
          iso_year: 2026,
          iso_week: 15,
          week_start_date: '2026-04-05',
          week_end_date: '2026-04-11',
          status: 'draft',
        },
        linkedOrdersCount: 0,
      })
    );

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });

    createChecklistForWeekMock.mockResolvedValue({
      status: 'error',
      message: de.errors.generic,
    });

    const { correctChecklistWeek } = await import('@/app/(app)/checklist/actions');

    const result = await correctChecklistWeek({
      sourceChecklistId: checklistId,
      targetWeekStart: '2026-04-12',
      targetWeekEnd: '2026-04-18',
    });

    expect(result).toEqual({ error: de.checklist.correctionFailed });
  });
});
