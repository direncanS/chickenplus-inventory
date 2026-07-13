// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

function createDashboardSupabaseStub(options: {
  currentWeekChecklist?: Record<string, unknown> | null;
  previousActiveChecklist?: Record<string, unknown> | null;
  totalCount?: number;
  checkedCount?: number;
  missingCount?: number;
}) {
  const checklistItemCounts = [options.totalCount ?? 0, options.checkedCount ?? 0, options.missingCount ?? 0];
  let checklistCallIndex = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === 'checklists') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          neq: vi.fn(() => query),
          in: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          maybeSingle: vi.fn().mockImplementation(() => {
            checklistCallIndex += 1;
            return Promise.resolve({
              data: checklistCallIndex === 1
                ? (options.currentWeekChecklist ?? null)
                : (options.previousActiveChecklist ?? null),
              error: null,
            });
          }),
        };
        return query;
      }

      if (table === 'checklist_items') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve({
              count: checklistItemCounts.shift() ?? 0,
              error: null,
            }).then(resolve, reject),
        };
        return query;
      }

      if (table === 'orders') {
        let callIndex = 0;
        const query = {
          select: vi.fn(() => query),
          in: vi.fn(() => {
            callIndex += 1;
            if (callIndex === 1) {
              return Promise.resolve({ count: 2, error: null });
            }
            return Promise.resolve({
              data: [{ status: 'draft' }, { status: 'ordered' }],
              error: null,
            });
          }),
        };
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows completed current-week checklist details, missing count, and export action', async () => {
    createServerClientMock.mockResolvedValue(
      createDashboardSupabaseStub({
        currentWeekChecklist: {
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 16,
          week_start_date: '2026-04-12',
          week_end_date: '2026-04-18',
          status: 'completed',
          updated_at: '2026-04-13T10:00:00.000Z',
        },
        totalCount: 10,
        checkedCount: 10,
        missingCount: 3,
      })
    );

    const { default: DashboardPage } = await import('@/app/(app)/dashboard/page');
    render(await DashboardPage());

    expect(screen.getByText(/Kontrollliste dieser Woche/)).toBeTruthy();
    expect(screen.getByText(/3 Produkte fehlen/)).toBeTruthy();
    expect(screen.getAllByText(/Excel exportieren/).length).toBeGreaterThan(0);
  });

  it('shows a previous-week blocking state when no current-week checklist exists', async () => {
    createServerClientMock.mockResolvedValue(
      createDashboardSupabaseStub({
        currentWeekChecklist: null,
        previousActiveChecklist: {
          id: 'checklist-old',
          iso_year: 2026,
          iso_week: 15,
          week_start_date: '2026-04-05',
          week_end_date: '2026-04-11',
          status: 'in_progress',
        },
      })
    );

    const { default: DashboardPage } = await import('@/app/(app)/dashboard/page');
    render(await DashboardPage());

    expect(screen.getByText(/Vorwoche/)).toBeTruthy();
    expect(screen.getByText(/Zur Kontrolle/)).toBeTruthy();
  });
});
