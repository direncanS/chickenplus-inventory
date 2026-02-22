import { describe, it, expect } from 'vitest';
import { sanitizeExcelValue } from '@/lib/utils/excel-export';

describe('sanitizeExcelValue', () => {
  it('returns null for null', () => {
    expect(sanitizeExcelValue(null)).toBe(null);
  });

  it('returns null for undefined', () => {
    expect(sanitizeExcelValue(undefined)).toBe(null);
  });

  it('returns number as-is', () => {
    expect(sanitizeExcelValue(42)).toBe(42);
    expect(sanitizeExcelValue(3.14)).toBe(3.14);
  });

  it('returns safe strings as-is', () => {
    expect(sanitizeExcelValue('Hello')).toBe('Hello');
    expect(sanitizeExcelValue('Kühlhaus')).toBe('Kühlhaus');
  });

  it('prefixes = with single quote', () => {
    expect(sanitizeExcelValue('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it('prefixes + with single quote', () => {
    expect(sanitizeExcelValue('+1234')).toBe("'+1234");
  });

  it('prefixes - with single quote', () => {
    expect(sanitizeExcelValue('-1234')).toBe("'-1234");
  });

  it('prefixes @ with single quote', () => {
    expect(sanitizeExcelValue('@import')).toBe("'@import");
  });

  it('does not prefix safe strings starting with letters', () => {
    expect(sanitizeExcelValue('Apfel')).toBe('Apfel');
    expect(sanitizeExcelValue('1234')).toBe('1234');
  });

  it('handles German special characters', () => {
    expect(sanitizeExcelValue('Kühlhaus')).toBe('Kühlhaus');
    expect(sanitizeExcelValue('Soßen')).toBe('Soßen');
    expect(sanitizeExcelValue('Gemüse')).toBe('Gemüse');
    expect(sanitizeExcelValue('Zubehör')).toBe('Zubehör');
  });
});
