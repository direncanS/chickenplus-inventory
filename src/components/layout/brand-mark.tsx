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
        'inline-flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4',
        className
      )}
    >
      <div
        className={cn(
          'relative shrink-0',
          compact ? 'h-9 w-9' : 'h-12 w-12'
        )}
      >
        <Image
          src="/logo.png"
          alt="Chickenplus"
          fill
          sizes={compact ? '36px' : '48px'}
          className="object-contain p-1"
          priority
        />
      </div>
      <div className="min-w-0">
        <div className={cn('font-heading tracking-tight text-foreground', compact ? 'text-lg' : 'text-2xl')}>
          Chickenplus
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          Bestandskontrolle
        </div>
      </div>
    </Link>
  );
}
