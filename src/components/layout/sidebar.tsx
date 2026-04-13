'use client';

import { BrandMark } from '@/components/layout/brand-mark';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { de } from '@/i18n/de';
import {
  LayoutDashboard,
  ClipboardCheck,
  Truck,
  ShoppingCart,
  Archive,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: de.nav.dashboard, icon: LayoutDashboard },
  { href: '/checklist', label: de.nav.checklist, icon: ClipboardCheck },
  { href: '/suppliers', label: de.nav.suppliers, icon: Truck },
  { href: '/orders', label: de.nav.orders, icon: ShoppingCart },
  { href: '/archive', label: de.nav.archive, icon: Archive },
  { href: '/reports', label: de.nav.reports, icon: BarChart3 },
  { href: '/settings', label: de.nav.settings, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:w-[18rem] md:flex-col">
      <div className="m-4 flex h-[calc(100vh-2rem)] flex-col rounded-[30px] border border-white/70 bg-sidebar/95 p-4 shadow-[0_24px_70px_-46px_rgba(36,32,28,0.42)]">
        <div className="border-b border-border/70 pb-4">
          <BrandMark />
        </div>
        <div className="px-1 pt-4 pb-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Überblick
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_16px_36px_-26px_rgba(191,70,44,0.85)]'
                    : 'text-muted-foreground hover:bg-white hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                    isActive
                      ? 'border-white/15 bg-white/14 text-primary-foreground'
                      : 'border-border/70 bg-white/70 text-muted-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-3xl border border-primary/10 bg-accent/45 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">Wochenfokus</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kontrollliste, Bestellungen, Lieferanten und Berichte in einer ruhigen Arbeitsoberfläche.
          </p>
        </div>
      </div>
    </aside>
  );
}
