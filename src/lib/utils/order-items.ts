export interface OrderedItemSource {
  id: string;
  quantity: number;
  is_ordered?: boolean | null;
  ordered_quantity?: number | null;
}

export interface OrderedItemDraftState {
  isOrdered: boolean;
  orderedQuantity: string;
}

export interface OrderedItemUpdate {
  orderItemId: string;
  isOrdered: boolean;
  orderedQuantity: number | null;
}

type ParsedQuantity =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'value'; value: number };

export function formatQuantityForInput(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

export function createOrderedItemDraftState(
  items: OrderedItemSource[]
): Record<string, OrderedItemDraftState> {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        isOrdered: Boolean(item.is_ordered),
        orderedQuantity: formatQuantityForInput(item.ordered_quantity ?? null),
      },
    ])
  );
}

export function prefillOrderedQuantity(currentValue: string, suggestedQuantity: number): string {
  return currentValue.trim() === '' ? formatQuantityForInput(suggestedQuantity) : currentValue;
}

function parseOrderedQuantity(rawValue: string): ParsedQuantity {
  const normalized = rawValue.trim().replace(',', '.');

  if (normalized === '') {
    return { kind: 'empty' };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { kind: 'invalid' };
  }

  return { kind: 'value', value: parsed };
}

export function hasOrderedItemChanges(
  items: OrderedItemSource[],
  draftState: Record<string, OrderedItemDraftState>
): boolean {
  return items.some((item) => {
    const draft = draftState[item.id] ?? {
      isOrdered: Boolean(item.is_ordered),
      orderedQuantity: formatQuantityForInput(item.ordered_quantity ?? null),
    };

    const originalIsOrdered = Boolean(item.is_ordered);
    const originalOrderedQuantity = item.ordered_quantity == null ? null : Number(item.ordered_quantity);

    if (draft.isOrdered !== originalIsOrdered) {
      return true;
    }

    if (!draft.isOrdered) {
      return originalOrderedQuantity !== null;
    }

    const parsed = parseOrderedQuantity(draft.orderedQuantity);
    if (parsed.kind !== 'value') {
      return true;
    }

    return originalOrderedQuantity !== parsed.value;
  });
}

export function buildOrderedItemUpdates(
  items: OrderedItemSource[],
  draftState: Record<string, OrderedItemDraftState>
):
  | { success: true; data: OrderedItemUpdate[] }
  | { success: false; error: 'ordered_quantity_required' | 'ordered_quantity_invalid' } {
  const updates: OrderedItemUpdate[] = [];

  for (const item of items) {
    const draft = draftState[item.id] ?? {
      isOrdered: Boolean(item.is_ordered),
      orderedQuantity: formatQuantityForInput(item.ordered_quantity ?? null),
    };

    const originalIsOrdered = Boolean(item.is_ordered);
    const originalOrderedQuantity = item.ordered_quantity == null ? null : Number(item.ordered_quantity);

    if (!draft.isOrdered) {
      if (originalIsOrdered || originalOrderedQuantity !== null) {
        updates.push({
          orderItemId: item.id,
          isOrdered: false,
          orderedQuantity: null,
        });
      }
      continue;
    }

    const parsed = parseOrderedQuantity(draft.orderedQuantity);
    if (parsed.kind === 'empty') {
      return { success: false, error: 'ordered_quantity_required' };
    }
    if (parsed.kind === 'invalid') {
      return { success: false, error: 'ordered_quantity_invalid' };
    }

    if (!originalIsOrdered || originalOrderedQuantity !== parsed.value) {
      updates.push({
        orderItemId: item.id,
        isOrdered: true,
        orderedQuantity: parsed.value,
      });
    }
  }

  return { success: true, data: updates };
}
