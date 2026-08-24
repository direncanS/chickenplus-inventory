import Link from 'next/link';
import { Archive, ArrowRight, BarChart3, Truck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';

export function QuickActions() {
  const actions = [
    { href: '/suppliers', icon: Truck, label: de.nav.suppliers, sub: 'Lieferanten und Produktzuordnung' },
    { href: '/archive', icon: Archive, label: de.nav.archive, sub: 'Abgeschlossene Wochenkontrollen' },
    { href: '/reports', icon: BarChart3, label: de.nav.reports, sub: 'Kennzahlen und Liefertrends' },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{de.dashboard.quickActions}</CardTitle>
        <CardDescription>Schneller Zugriff auf die wichtigsten Funktionen.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-white/70 p-3 transition-all hover:border-primary/30 hover:bg-accent/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <action.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{action.label}</p>
                <p className="truncate text-xs text-muted-foreground">{action.sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
