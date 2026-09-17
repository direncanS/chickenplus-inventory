import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { getRecentActivity } from '@/lib/server/activity';
import { de } from '@/i18n/de';

export async function RecentActivity() {
  const entries = await getRecentActivity(5);

  return (
    <ActivityTimeline
      entries={entries}
      title={de.activity.recentTitle}
      compact
    />
  );
}
