export function HeroCardSkeleton() {
  return (
    <div className="border-b border-foreground/20 pb-8 md:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="min-w-0 w-full space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-64 max-w-full animate-pulse bg-muted" />
            <div className="h-4 w-80 max-w-full animate-pulse bg-muted" />
          </div>
        </div>
        <div className="h-11 w-32 shrink-0 animate-pulse rounded-sm bg-muted" />
      </div>
    </div>
  );
}

export function KpiStripSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/60 p-3">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WochenkontrolleCardSkeleton() {
  return (
    <div className="py-0">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function StatusBreakdownSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/60 p-4">
      <div className="space-y-3">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-6 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
