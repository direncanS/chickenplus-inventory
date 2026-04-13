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
        'flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/88 px-5 py-5 shadow-[0_24px_60px_-40px_rgba(38,32,29,0.28)] backdrop-blur md:flex-row md:items-end md:justify-between md:px-7',
        className
      )}
    >
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-[2rem]">
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
