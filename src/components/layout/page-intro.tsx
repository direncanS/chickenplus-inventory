import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageIntroProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 border-b border-foreground/20 pb-6 pt-2 md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-primary">
            {eyebrow}
          </p>
        )}
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground md:text-[2.75rem]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[0.95rem]">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
