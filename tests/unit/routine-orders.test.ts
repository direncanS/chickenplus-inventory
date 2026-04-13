import { describe, it, expect } from 'vitest';
import { getScheduledDateForDay, getISOWeekMonday } from '@/lib/utils/date';
import {
  createRoutineOrderSchema,
  updateRoutineOrderSchema,
  addRoutineOrderItemSchema,
  removeRoutineOrderItemSchema,
  adjustRoutineInstanceItemSchema,
  generateRoutineInstancesSchema,
  confirmRoutineInstanceSchema,
  skipRoutineInstanceSchema,
} from '@/lib/validations/routine-order';
import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS } from '@/lib/constants';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '660e8400-e29b-41d4-a716-446655440001';

// ── getScheduledDateForDay ──

describe('getScheduledDateForDay', () => {
  // 2026-04-13 is a Monday (ISO week start)
  const weekStart = '2026-04-13';

  it('returns Monday for montag', () => {
    expect(getScheduledDateForDay(weekStart, 'montag')).toBe('2026-04-13');
  });

  it('returns Tuesday for dienstag', () => {
    expect(getScheduledDateForDay(weekStart, 'dienstag')).toBe('2026-04-14');
  });

  it('returns Wednesday for mittwoch', () => {
    expect(getScheduledDateForDay(weekStart, 'mittwoch')).toBe('2026-04-15');
  });

  it('returns Thursday for donnerstag', () => {
    expect(getScheduledDateForDay(weekStart, 'donnerstag')).toBe('2026-04-16');
  });

  it('returns Friday for freitag', () => {
    expect(getScheduledDateForDay(weekStart, 'freitag')).toBe('2026-04-17');
  });

  it('returns Saturday for samstag', () => {
    expect(getScheduledDateForDay(weekStart, 'samstag')).toBe('2026-04-18');
  });

  it('returns Sunday for sonntag', () => {
    expect(getScheduledDateForDay(weekStart, 'sonntag')).toBe('2026-04-19');
  });

  it('handles month boundary (week starting in March ending in April)', () => {
    const marchWeek = '2026-03-30'; // Monday
    expect(getScheduledDateForDay(marchWeek, 'freitag')).toBe('2026-04-03');
    expect(getScheduledDateForDay(marchWeek, 'sonntag')).toBe('2026-04-05');
  });

  it('handles year boundary (week starting in Dec ending in Jan)', () => {
    // 2025-12-29 is a Monday (ISO week 1 of 2026)
    const decWeek = '2025-12-29';
    expect(getScheduledDateForDay(decWeek, 'montag')).toBe('2025-12-29');
    expect(getScheduledDateForDay(decWeek, 'donnerstag')).toBe('2026-01-01');
    expect(getScheduledDateForDay(decWeek, 'sonntag')).toBe('2026-01-04');
  });
});

// ── getISOWeekMonday ──

describe('getISOWeekMonday', () => {
  it('returns correct Monday for week 1 of 2026', () => {
    // ISO week 1 of 2026 starts on Monday Dec 29, 2025
    expect(getISOWeekMonday(2026, 1)).toBe('2025-12-29');
  });

  it('returns correct Monday for week 16 of 2026', () => {
    // Week 16 of 2026 starts on Monday April 13
    expect(getISOWeekMonday(2026, 16)).toBe('2026-04-13');
  });

  it('returns correct Monday for week 52 of 2025', () => {
    // Week 52 of 2025 starts on Monday Dec 22, 2025
    expect(getISOWeekMonday(2025, 52)).toBe('2025-12-22');
  });

  it('returns correct Monday for mid-year week', () => {
    // Week 26 of 2026 starts on Monday June 22
    expect(getISOWeekMonday(2026, 26)).toBe('2026-06-22');
  });

  it('returns a Monday (day 1)', () => {
    const monday = getISOWeekMonday(2026, 10);
    const date = new Date(monday + 'T12:00:00');
    expect(date.getDay()).toBe(1); // 1 = Monday
  });
});

// ── DAYS_OF_WEEK constants ──

describe('DAYS_OF_WEEK', () => {
  it('has 7 days', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
  });

  it('starts with montag', () => {
    expect(DAYS_OF_WEEK[0]).toBe('montag');
  });

  it('ends with sonntag', () => {
    expect(DAYS_OF_WEEK[6]).toBe('sonntag');
  });

  it('has labels for all days', () => {
    for (const day of DAYS_OF_WEEK) {
      expect(DAY_OF_WEEK_LABELS[day]).toBeDefined();
      expect(DAY_OF_WEEK_LABELS[day].length).toBeGreaterThan(0);
    }
  });
});

// ── Validation schemas ──

describe('createRoutineOrderSchema', () => {
  it('accepts valid input', () => {
    const result = createRoutineOrderSchema.safeParse({
      supplierId: validUUID,
      dayOfWeek: 'montag',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with notes', () => {
    const result = createRoutineOrderSchema.safeParse({
      supplierId: validUUID,
      dayOfWeek: 'freitag',
      notes: 'Wöchentliche Bestellung',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid day of week', () => {
    const result = createRoutineOrderSchema.safeParse({
      supplierId: validUUID,
      dayOfWeek: 'monday',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID', () => {
    const result = createRoutineOrderSchema.safeParse({
      supplierId: 'not-a-uuid',
      dayOfWeek: 'montag',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing supplierId', () => {
    const result = createRoutineOrderSchema.safeParse({
      dayOfWeek: 'montag',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid days of week', () => {
    for (const day of DAYS_OF_WEEK) {
      const result = createRoutineOrderSchema.safeParse({
        supplierId: validUUID,
        dayOfWeek: day,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateRoutineOrderSchema', () => {
  it('accepts isActive update', () => {
    const result = updateRoutineOrderSchema.safeParse({
      routineId: validUUID,
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts notes update', () => {
    const result = updateRoutineOrderSchema.safeParse({
      routineId: validUUID,
      notes: 'Neue Notiz',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing routineId', () => {
    const result = updateRoutineOrderSchema.safeParse({
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('addRoutineOrderItemSchema', () => {
  it('accepts valid input', () => {
    const result = addRoutineOrderItemSchema.safeParse({
      routineOrderId: validUUID,
      productId: validUUID2,
      defaultQuantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts decimal quantity', () => {
    const result = addRoutineOrderItemSchema.safeParse({
      routineOrderId: validUUID,
      productId: validUUID2,
      defaultQuantity: 2.5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = addRoutineOrderItemSchema.safeParse({
      routineOrderId: validUUID,
      productId: validUUID2,
      defaultQuantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = addRoutineOrderItemSchema.safeParse({
      routineOrderId: validUUID,
      productId: validUUID2,
      defaultQuantity: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe('removeRoutineOrderItemSchema', () => {
  it('accepts valid UUID', () => {
    const result = removeRoutineOrderItemSchema.safeParse({ itemId: validUUID });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID', () => {
    const result = removeRoutineOrderItemSchema.safeParse({ itemId: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('adjustRoutineInstanceItemSchema', () => {
  it('accepts quantity adjustment', () => {
    const result = adjustRoutineInstanceItemSchema.safeParse({
      itemId: validUUID,
      adjustedQuantity: 15,
    });
    expect(result.success).toBe(true);
  });

  it('accepts inclusion toggle', () => {
    const result = adjustRoutineInstanceItemSchema.safeParse({
      itemId: validUUID,
      isIncluded: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null to reset quantity', () => {
    const result = adjustRoutineInstanceItemSchema.safeParse({
      itemId: validUUID,
      adjustedQuantity: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = adjustRoutineInstanceItemSchema.safeParse({
      itemId: validUUID,
      adjustedQuantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = adjustRoutineInstanceItemSchema.safeParse({
      itemId: validUUID,
      adjustedQuantity: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('generateRoutineInstancesSchema', () => {
  it('accepts valid input', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 16,
      weekStartDate: '2026-04-13',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with checklistId', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 16,
      weekStartDate: '2026-04-13',
      checklistId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null checklistId', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 16,
      weekStartDate: '2026-04-13',
      checklistId: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects week 0', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 0,
      weekStartDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects week 54', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 54,
      weekStartDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = generateRoutineInstancesSchema.safeParse({
      isoYear: 2026,
      isoWeek: 16,
      weekStartDate: '13.04.2026',
    });
    expect(result.success).toBe(false);
  });
});

describe('confirmRoutineInstanceSchema', () => {
  it('accepts valid input', () => {
    const result = confirmRoutineInstanceSchema.safeParse({
      instanceId: validUUID,
      checklistId: validUUID2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing checklistId', () => {
    const result = confirmRoutineInstanceSchema.safeParse({
      instanceId: validUUID,
    });
    expect(result.success).toBe(false);
  });
});

describe('skipRoutineInstanceSchema', () => {
  it('accepts valid input', () => {
    const result = skipRoutineInstanceSchema.safeParse({
      instanceId: validUUID,
      checklistId: validUUID2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing instanceId', () => {
    const result = skipRoutineInstanceSchema.safeParse({
      checklistId: validUUID,
    });
    expect(result.success).toBe(false);
  });
});
