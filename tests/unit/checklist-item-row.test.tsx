// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChecklistItemRow } from '@/components/checklist/checklist-item-row';
import type { ChecklistItemDraftState } from '@/lib/utils/checklist-batch';

const baseItem = {
  id: 'item-1',
  checklist_id: 'checklist-1',
  product_name: 'Cola',
  min_stock_snapshot: 2,
  min_stock_max_snapshot: null,
  products: {
    unit: 'koli',
  },
};

const baseState: ChecklistItemDraftState = {
  currentStock: '',
  isMissing: false,
  isChecked: false,
  dirty: false,
  saveState: 'idle',
  revision: 0,
};

function renderRow(state: Partial<ChecklistItemDraftState> = {}) {
  const handlers = {
    onStockChange: vi.fn(),
    onStockBlur: vi.fn(),
    onMissingToggle: vi.fn(),
    onCheckToggle: vi.fn(),
  };

  render(
    <ChecklistItemRow
      item={baseItem}
      state={{ ...baseState, ...state }}
      isReadOnly={false}
      {...handlers}
    />
  );

  return handlers;
}

describe('ChecklistItemRow', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows checked items without striking through the product name', () => {
    renderRow({ isChecked: true });

    expect(screen.queryByText('Geprüft')).toBeNull();
    expect(screen.getByText('Cola').className).not.toContain('line-through');
  });

  it('makes missing items visually explicit', () => {
    renderRow({ isMissing: true });

    expect(screen.getAllByText('Fehlt').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Fehlt' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps Bestand as a short free text field', () => {
    const handlers = renderRow({ currentStock: '3 Stück im offenen Karton' });
    const input = screen.getByRole('textbox', { name: 'Bestand' }) as HTMLInputElement;

    expect(input.maxLength).toBe(100);
    expect(input.inputMode).toBe('text');
    expect(input.value).toBe('3 Stück im offenen Karton');

    fireEvent.change(input, { target: { value: 'Karton offen, ca. 3 Stück übrig' } });

    expect(handlers.onStockChange).toHaveBeenCalledWith('Karton offen, ca. 3 Stück übrig');
  });
});
