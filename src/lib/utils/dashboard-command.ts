export interface DashboardCommandInput {
  hasCurrentChecklist: boolean;
  checklistStatus: 'draft' | 'in_progress' | 'completed' | null;
  checkedCount: number;
  totalCount: number;
  waitingMissingCount: number;
  openOrdersCount: number;
  pendingRoutineCount: number;
  hasPreviousActiveChecklist: boolean;
}

export type DashboardCommandTone = 'primary' | 'amber' | 'blue' | 'green' | 'neutral';

export interface DashboardCommandItem {
  key: 'previous' | 'checklist' | 'orders' | 'routine' | 'done';
  tone: DashboardCommandTone;
  titleKey: string;
  descriptionKey: string;
  href: string;
  ctaKey: string;
  metric: string;
}

export function buildDashboardCommandItems(
  input: DashboardCommandInput
): DashboardCommandItem[] {
  if (input.hasPreviousActiveChecklist && !input.hasCurrentChecklist) {
    return [
      {
        key: 'previous',
        tone: 'amber',
        titleKey: 'commandPreviousTitle',
        descriptionKey: 'commandPreviousDescription',
        href: '/checklist',
        ctaKey: 'goToChecklist',
        metric: '!',
      },
    ];
  }

  if (!input.hasCurrentChecklist) {
    return [
      {
        key: 'checklist',
        tone: 'primary',
        titleKey: 'commandStartChecklistTitle',
        descriptionKey: 'commandStartChecklistDescription',
        href: '/checklist',
        ctaKey: 'startChecklist',
        metric: '0%',
      },
    ];
  }

  const commands: DashboardCommandItem[] = [];
  const progress =
    input.totalCount > 0 ? Math.round((input.checkedCount / input.totalCount) * 100) : 0;

  if (input.checklistStatus === 'draft' || input.checklistStatus === 'in_progress') {
    commands.push({
      key: 'checklist',
      tone: 'blue',
      titleKey: 'commandContinueChecklistTitle',
      descriptionKey: 'commandContinueChecklistDescription',
      href: '/checklist',
      ctaKey: 'continueChecklist',
      metric: `${progress}%`,
    });
  }

  if (input.waitingMissingCount > 0) {
    commands.push({
      key: 'orders',
      tone: 'amber',
      titleKey: 'commandOrderMissingTitle',
      descriptionKey: 'commandOrderMissingDescription',
      href: '/orders',
      ctaKey: 'goToOrders',
      metric: String(input.waitingMissingCount),
    });
  }

  if (input.openOrdersCount > 0) {
    commands.push({
      key: 'orders',
      tone: 'primary',
      titleKey: 'commandOpenOrdersTitle',
      descriptionKey: 'commandOpenOrdersDescription',
      href: '/orders',
      ctaKey: 'goToOrders',
      metric: String(input.openOrdersCount),
    });
  }

  if (input.pendingRoutineCount > 0) {
    commands.push({
      key: 'routine',
      tone: 'amber',
      titleKey: 'commandRoutineTitle',
      descriptionKey: 'commandRoutineDescription',
      href: '/orders/routine',
      ctaKey: 'goToRoutine',
      metric: String(input.pendingRoutineCount),
    });
  }

  if (commands.length === 0) {
    commands.push({
      key: 'done',
      tone: 'green',
      titleKey: 'commandDoneTitle',
      descriptionKey: 'commandDoneDescription',
      href: '/dashboard',
      ctaKey: 'allCaughtUp',
      metric: '✓',
    });
  }

  return commands;
}
