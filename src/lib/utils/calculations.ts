/**
 * Calculate missing amount: max(0, minStock - currentStock)
 */
export function calculateMissing(
  currentStock: number | null,
  minStock: number | null
): number {
  if (currentStock === null || minStock === null) return 0;
  return Math.max(0, minStock - currentStock);
}

/**
 * Check if current stock is below minimum stock level
 */
export function isBelowMinimum(
  currentStock: number | null,
  minStock: number | null
): boolean {
  if (currentStock === null || minStock === null) return false;
  return currentStock < minStock;
}

/**
 * Calculate suggested order quantity.
 * If minStockMax exists: max(0, minStockMax - currentStock)
 * Otherwise: max(0, minStock - currentStock)
 */
export function suggestedOrderQuantity(
  currentStock: number | null,
  minStock: number | null,
  minStockMax: number | null
): number {
  if (currentStock === null || minStock === null) return 0;

  const target = minStockMax ?? minStock;
  return Math.max(0, target - currentStock);
}
