import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,109,68,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(228,196,151,0.2),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <BrandMark className="w-fit" />
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Restaurantbetrieb
                </p>
                <h1 className="font-heading text-5xl font-semibold leading-tight tracking-tight text-foreground">
                  Ruhige Abläufe für die tägliche Bestandskontrolle.
                </h1>
                <p className="max-w-lg text-base leading-8 text-muted-foreground">
                  Kontrolllisten, Lieferanten, Bestellungen und Berichte in einer klaren Arbeitsoberfläche für den operativen Alltag.
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
