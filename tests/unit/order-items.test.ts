import { describe, expect, it } from 'vitest';
import {
  buildOrderedItemUpdates,
  createOrderedItemDraftState,
  hasOrderedItemChanges,
  prefillOrderedQuantity,
} from '@/lib/utils/order-items';

const items = [
  {
    id: 'item-1',
    quantity: 5,
    is_ordered: false,
    ordered_quantity: null,
  },
  {
    id: 'item-2',
    quantity: 2,
    is_ordered: true,
    ordered_quantity: 1,
  },
];

describe('order item draft helpers', () => {
  it('creates draft state from persisted values', () => {
    const result = createOrderedItemDraftState(items);

    expect(result['item-1']).toEqual({ isOrdered: false, orderedQuantity: '' });
    expect(result['item-2']).toEqual({ isOrdered: true, orderedQuantity: '1' });
  });

  it('prefills suggested quantity when field is empty', () => {
    expect(prefillOrderedQuantity('', 4)).toBe('4');
    expect(prefillOrderedQuantity('2', 4)).toBe('2');
  });

  it('detects changes in ordered metadata', () => {
    const draft = createOrderedItemDraftState(items);
    draft['item-1'] = { isOrdered: true, orderedQuantity: '5' };

    expect(hasOrderedItemChanges(items, draft)).toBe(true);
  });

  it('builds update payload for changed rows only', () => {
    const draft = createOrderedItemDraftState(items);
    draft['item-1'] = { isOrdered: true, orderedQuantity: '5' };
    draft['item-2'] = { isOrdered: false, orderedQuantity: '' };

    const result = buildOrderedItemUpdates(items, draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        { orderItemId: 'item-1', isOrdered: true, orderedQuantity: 5 },
        { orderItemId: 'item-2', isOrdered: false, orderedQuantity: null },
      ]);
    }
  });

  it('rejects checked rows without quantity', () => {
    const draft = createOrderedItemDraftState(items);
    draft['item-1'] = { isOrdered: true, orderedQuantity: '' };

    const result = buildOrderedItemUpdates(items, draft);
    expect(result).toEqual({ success: false, error: 'ordered_quantity_required' });
  });

  it('rejects invalid quantities', () => {
    const draft = createOrderedItemDraftState(items);
    draft['item-1'] = { isOrdered: true, orderedQuantity: '0' };

    const result = buildOrderedItemUpdates(items, draft);
    expect(result).toEqual({ success: false, error: 'ordered_quantity_invalid' });
  });
});
