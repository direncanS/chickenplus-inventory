'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  MoreHorizontal,
  Package,
} from 'lucide-react';
import type { NavCounts } from '@/lib/server/nav-counts';

interface BottomNavProps {
  counts: NavCounts;
  isAdmin: boolean;
}

export function BottomNav({ counts, isAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const mainNavItems = [
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
  ];

  const moreNavItems = [
    { href: '/suppliers', label: de.nav.suppliers, icon: Truck },
    ...(isAdmin ? [{ href: '/products', label: de.nav.products, icon: Package }] : []),
    { href: '/reports', label: de.nav.reports, icon: BarChart3 },
    { href: '/archive', label: de.nav.archive, icon: Archive },
    { href: '/settings', label: de.nav.settings, icon: Settings },
  ];

  const isMoreActive = moreNavItems.some((item) => pathname.startsWith(item.href));

  const handleClose = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    if (!moreOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [moreOpen]);

  return (
    <nav aria-label="Hauptnavigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom md:hidden" data-no-print data-app-bottom-nav>
      <div className="flex items-center justify-around px-2">
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2 py-2 text-[0.68rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              )}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.badge !== null && (
                  <span
                    className={cn(
                      'absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-sm bg-primary px-1 font-mono text-[0.6rem] tabular-nums text-primary-foreground'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <div ref={moreRef} className="relative flex-1 flex items-center justify-center">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-nav"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'flex min-h-16 min-w-0 w-full flex-col items-center justify-center gap-1 border-t-2 py-2 text-[0.68rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isMoreActive || moreOpen
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{de.nav.more}</span>
          </button>

          {/* More menu popup */}
          {moreOpen && (
            <div id="mobile-more-nav" className="absolute bottom-full right-0 mb-2 min-w-[220px] rounded-sm border border-border bg-card p-2 shadow-sm">
              {moreNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={handleClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                      isActive
                        ? 'bg-muted text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
