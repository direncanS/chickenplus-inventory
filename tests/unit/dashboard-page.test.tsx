// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentWeekChecklistMock,
  getPreviousActiveChecklistMock,
  getChecklistAggregatesMock,
} = vi.hoisted(() => ({
  getCurrentWeekChecklistMock: vi.fn(),
  getPreviousActiveChecklistMock: vi.fn(),
  getChecklistAggregatesMock: vi.fn(),
}));

vi.mock('@/lib/server/dashboard-data', () => ({
  getCurrentWeekChecklist: () => getCurrentWeekChecklistMock(),
  getPreviousActiveChecklist: () => getPreviousActiveChecklistMock(),
  getChecklistAggregates: (id: string) => getChecklistAggregatesMock(id),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/checklist/correct-checklist-week-button', () => ({
  CorrectChecklistWeekButton: () => <button type="button">Für aktuelle Woche neu erstellen</button>,
}));

describe('WochenkontrolleCard', () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentWeekChecklistMock.mockReset();
    getPreviousActiveChecklistMock.mockReset();
    getChecklistAggregatesMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows completed current-week checklist details, missing count, and export action', async () => {
    getCurrentWeekChecklistMock.mockResolvedValue({
      id: 'checklist-1',
      iso_year: 2026,
      iso_week: 16,
      week_start_date: '2026-04-12',
      week_end_date: '2026-04-18',
      status: 'completed',
      updated_at: '2026-04-13T10:00:00.000Z',
    });
    getPreviousActiveChecklistMock.mockResolvedValue(null);
    getChecklistAggregatesMock.mockResolvedValue({ total: 10, checked: 10, missing: 3, waiting: 3 });

    const { WochenkontrolleCard } = await import('@/components/dashboard/wochenkontrolle-card');
    render(await WochenkontrolleCard());

    expect(screen.getByText(/Kontrollliste dieser Woche/)).toBeTruthy();
    expect(screen.getByText(/3 Produkte fehlen/)).toBeTruthy();
    expect(screen.getAllByText(/Excel exportieren/).length).toBeGreaterThan(0);
  });

  it('shows a previous-week blocking state when no current-week checklist exists', async () => {
    getCurrentWeekChecklistMock.mockResolvedValue(null);
    getPreviousActiveChecklistMock.mockResolvedValue({
      id: 'checklist-old',
      iso_year: 2026,
      iso_week: 15,
      week_start_date: '2026-04-05',
      week_end_date: '2026-04-11',
      status: 'in_progress',
    });
    getChecklistAggregatesMock.mockResolvedValue({ total: 0, checked: 0, missing: 0, waiting: 0 });

    const { WochenkontrolleCard } = await import('@/components/dashboard/wochenkontrolle-card');
    render(await WochenkontrolleCard());

    expect(screen.getAllByText(/Vorwoche/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zur Kontrolle/)).toBeTruthy();
    expect(screen.getByText(/Für aktuelle Woche neu erstellen/)).toBeTruthy();
  });
});
