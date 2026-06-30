'use client';

import { usePathname } from 'next/navigation';
import { de } from '@/i18n/de';

const pageTitles: Record<string, string> = {
  '/dashboard': de.nav.dashboard,
  '/checklist': de.nav.checklist,
  '/suppliers': de.nav.suppliers,
  '/orders': de.nav.orders,
  '/archive': de.nav.archive,
  '/settings': de.nav.settings,
};

export function Header() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Chickenplus';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-card px-4 md:px-6">
      <h1 className="text-lg font-semibold md:hidden">{title}</h1>
      <h1 className="text-lg font-semibold hidden md:block">{title}</h1>
    </header>
  );
}
