import { describe, it, expect } from 'vitest';
import { reportDateRangeSchema } from '@/lib/validations/reports';

describe('reportDateRangeSchema', () => {
  it('accepts valid date range', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
    expect(result.success).toBe(true);
  });

  it('accepts same start and end date', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '2026-03-15',
      endDate: '2026-03-15',
    });
    expect(result.success).toBe(true);
  });

  it('rejects start date after end date', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '2026-04-01',
      endDate: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format (DD.MM.YYYY)', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '01.01.2026',
      endDate: '31.03.2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing startDate', () => {
    const result = reportDateRangeSchema.safeParse({
      endDate: '2026-03-31',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing endDate', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty strings', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '',
      endDate: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string values', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: 20260101,
      endDate: 20260331,
    });
    expect(result.success).toBe(false);
  });

  it('rejects date without dashes', () => {
    const result = reportDateRangeSchema.safeParse({
      startDate: '20260101',
      endDate: '20260331',
    });
    expect(result.success).toBe(false);
  });
});
