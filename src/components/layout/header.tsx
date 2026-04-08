'use client';

import { BrandMark } from '@/components/layout/brand-mark';
import { usePathname } from 'next/navigation';
import { de } from '@/i18n/de';
import { CalendarDays } from 'lucide-react';
import type { NavCounts } from '@/lib/server/nav-counts';

const pageTitles: Record<string, string> = {
  '/dashboard': de.nav.dashboard,
  '/checklist': de.nav.checklist,
  '/suppliers': de.nav.suppliers,
  '/orders': de.nav.orders,
  '/archive': de.nav.archive,
  '/reports': de.nav.reports,
  '/settings': de.nav.settings,
};

const pageEyebrows: Record<string, string> = {
  '/dashboard': 'Wochenübersicht',
  '/checklist': 'Bestandskontrolle',
  '/suppliers': 'Lieferanten verwalten',
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
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-6 md:pt-6" data-no-print>
      <div className="app-grid">
        <div className="surface-panel flex min-h-[4.75rem] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="md:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden md:flex md:flex-col">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="md:hidden text-right min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate">
              {eyebrow}
            </p>
            <h1 className="font-heading text-lg font-semibold tracking-tight truncate">{title}</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              KW {counts.currentWeek.isoWeek}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
