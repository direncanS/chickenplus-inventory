// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  requireAppViewerMock,
  createChecklistForWeekMock,
  transformChecklistItemsMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  requireAppViewerMock: vi.fn(),
  createChecklistForWeekMock: vi.fn(),
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
}) {
  const checklistResponses = [
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

  it('shows a previous-week warning banner when auto-create is blocked by an older active checklist', async () => {
    createServerClientMock.mockResolvedValue(
      createChecklistPageSupabaseStub({
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
    createChecklistForWeekMock.mockResolvedValue({ status: 'blocked_by_active' });

    const { default: ChecklistPage } = await import('@/app/(app)/checklist/page');
    render(await ChecklistPage());

    expect(screen.getAllByText(/Vorwoche/).length).toBeGreaterThan(0);
    expect(screen.getByText(/KW 15/)).toBeTruthy();
    expect(screen.getByText(/Für aktuelle Woche neu erstellen/)).toBeTruthy();
    expect(screen.getAllByTestId('checklist-view').at(-1)?.textContent).toContain('checklist-old:in_progress');
  });
});
