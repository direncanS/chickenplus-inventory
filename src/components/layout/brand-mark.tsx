import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        'group inline-flex items-center gap-3 rounded-2xl transition-transform hover:-translate-y-0.5',
        className
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-[0_12px_30px_-18px_rgba(191,70,44,0.55)]',
          compact ? 'h-11 w-11 p-1.5' : 'h-14 w-14 p-2'
        )}
      >
        <Image
          src="/logo.png"
          alt="Chickenplus"
          fill
          className="object-contain p-1"
          priority
        />
      </div>
      <div className="min-w-0">
        <div className={cn('font-heading font-semibold tracking-tight text-foreground', compact ? 'text-base' : 'text-lg')}>
          Chickenplus
        </div>
        <div className="text-xs text-muted-foreground">
          Bestandskontrolle
        </div>
      </div>
    </Link>
  );
}
