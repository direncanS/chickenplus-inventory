import { describe, expect, it } from 'vitest';
import { buildDashboardCommandItems } from '@/lib/utils/dashboard-command';

describe('buildDashboardCommandItems', () => {
  it('prioritizes previous active checklist when current week is missing', () => {
    const commands = buildDashboardCommandItems({
      hasCurrentChecklist: false,
      checklistStatus: null,
      checkedCount: 0,
      totalCount: 0,
      waitingMissingCount: 0,
      openOrdersCount: 0,
      pendingRoutineCount: 0,
      hasPreviousActiveChecklist: true,
    });

    expect(commands).toHaveLength(1);
    expect(commands[0].key).toBe('previous');
  });

  it('starts checklist when there is no current checklist', () => {
    const commands = buildDashboardCommandItems({
      hasCurrentChecklist: false,
      checklistStatus: null,
      checkedCount: 0,
      totalCount: 0,
      waitingMissingCount: 0,
      openOrdersCount: 0,
      pendingRoutineCount: 0,
      hasPreviousActiveChecklist: false,
    });

    expect(commands[0]).toMatchObject({
      key: 'checklist',
      metric: '0%',
      href: '/checklist',
    });
  });

  it('shows checklist, missing orders, open orders and routine work together', () => {
    const commands = buildDashboardCommandItems({
      hasCurrentChecklist: true,
      checklistStatus: 'in_progress',
      checkedCount: 25,
      totalCount: 100,
      waitingMissingCount: 3,
      openOrdersCount: 2,
      pendingRoutineCount: 1,
      hasPreviousActiveChecklist: false,
    });

    expect(commands.map((command) => command.key)).toEqual([
      'checklist',
      'orders',
      'orders',
      'routine',
    ]);
    expect(commands[0].metric).toBe('25%');
  });

  it('shows done state when no action is pending', () => {
    const commands = buildDashboardCommandItems({
      hasCurrentChecklist: true,
      checklistStatus: 'completed',
      checkedCount: 100,
      totalCount: 100,
      waitingMissingCount: 0,
      openOrdersCount: 0,
      pendingRoutineCount: 0,
      hasPreviousActiveChecklist: false,
    });

    expect(commands).toHaveLength(1);
    expect(commands[0].key).toBe('done');
  });
});
