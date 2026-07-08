import { Skeleton } from '@/components/ui/skeleton';

export default function ChecklistLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <Skeleton className="h-2 w-full" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_80px_40px_40px] sm:grid-cols-[1fr_100px_48px_48px] gap-2"
          >
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
