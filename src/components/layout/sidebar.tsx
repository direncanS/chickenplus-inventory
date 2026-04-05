'use client';

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
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-14 items-center px-4 border-b">
        <Link href="/dashboard" className="font-bold text-lg">
          Chickenplus
        </Link>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
