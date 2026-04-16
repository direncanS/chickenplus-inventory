'use client';

import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';
import { usePathname } from 'next/navigation';
import { de } from '@/i18n/de';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [scrolled, setScrolled] = useState(false);

  // Compact header once the user scrolls past a small threshold
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 12);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      className={cn(
        'sticky top-0 z-40 transition-all duration-200',
        scrolled ? 'px-2 pt-2 md:px-4 md:pt-3' : 'px-4 pt-4 md:px-6 md:pt-6'
      )}
      data-no-print
    >
      <div className="app-grid">
        <div
          className={cn(
            'surface-panel flex items-center justify-between gap-3 px-4 py-3 transition-all duration-200 md:px-6',
            scrolled ? 'min-h-[3.4rem] py-2' : 'min-h-[4.75rem] py-3'
          )}
        >
          <div className="md:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden md:flex md:flex-col">
            <p
              className={cn(
                'text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-all duration-200',
                scrolled && 'opacity-0 h-0 -mb-1'
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cn(
                'font-heading font-semibold tracking-tight transition-all duration-200',
                scrolled ? 'text-base' : 'text-xl'
              )}
            >
              {title}
            </h1>
          </div>
          <div className="md:hidden text-right min-w-0">
            <p
              className={cn(
                'text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground truncate transition-all duration-200',
                scrolled && 'opacity-0 h-0'
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cn(
                'font-heading font-semibold tracking-tight truncate transition-all duration-200',
                scrolled ? 'text-sm' : 'text-lg'
              )}
            >
              {title}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all',
                scrolled && 'hidden xl:inline-flex'
              )}
            >
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
