'use client';

import { BrandMark } from '@/components/layout/brand-mark';
import { usePathname } from 'next/navigation';
import { de } from '@/i18n/de';
import type { NavCounts } from '@/lib/server/nav-counts';

const pageTitles: Record<string, string> = {
  '/dashboard': de.nav.dashboard,
  '/checklist': de.nav.checklist,
  '/suppliers': de.nav.suppliers,
  '/products': de.nav.products,
  '/orders': de.nav.orders,
  '/archive': de.nav.archive,
  '/reports': de.nav.reports,
  '/settings': de.nav.settings,
};

const pageEyebrows: Record<string, string> = {
  '/dashboard': 'Wochenübersicht',
  '/checklist': 'Bestandskontrolle',
  '/suppliers': 'Lieferanten verwalten',
  '/products': 'Produktstamm verwalten',
  '/orders': 'Bestellübersicht',
  '/archive': 'Vergangene Wochen',
  '/reports': 'Kennzahlen & Trends',
  '/settings': 'Konto & Einstellungen',
};

interface HeaderProps {
  counts: NavCounts;
}

export function Header({ counts }: HeaderProps) {
  const pathname = usePathname();

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Chickenplus';
  const eyebrow = Object.entries(pageEyebrows).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Tagesübersicht';

  // Today's date in Vienna timezone, German locale (e.g., "Mi., 19. Apr.")
  const today = new Date().toLocaleDateString('de-AT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/Vienna',
  });

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background"
      data-no-print
      data-app-header
    >
      <div className="app-grid">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-8 lg:px-12">
          <div className="min-w-0 md:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden md:flex md:flex-col">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="font-heading text-2xl font-normal tracking-tight">
              {title}
            </h1>
          </div>
          <div className="md:hidden text-right min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {title}
            </h1>
          </div>
          <div className="hidden shrink-0 items-center gap-4 font-mono text-xs md:flex">
            <span className="text-muted-foreground">
              {today}
            </span>
            <span className="border-l border-border pl-4 text-primary">
              KW {counts.currentWeek.isoWeek}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
