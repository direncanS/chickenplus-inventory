'use client';

import { BrandMark } from '@/components/layout/brand-mark';
import { usePathname } from 'next/navigation';
import { de } from '@/i18n/de';

const pageTitles: Record<string, string> = {
  '/dashboard': de.nav.dashboard,
  '/checklist': de.nav.checklist,
  '/suppliers': de.nav.suppliers,
  '/orders': de.nav.orders,
  '/archive': de.nav.archive,
  '/reports': de.nav.reports,
  '/settings': de.nav.settings,
};

export function Header() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Chickenplus';

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-6 md:pt-6">
      <div className="app-grid">
        <div className="surface-panel flex min-h-[4.75rem] items-center justify-between px-4 py-3 md:px-6">
          <div className="md:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden md:block">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Tagesübersicht
            </p>
            <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="md:hidden text-right">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Chickenplus
            </p>
            <h1 className="font-heading text-lg font-semibold tracking-tight">{title}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
