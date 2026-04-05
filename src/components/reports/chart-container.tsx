'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

export function ChartContainer({ title, children, isEmpty }: ChartContainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {de.reports.noData}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
