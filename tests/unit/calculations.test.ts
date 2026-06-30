import { describe, it, expect } from 'vitest';
import {
  calculateMissing,
  isBelowMinimum,
  suggestedOrderQuantity,
} from '@/lib/utils/calculations';

describe('calculateMissing', () => {
  it('returns 0 when currentStock is null', () => {
    expect(calculateMissing(null, 5)).toBe(0);
  });

  it('returns 0 when minStock is null', () => {
    expect(calculateMissing(3, null)).toBe(0);
  });

  it('returns 0 when both are null', () => {
    expect(calculateMissing(null, null)).toBe(0);
  });

  it('returns 0 when stock >= minStock', () => {
    expect(calculateMissing(10, 5)).toBe(0);
    expect(calculateMissing(5, 5)).toBe(0);
  });

  it('returns difference when stock < minStock', () => {
    expect(calculateMissing(3, 10)).toBe(7);
    expect(calculateMissing(0, 5)).toBe(5);
  });

  it('handles zero stock', () => {
    expect(calculateMissing(0, 0)).toBe(0);
    expect(calculateMissing(0, 10)).toBe(10);
  });

  it('never returns negative', () => {
    expect(calculateMissing(100, 5)).toBe(0);
  });

  it('handles decimal values', () => {
    expect(calculateMissing(2.5, 5)).toBe(2.5);
    expect(calculateMissing(5.5, 5)).toBe(0);
  });
});

describe('isBelowMinimum', () => {
  it('returns false when currentStock is null', () => {
    expect(isBelowMinimum(null, 5)).toBe(false);
  });

  it('returns false when minStock is null', () => {
    expect(isBelowMinimum(3, null)).toBe(false);
  });

  it('returns true when below minimum', () => {
    expect(isBelowMinimum(3, 10)).toBe(true);
    expect(isBelowMinimum(0, 1)).toBe(true);
  });

  it('returns false when at or above minimum', () => {
    expect(isBelowMinimum(5, 5)).toBe(false);
    expect(isBelowMinimum(10, 5)).toBe(false);
  });
});

describe('suggestedOrderQuantity', () => {
  it('returns 0 when currentStock is null', () => {
    expect(suggestedOrderQuantity(null, 5, null)).toBe(0);
  });

  it('returns 0 when minStock is null', () => {
    expect(suggestedOrderQuantity(3, null, null)).toBe(0);
  });

  it('uses minStock when minStockMax is null', () => {
    expect(suggestedOrderQuantity(3, 10, null)).toBe(7);
    expect(suggestedOrderQuantity(10, 10, null)).toBe(0);
  });

  it('uses minStockMax when available', () => {
    // Stock is 2, minStock is 3, minStockMax is 4 → order 4-2 = 2
    expect(suggestedOrderQuantity(2, 3, 4)).toBe(2);
  });

  it('returns 0 when stock >= target', () => {
    expect(suggestedOrderQuantity(5, 3, 4)).toBe(0);
    expect(suggestedOrderQuantity(4, 3, 4)).toBe(0);
  });

  it('never returns negative', () => {
    expect(suggestedOrderQuantity(100, 5, 10)).toBe(0);
  });

  it('handles real scenario: Pommesbox (3-4 Karton)', () => {
    // Current stock: 1, min: 3, max: 4
    expect(suggestedOrderQuantity(1, 3, 4)).toBe(3); // order up to 4
    // Current stock: 2, min: 3, max: 4
    expect(suggestedOrderQuantity(2, 3, 4)).toBe(2); // order up to 4
    // Current stock: 3, min: 3, max: 4
    expect(suggestedOrderQuantity(3, 3, 4)).toBe(1); // order up to 4
    // Current stock: 4, min: 3, max: 4
    expect(suggestedOrderQuantity(4, 3, 4)).toBe(0); // at max, no order
  });
});
