import { Activity, CheckCircle2, CircleAlert, Clock3, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { formatDateTimeVienna } from '@/lib/utils/date';
import { getAuditDisplay } from '@/lib/utils/audit-display';
import type { ActivityLogEntry } from '@/lib/server/activity';

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  title?: string;
  compact?: boolean;
}

const toneClass = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
};

const toneIcon = {
  default: Activity,
  success: CheckCircle2,
  warning: CircleAlert,
  danger: ShieldAlert,
};

export function ActivityTimeline({
  entries,
  title = de.activity.title,
  compact = false,
}: ActivityTimelineProps) {
  return (
    <Card size={compact ? 'sm' : 'default'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm font-medium">{de.activity.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{de.activity.emptyDescription}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const display = getAuditDisplay({
                action: entry.action,
                entityType: entry.entity_type,
                details: entry.details,
              });
              const Icon = toneIcon[display.tone];
              const actor = entry.profiles?.display_name ?? de.activity.unknownUser;

              return (
                <div key={entry.id} className="flex gap-3 rounded-2xl border border-border/60 bg-white/70 p-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClass[display.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium leading-tight">{display.label}</p>
                      <Badge variant="outline" className="h-5 text-[0.65rem]">
                        {entry.entity_type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{display.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {actor} · {formatDateTimeVienna(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
