import { describe, it, expect } from 'vitest';
import { getISOWeekAndYear, formatDateVienna, formatDateTimeVienna } from '@/lib/utils/date';

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
