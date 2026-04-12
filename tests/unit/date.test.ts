import { describe, it, expect } from 'vitest';
import {
  getISOWeekAndYear,
  formatDateVienna,
  formatDateTimeVienna,
  getTodayVienna,
  getCurrentMonthRange,
  isInCurrentMonth,
  formatDateGerman,
  getWeekRange,
  getCurrentWeekRange,
  isDateInWeekRange,
  isCurrentWeek,
  formatWeekRangeGerman,
} from '@/lib/utils/date';

describe('getISOWeekAndYear', () => {
  it('returns correct week for a regular date', () => {
    // Monday, Jan 6 2025 = Week 2, 2025
    const result = getISOWeekAndYear(new Date('2025-01-06T12:00:00Z'));
    expect(result.isoYear).toBe(2025);
    expect(result.isoWeek).toBe(2);
  });

  it('handles year boundary: Dec 29 2025 → Week 1, 2026', () => {
    // Dec 29, 2025 is a Monday → ISO week 1 of 2026
    const result = getISOWeekAndYear(new Date('2025-12-29T12:00:00Z'));
    expect(result.isoYear).toBe(2026);
    expect(result.isoWeek).toBe(1);
  });

  it('handles Jan 1 that belongs to previous year week', () => {
    // Jan 1, 2027 is a Friday → ISO week 53 of 2026
    const result = getISOWeekAndYear(new Date('2027-01-01T12:00:00Z'));
    expect(result.isoYear).toBe(2026);
    expect(result.isoWeek).toBe(53);
  });

  it('returns week 1 for Jan 4 (always week 1)', () => {
    // Jan 4 is always in ISO week 1
    const result = getISOWeekAndYear(new Date('2025-01-04T12:00:00Z'));
    expect(result.isoYear).toBe(2025);
    expect(result.isoWeek).toBe(1);
  });

  it('handles mid-year date', () => {
    // June 15 2025 is a Sunday → ISO week 24
    const result = getISOWeekAndYear(new Date('2025-06-15T12:00:00Z'));
    expect(result.isoYear).toBe(2025);
    expect(result.isoWeek).toBe(24);
  });

  it('week is between 1 and 53', () => {
    const result = getISOWeekAndYear(new Date());
    expect(result.isoWeek).toBeGreaterThanOrEqual(1);
    expect(result.isoWeek).toBeLessThanOrEqual(53);
  });
});

describe('formatDateVienna', () => {
  it('formats a Date object in de-AT locale', () => {
    const result = formatDateVienna(new Date('2025-03-15T12:00:00Z'));
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('formats a string date', () => {
    const result = formatDateVienna('2025-06-20T10:00:00Z');
    expect(result).toContain('20');
    expect(result).toContain('2025');
  });

  it('accepts custom options', () => {
    const result = formatDateVienna('2025-12-25T00:00:00Z', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    expect(result).toContain('Dezember');
    expect(result).toContain('2025');
  });
});

describe('formatDateTimeVienna', () => {
  it('formats a Date object with time', () => {
    // 14:30 UTC = 15:30 Vienna (CET = UTC+1) or 16:30 (CEST = UTC+2)
    const result = formatDateTimeVienna(new Date('2025-01-15T14:30:00Z'));
    expect(result).toContain('15');
    expect(result).toContain('2025');
    // Should contain time component
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('formats a string date with time', () => {
    const result = formatDateTimeVienna('2025-06-15T08:00:00Z');
    expect(result).toContain('15');
    expect(result).toContain('06');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('returns a non-empty string', () => {
    const result = formatDateTimeVienna(new Date());
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getTodayVienna', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getTodayVienna();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a valid date', () => {
    const result = getTodayVienna();
    const parsed = new Date(result + 'T12:00:00');
    expect(parsed.toString()).not.toBe('Invalid Date');
  });

  it('returns current year', () => {
    const result = getTodayVienna();
    const year = parseInt(result.split('-')[0]);
    const currentYear = new Date().getFullYear();
    // Allow for timezone edge case at year boundary
    expect(Math.abs(year - currentYear)).toBeLessThanOrEqual(1);
  });
});

describe('getCurrentMonthRange', () => {
  it('returns minDate as first day of month', () => {
    const { minDate } = getCurrentMonthRange();
    expect(minDate).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('returns maxDate as last day of month', () => {
    const { maxDate } = getCurrentMonthRange();
    expect(maxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Last day should be between 28 and 31
    const day = parseInt(maxDate.split('-')[2]);
    expect(day).toBeGreaterThanOrEqual(28);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('minDate and maxDate are in the same month', () => {
    const { minDate, maxDate } = getCurrentMonthRange();
    const minMonth = minDate.substring(0, 7); // YYYY-MM
    const maxMonth = maxDate.substring(0, 7);
    expect(minMonth).toBe(maxMonth);
  });

  it('minDate is before or equal to maxDate', () => {
    const { minDate, maxDate } = getCurrentMonthRange();
    expect(minDate <= maxDate).toBe(true);
  });
});

describe('isInCurrentMonth', () => {
  it('returns true for today', () => {
    const today = getTodayVienna();
    expect(isInCurrentMonth(today)).toBe(true);
  });

  it('returns true for first day of current month', () => {
    const { minDate } = getCurrentMonthRange();
    expect(isInCurrentMonth(minDate)).toBe(true);
  });

  it('returns true for last day of current month', () => {
    const { maxDate } = getCurrentMonthRange();
    expect(isInCurrentMonth(maxDate)).toBe(true);
  });

  it('returns false for a date in a different year', () => {
    expect(isInCurrentMonth('2020-01-15')).toBe(false);
  });

  it('returns false for a date in a different month', () => {
    const today = getTodayVienna();
    const [year, month] = today.split('-').map(Number);
    const differentMonth = month === 1 ? 12 : month - 1;
    const differentYear = month === 1 ? year - 1 : year;
    const dateStr = `${differentYear}-${String(differentMonth).padStart(2, '0')}-15`;
    expect(isInCurrentMonth(dateStr)).toBe(false);
  });
});

describe('formatDateGerman', () => {
  it('formats YYYY-MM-DD as DD.MM.YYYY', () => {
    expect(formatDateGerman('2026-04-04')).toBe('04.04.2026');
  });

  it('formats first day of year', () => {
    expect(formatDateGerman('2026-01-01')).toBe('01.01.2026');
  });

  it('formats last day of year', () => {
    expect(formatDateGerman('2026-12-31')).toBe('31.12.2026');
  });

  it('preserves leading zeros', () => {
    expect(formatDateGerman('2026-03-05')).toBe('05.03.2026');
  });
});

describe('getWeekRange', () => {
  it('returns Sunday-Saturday for a Wednesday', () => {
    // April 15, 2026 is a Wednesday
    const result = getWeekRange(new Date('2026-04-15T12:00:00'));
    expect(result.startDate).toBe('2026-04-12'); // Sunday
    expect(result.endDate).toBe('2026-04-18');   // Saturday
  });

  it('returns same week for a Sunday', () => {
    // April 12, 2026 is a Sunday
    const result = getWeekRange(new Date('2026-04-12T12:00:00'));
    expect(result.startDate).toBe('2026-04-12');
    expect(result.endDate).toBe('2026-04-18');
  });

  it('returns same week for a Saturday', () => {
    // April 18, 2026 is a Saturday
    const result = getWeekRange(new Date('2026-04-18T12:00:00'));
    expect(result.startDate).toBe('2026-04-12');
    expect(result.endDate).toBe('2026-04-18');
  });

  it('handles month boundary', () => {
    // March 30, 2026 is a Monday → week starts March 29 (Sunday)
    const result = getWeekRange(new Date('2026-03-30T12:00:00'));
    expect(result.startDate).toBe('2026-03-29');
    expect(result.endDate).toBe('2026-04-04');
  });

  it('end date is exactly 6 days after start date', () => {
    const result = getWeekRange(new Date('2026-06-10T12:00:00'));
    const start = new Date(result.startDate + 'T12:00:00');
    const end = new Date(result.endDate + 'T12:00:00');
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(6);
  });
});

describe('getCurrentWeekRange', () => {
  it('returns dates in YYYY-MM-DD format', () => {
    const result = getCurrentWeekRange();
    expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('startDate is before or equal to endDate', () => {
    const result = getCurrentWeekRange();
    expect(result.startDate <= result.endDate).toBe(true);
  });
});

describe('isDateInWeekRange', () => {
  it('returns true for date within range', () => {
    expect(isDateInWeekRange('2026-04-15', '2026-04-12', '2026-04-18')).toBe(true);
  });

  it('returns true for start date', () => {
    expect(isDateInWeekRange('2026-04-12', '2026-04-12', '2026-04-18')).toBe(true);
  });

  it('returns true for end date', () => {
    expect(isDateInWeekRange('2026-04-18', '2026-04-12', '2026-04-18')).toBe(true);
  });

  it('returns false for date before range', () => {
    expect(isDateInWeekRange('2026-04-11', '2026-04-12', '2026-04-18')).toBe(false);
  });

  it('returns false for date after range', () => {
    expect(isDateInWeekRange('2026-04-19', '2026-04-12', '2026-04-18')).toBe(false);
  });
});

describe('isCurrentWeek', () => {
  it('returns true for current week range', () => {
    const { startDate, endDate } = getCurrentWeekRange();
    expect(isCurrentWeek(startDate, endDate)).toBe(true);
  });

  it('returns false for a past week', () => {
    expect(isCurrentWeek('2020-01-05', '2020-01-11')).toBe(false);
  });
});

describe('formatWeekRangeGerman', () => {
  it('formats as DD.MM - DD.MM.YYYY', () => {
    const result = formatWeekRangeGerman('2026-04-12', '2026-04-18');
    expect(result).toBe('12.04 - 18.04.2026');
  });

  it('handles month boundary', () => {
    const result = formatWeekRangeGerman('2026-03-29', '2026-04-04');
    expect(result).toBe('29.03 - 04.04.2026');
  });

  it('handles year boundary', () => {
    const result = formatWeekRangeGerman('2025-12-28', '2026-01-03');
    expect(result).toBe('28.12 - 03.01.2026');
  });
});
