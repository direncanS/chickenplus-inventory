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
  Package,
} from 'lucide-react';
import type { NavCounts } from '@/lib/server/nav-counts';

interface SidebarProps {
  counts: NavCounts;
  isAdmin: boolean;
}

export function Sidebar({ counts, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: de.nav.dashboard, icon: LayoutDashboard, badge: null as number | null },
    {
      href: '/checklist',
      label: de.nav.checklist,
      icon: ClipboardCheck,
      badge:
        counts.currentWeek.status !== 'completed' && counts.currentWeek.remainingCount > 0
          ? counts.currentWeek.remainingCount
          : null,
    },
    {
      href: '/orders',
      label: de.nav.orders,
      icon: ShoppingCart,
      badge: counts.openOrders > 0 ? counts.openOrders : null,
    },
    { href: '/suppliers', label: de.nav.suppliers, icon: Truck, badge: null },
    ...(isAdmin ? [{ href: '/products', label: de.nav.products, icon: Package, badge: null }] : []),
    { href: '/reports', label: de.nav.reports, icon: BarChart3, badge: null },
    { href: '/archive', label: de.nav.archive, icon: Archive, badge: null },
    { href: '/settings', label: de.nav.settings, icon: Settings, badge: null },
  ];

  const week = counts.currentWeek;
  const statusLabel: Record<NonNullable<typeof week.status>, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  return (
    <aside className="hidden border-r border-border bg-sidebar md:fixed md:inset-y-0 md:flex md:w-[15rem] md:flex-col" data-no-print>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
        <div className="border-b border-border pb-6">
          <BrandMark />
        </div>
        <div className="px-1 pt-4 pb-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
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
                prefetch
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  isActive
                    ? 'border-primary font-semibold text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={isActive ? 'text-primary' : 'text-muted-foreground'}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== null && (
                  <span
                    className={cn(
                      'min-w-6 text-right font-mono text-xs tabular-nums text-primary'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Week snapshot — replaces the vague "Wochenfokus" copy with real info */}
        <div className="mt-8 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              KW {week.isoWeek}
            </p>
            {week.status && (
              <span className="text-[0.65rem] font-medium text-muted-foreground">
                {statusLabel[week.status]}
              </span>
            )}
          </div>
          {week.progressPercent !== null ? (
            <>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">{week.progressPercent}</span>
                <span className="text-sm font-medium text-muted-foreground">%</span>
                <span className="ml-auto text-[0.7rem] text-muted-foreground">geprüft</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${week.progressPercent}%` }}
                />
              </div>
              {week.missingCount > 0 && (
                <p className="mt-2 text-[0.7rem] text-amber-700">
                  {week.missingCount} {de.checklist.missing}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Noch keine Kontrollliste in dieser Woche.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
