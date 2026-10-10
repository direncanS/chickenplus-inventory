// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  requireAppViewerMock,
  createChecklistForWeekMock,
  rolloverChecklistToWeekMock,
  transformChecklistItemsMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  requireAppViewerMock: vi.fn(),
  createChecklistForWeekMock: vi.fn(),
  rolloverChecklistToWeekMock: vi.fn(),
  transformChecklistItemsMock: vi.fn((items) => items),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/app-viewer', () => ({
  requireAppViewer: (...args: unknown[]) => requireAppViewerMock(...args),
}));

vi.mock('@/lib/utils/checklist-create', () => ({
  createChecklistForWeek: (...args: unknown[]) => createChecklistForWeekMock(...args),
  rolloverChecklistToWeek: (...args: unknown[]) => rolloverChecklistToWeekMock(...args),
}));

vi.mock('@/lib/utils/transform', () => ({
  transformChecklistItems: (items: unknown[]) => transformChecklistItemsMock(items),
}));

vi.mock('@/components/checklist/checklist-view', () => ({
  ChecklistView: ({ checklist }: { checklist: { id: string; status: string } }) => (
    <div data-testid="checklist-view">{checklist.id}:{checklist.status}</div>
  ),
}));

vi.mock('@/components/checklist/correct-checklist-week-button', () => ({
  CorrectChecklistWeekButton: () => <button type="button">Für aktuelle Woche neu erstellen</button>,
}));

function createChecklistPageSupabaseStub(options: {
  currentWeekChecklist?: Record<string, unknown> | null;
  previousActiveChecklist?: Record<string, unknown> | null;
  refetchedChecklist?: Record<string, unknown> | null;
  orderedResponses?: Array<Record<string, unknown> | null>;
}) {
  const checklistResponses = options.orderedResponses
    ? options.orderedResponses.map((data) => ({ data, error: null }))
    : [
        { data: options.currentWeekChecklist ?? null, error: null },
        ...(options.refetchedChecklist !== undefined ? [{ data: options.refetchedChecklist, error: null }] : []),
        ...(options.previousActiveChecklist !== undefined ? [{ data: options.previousActiveChecklist, error: null }] : []),
      ];

  return {
    from: vi.fn((table: string) => {
      if (table === 'checklists') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          in: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(checklistResponses.shift() ?? { data: null, error: null })),
        };

        return query;
      }

      if (table === 'checklist_items') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };

        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('ChecklistPage', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    requireAppViewerMock.mockReset();
    createChecklistForWeekMock.mockReset();
    rolloverChecklistToWeekMock.mockReset();
    transformChecklistItemsMock.mockClear();

    requireAppViewerMock.mockResolvedValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'admin' },
      isAdmin: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the current week checklist directly when it already exists', async () => {
    createServerClientMock.mockResolvedValue(
      createChecklistPageSupabaseStub({
        currentWeekChecklist: {
          id: 'checklist-current',
          iso_year: 2026,
          iso_week: 16,
          week_start_date: '2026-04-12',
          week_end_date: '2026-04-18',
          status: 'completed',
        },
      })
    );

    const { default: ChecklistPage } = await import('@/app/(app)/checklist/page');
    render(await ChecklistPage());

    expect(createChecklistForWeekMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('checklist-view').textContent).toContain('checklist-current:completed');
  });

  it('auto-rolls over a stale previous-week checklist into the current week', async () => {
    createServerClientMock.mockResolvedValue(
      createChecklistPageSupabaseStub({
        // Order of checklists.maybeSingle() calls: current week (none),
        // previous active (stale), then the rolled-over checklist for this week.
        orderedResponses: [
          null,
          {
            id: 'checklist-old',
            iso_year: 2026,
            iso_week: 15,
            week_start_date: '2026-04-05',
            week_end_date: '2026-04-11',
            status: 'in_progress',
          },
          {
            id: 'checklist-old',
            iso_year: 2026,
            iso_week: 33,
            week_start_date: '2026-08-16',
            week_end_date: '2026-08-22',
            status: 'in_progress',
          },
        ],
      })
    );
    createChecklistForWeekMock.mockResolvedValue({ status: 'blocked_by_active' });
    rolloverChecklistToWeekMock.mockResolvedValue({ status: 'rolled_over', checklistId: 'checklist-old' });

    const { default: ChecklistPage } = await import('@/app/(app)/checklist/page');
    render(await ChecklistPage());

    expect(rolloverChecklistToWeekMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('checklist-view').textContent).toContain('checklist-old:in_progress');
    expect(screen.queryByText(/Für aktuelle Woche neu erstellen/)).toBeNull();
  });

  it('shows a fallback warning banner when a blocking active checklist is not stale', async () => {
    createServerClientMock.mockResolvedValue(
      createChecklistPageSupabaseStub({
        currentWeekChecklist: null,
        previousActiveChecklist: {
          id: 'checklist-future',
          iso_year: 2027,
          iso_week: 1,
          week_start_date: '2027-01-03',
          week_end_date: '2027-01-09',
          status: 'in_progress',
        },
      })
    );
    createChecklistForWeekMock.mockResolvedValue({ status: 'blocked_by_active' });

    const { default: ChecklistPage } = await import('@/app/(app)/checklist/page');
    render(await ChecklistPage());

    // Not stale (week_end_date in the future) → no rollover, manual correction offered.
    expect(rolloverChecklistToWeekMock).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Vorwoche/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Für aktuelle Woche neu erstellen/)).toBeTruthy();
    expect(screen.getAllByTestId('checklist-view').at(-1)?.textContent).toContain('checklist-future:in_progress');
  });
});
