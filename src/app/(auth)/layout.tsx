import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <BrandMark className="w-fit" />
              <div className="space-y-4">
                <p className="border-t border-border pt-6 font-mono text-xs uppercase tracking-[0.1em] text-primary">
                  Restaurantbetrieb
                </p>
                <h1 className="max-w-lg font-heading text-5xl font-normal leading-[1.1] tracking-tight text-foreground xl:text-6xl">
                  Bestandskontrolle und Bestellungen.
                </h1>
                <p className="max-w-lg text-base leading-8 text-muted-foreground">
                  Bestände erfassen, Fehlmengen markieren und Lieferantenbestellungen bearbeiten.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
