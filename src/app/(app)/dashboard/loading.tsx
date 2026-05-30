import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-3xl border bg-white p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="hidden h-10 w-32 rounded-xl sm:block" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
