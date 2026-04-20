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
} from 'lucide-react';
import type { NavCounts } from '@/lib/server/nav-counts';

interface BottomNavProps {
  counts: NavCounts;
}

export function BottomNav({ counts }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const mainNavItems = [
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
  ];

  const moreNavItems = [
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-area-bottom" data-no-print>
      <div className="surface-panel flex items-center justify-around rounded-[28px] px-2 py-1.5">
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[0.68rem] transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_14px_28px_-24px_rgba(191,70,44,0.9)]'
                  : 'text-muted-foreground'
              )}
            >
              <span className="relative">
                <item.icon className="h-6 w-6" />
                {item.badge !== null && (
                  <span
                    className={cn(
                      'absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums shadow',
                      isActive
                        ? 'bg-white text-primary'
                        : 'bg-primary text-primary-foreground'
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
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'flex min-w-0 w-full flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[0.68rem] transition-all',
              isMoreActive || moreOpen
                ? 'bg-primary text-primary-foreground shadow-[0_14px_28px_-24px_rgba(191,70,44,0.9)] font-medium'
                : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="truncate">{de.nav.more}</span>
          </button>

          {/* More menu popup */}
          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-3 min-w-[200px] rounded-[24px] border border-white/80 bg-card/98 p-2 shadow-[0_28px_60px_-34px_rgba(38,32,29,0.35)]">
              {moreNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleClose}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
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
