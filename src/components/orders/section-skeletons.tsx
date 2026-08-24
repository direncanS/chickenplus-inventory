export function RoutineSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/60 border border-border/50" />
        ))}
      </div>
    </div>
  );
}

export function OrdersSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="surface-subtle flex flex-col gap-3 px-4 py-4">
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="h-3 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/60 border border-border/50" />
        ))}
      </div>
    </div>
  );
}
