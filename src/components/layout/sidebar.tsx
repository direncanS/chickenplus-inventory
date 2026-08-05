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
import type { NavCounts } from '@/lib/server/nav-counts';

interface SidebarProps {
  counts: NavCounts;
}

export function Sidebar({ counts }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: de.nav.dashboard, icon: LayoutDashboard, badge: null as number | null },
    {
      href: '/checklist',
      label: de.nav.checklist,
      icon: ClipboardCheck,
      badge: counts.currentWeek.missingCount > 0 ? counts.currentWeek.missingCount : null,
    },
    {
      href: '/orders',
      label: de.nav.orders,
      icon: ShoppingCart,
      badge: counts.openOrders > 0 ? counts.openOrders : null,
    },
    { href: '/suppliers', label: de.nav.suppliers, icon: Truck, badge: null },
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
  const statusColor: Record<NonNullable<typeof week.status>, string> = {
    draft: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:w-[18rem] md:flex-col" data-no-print>
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
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== null && (
                  <span
                    className={cn(
                      'flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-[0.7rem] font-semibold tabular-nums',
                      isActive
                        ? 'bg-white/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary'
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
        <div className="mt-auto rounded-3xl border border-primary/10 bg-accent/45 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              KW {week.isoWeek}
            </p>
            {week.status && (
              <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', statusColor[week.status])}>
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
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all"
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
