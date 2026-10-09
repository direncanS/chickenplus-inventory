import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';

export function QuickActions() {
  const actions = [
    { href: '/suppliers', label: de.nav.suppliers, sub: 'Lieferanten und Produktzuordnung' },
    { href: '/archive', label: de.nav.archive, sub: 'Abgeschlossene Wochenkontrollen' },
    { href: '/reports', label: de.nav.reports, sub: 'Kennzahlen und Liefertrends' },
  ];

  return (
    <Card size="sm" className="border-0 bg-transparent py-0 lg:border-l lg:pl-8">
      <CardHeader className="px-0">
        <CardTitle className="font-heading text-2xl font-normal">{de.dashboard.quickActions}</CardTitle>
        <CardDescription>Lieferanten, abgeschlossene Kontrollen und Berichte.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-16 items-center gap-3 py-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{action.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
