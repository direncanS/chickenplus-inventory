import { Skeleton } from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
