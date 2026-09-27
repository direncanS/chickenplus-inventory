// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from '@/components/layout/bottom-nav';
import type { NavCounts } from '@/lib/server/nav-counts';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
}));

const counts: NavCounts = {
  openOrders: 3,
  pendingRoutine: 0,
  currentWeek: {
    isoWeek: 22,
    isoYear: 2026,
    progressPercent: 80,
    status: 'in_progress',
    missingCount: 5,
    remainingCount: 12,
    orderActionCount: 3,
  },
};

describe('BottomNav', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    cleanup();
    usePathnameMock.mockReset();
  });

  it('shows only the four mobile primary entries before the more menu opens', () => {
    render(<BottomNav counts={counts} isAdmin />);

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Kontrolle')).toBeTruthy();
    expect(screen.getByText('Bestellungen')).toBeTruthy();
    expect(screen.getByText('Mehr')).toBeTruthy();
    expect(screen.queryByText('Lieferanten')).toBeNull();
    expect(screen.queryByText('Berichte')).toBeNull();
    expect(screen.queryByText('Produkte')).toBeNull();
  });

  it('keeps badges on checklist and orders primary entries', () => {
    render(<BottomNav counts={counts} isAdmin />);

    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows secondary entries in more menu and closes after a link click', () => {
    render(<BottomNav counts={counts} isAdmin />);

    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }));

    expect(screen.getByText('Lieferanten')).toBeTruthy();
    expect(screen.getByText('Produkte')).toBeTruthy();
    expect(screen.getByText('Berichte')).toBeTruthy();
    expect(screen.getByText('Archiv')).toBeTruthy();
    expect(screen.getByText('Einstellungen')).toBeTruthy();

    fireEvent.click(screen.getByText('Lieferanten'));

    expect(screen.queryByText('Lieferanten')).toBeNull();
  });

  it('does not show products for non-admin users', () => {
    render(<BottomNav counts={counts} isAdmin={false} />);

    fireEvent.click(screen.getByRole('button', { name: /Mehr/ }));

    expect(screen.getByText('Lieferanten')).toBeTruthy();
    expect(screen.queryByText('Produkte')).toBeNull();
  });
});
