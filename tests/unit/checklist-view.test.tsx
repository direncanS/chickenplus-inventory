// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChecklistView } from '@/components/checklist/checklist-view';

const {
  refreshMock,
  toastErrorMock,
  toastSuccessMock,
  toastInfoMock,
  updateChecklistItemsBatchMock,
  completeChecklistMock,
  reopenChecklistMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastInfoMock: vi.fn(),
  updateChecklistItemsBatchMock: vi.fn(),
  completeChecklistMock: vi.fn(),
  reopenChecklistMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
    info: toastInfoMock,
  },
}));

vi.mock('@/app/(app)/checklist/actions', () => ({
  updateChecklistItemsBatch: (...args: unknown[]) => updateChecklistItemsBatchMock(...args),
  completeChecklist: (...args: unknown[]) => completeChecklistMock(...args),
  reopenChecklist: (...args: unknown[]) => reopenChecklistMock(...args),
}));

describe('ChecklistView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    refreshMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    toastInfoMock.mockReset();
    updateChecklistItemsBatchMock.mockReset();
    completeChecklistMock.mockReset();
    reopenChecklistMock.mockReset();
    updateChecklistItemsBatchMock.mockResolvedValue({
      success: true,
      updatedItemIds: ['item-1', 'item-2'],
      checklistStatus: 'in_progress',
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.useRealTimers();
  });

  function renderThreeProductFixture(strict = false) {
    const locations = [
      ['D', 'Dry', 1],
      ['C', 'Cool', 2],
    ] as const;
    const items = ([
      ['item-1', 'Bowl', 'D', 1],
      ['item-2', 'Bowl Deckel', 'D', 2],
      ['item-3', 'Napkin', 'C', 3],
    ] as Array<[string, string, 'D' | 'C', number]>).map(([id, name, code, sort_order], index) => ({
      id, checklist_id: 'checklist-1', product_id: `product-${index + 1}`, product_name: name,
      min_stock_snapshot: 1, min_stock_max_snapshot: null, current_stock: null,
      is_missing: false, is_checked: false,
      products: {
        sort_order, complement_of_id: null, unit: 'karton',
        storage_locations: { name: locations.find(([locationCode]) => locationCode === code)![1], code, sort_order: code === 'D' ? 1 : 2 },
        categories: { name: 'Packaging', sort_order: 1 },
      },
    }));
    const view = <ChecklistView checklist={{ id: 'checklist-1', iso_year: 2026, iso_week: 14, status: 'draft', order_generation_status: 'idle', order_generation_orders_created: 0, order_generation_error: null }} items={items} isAdmin={false} />;
    return render(strict ? <React.StrictMode>{view}</React.StrictMode> : view);
  }

  it('combines product search and location filters, and resets zero results', async () => {
    renderThreeProductFixture();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Produkt suchen' }), { target: { value: 'Deckel' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Lagerort' }), { target: { value: 'D' } });
    expect(screen.getByText('Bowl Deckel')).toBeTruthy();
    expect(screen.queryByText('Napkin')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Produkt suchen' }), { target: { value: 'kein Treffer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(screen.getAllByText('3 Produkte').length).toBeGreaterThan(0);
    expect(screen.getByText('Napkin')).toBeTruthy();
  });

  it('keeps free text and independent flags while navigating single mode', async () => {
    renderThreeProductFixture();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Einzeln' })); });
    const first = screen.getByRole('textbox', { name: 'Bestand: Bowl' }) as HTMLInputElement;
    await act(async () => { fireEvent.change(first, { target: { value: '2 Pkg. + Rest' } }); });
    await act(async () => { fireEvent.keyDown(first, { key: 'Enter' }); });
    const second = screen.getByRole('textbox', { name: 'Bestand: Bowl Deckel' });
    expect(document.activeElement).toBe(second);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Zurück' })); });
    expect((screen.getByRole('textbox', { name: 'Bestand: Bowl' }) as HTMLInputElement).value).toBe('2 Pkg. + Rest');
    expect(screen.getByRole('button', { name: 'Fehlt: Bowl' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'Geprüft: Bowl' }).getAttribute('aria-checked')).toBe('false');
  });

  it('uses Enter to focus the next visible list product', async () => {
    renderThreeProductFixture();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Produkt suchen' }), { target: { value: 'Bowl' } });
    const first = screen.getByRole('textbox', { name: 'Bestand: Bowl' });
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Bestand: Bowl Deckel' }));
  });

  it('confirms bulk marking only for products matching the active search', async () => {
    renderThreeProductFixture();
    await act(async () => { fireEvent.change(screen.getByRole('searchbox', { name: 'Produkt suchen' }), { target: { value: 'Deckel' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sichtbare prüfen' })); });
    expect(screen.getByText('1 Produkte als geprüft markieren?')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Als geprüft markieren' }));
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith({ checklistId: 'checklist-1', items: [{ checklistItemId: 'item-2', currentStock: null, isMissing: false, isChecked: true }] });
  });

  it('keeps stock editing and autosave alive through StrictMode remounts', async () => {
    const { unmount } = renderThreeProductFixture(true);
    const input = screen.getByRole('textbox', { name: 'Bestand: Bowl' }) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: '2 Pkg. + Rest' } });
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(input.value).toBe('2 Pkg. + Rest');
    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([expect.objectContaining({ checklistItemId: 'item-1', currentStock: '2 Pkg. + Rest' })]),
    }));
    unmount();
  });

  it('updates progress instantly and batches rapid checkbox edits into one save', async () => {
    render(
      <ChecklistView
        checklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'draft',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        items={[
          {
            id: 'item-1',
            checklist_id: 'checklist-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 1,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
          {
            id: 'item-2',
            checklist_id: 'checklist-1',
            product_id: 'product-2',
            product_name: 'Fanta',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 2,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
        ]}
        isAdmin={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    await act(async () => {
      fireEvent.click(checkboxes[0]);
    });
    expect(screen.getAllByText(/1\/2/).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(checkboxes[1]);
    });
    expect(screen.getAllByText(/2\/2/).length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(updateChecklistItemsBatchMock).toHaveBeenCalledTimes(1);
    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith({
      checklistId: 'checklist-1',
      items: [
        {
          checklistItemId: 'item-1',
          currentStock: null,
          isMissing: false,
          isChecked: true,
        },
        {
          checklistItemId: 'item-2',
          currentStock: null,
          isMissing: false,
          isChecked: true,
        },
      ],
    });
  });

  it('flushes pending checklist changes on unmount before debounce fires', async () => {
    const { unmount } = render(
      <ChecklistView
        checklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'draft',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        items={[
          {
            id: 'item-1',
            checklist_id: 'checklist-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 1,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
        ]}
        isAdmin={false}
      />
    );

    const checkbox = screen.getAllByRole('checkbox')[0];
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(screen.getAllByText(/1\/1/).length).toBeGreaterThan(0);

    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    expect(updateChecklistItemsBatchMock).toHaveBeenCalledTimes(1);
    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith({
      checklistId: 'checklist-1',
      items: [
        {
          checklistItemId: 'item-1',
          currentStock: null,
          isMissing: false,
          isChecked: true,
        },
      ],
    });
  });

  it('marks only visible filtered rows as checked', async () => {
    render(
      <ChecklistView
        checklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'draft',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        items={[
          {
            id: 'item-1',
            checklist_id: 'checklist-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 1,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
          {
            id: 'item-2',
            checklist_id: 'checklist-1',
            product_id: 'product-2',
            product_name: 'Fanta',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: true,
            is_checked: false,
            products: {
              sort_order: 2,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
        ]}
        isAdmin={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Nur fehlende/ }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sichtbare prüfen' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Als geprüft markieren' }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith({
      checklistId: 'checklist-1',
      items: [
        {
          checklistItemId: 'item-2',
          currentStock: null,
          isMissing: true,
          isChecked: true,
        },
      ],
    });
  });

  it('keeps dirty checklist changes locally while offline and saves when online again', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(
      <ChecklistView
        checklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'draft',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        items={[
          {
            id: 'item-1',
            checklist_id: 'checklist-1',
            product_id: 'product-1',
            product_name: 'Cola',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 1,
              unit: 'koli',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Drinks', sort_order: 1 },
            },
          },
        ]}
        isAdmin={false}
      />
    );

    const checkbox = screen.getAllByRole('checkbox')[0];
    await act(async () => {
      fireEvent.click(checkbox);
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getAllByText(/Offline/).length).toBeGreaterThan(0);
    expect(updateChecklistItemsBatchMock).not.toHaveBeenCalled();

    await act(async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(updateChecklistItemsBatchMock).toHaveBeenCalledTimes(1);
    expect(updateChecklistItemsBatchMock).toHaveBeenCalledWith({
      checklistId: 'checklist-1',
      items: [
        {
          checklistItemId: 'item-1',
          currentStock: null,
          isMissing: false,
          isChecked: true,
        },
      ],
    });
  });

  it('renders a complement product directly after its base, ignoring its own sort_order', () => {
    const { container } = render(
      <ChecklistView
        checklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'draft',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        items={[
          {
            id: 'item-1',
            checklist_id: 'checklist-1',
            product_id: 'product-1',
            product_name: 'Bowl',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 1,
              complement_of_id: null,
              unit: 'karton',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Packaging', sort_order: 1 },
            },
          },
          {
            id: 'item-2',
            checklist_id: 'checklist-1',
            product_id: 'product-2',
            product_name: 'Napkin',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 2,
              complement_of_id: null,
              unit: 'karton',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Packaging', sort_order: 1 },
            },
          },
          {
            id: 'item-3',
            checklist_id: 'checklist-1',
            product_id: 'product-3',
            product_name: 'Deckel',
            min_stock_snapshot: 1,
            min_stock_max_snapshot: null,
            current_stock: null,
            is_missing: false,
            is_checked: false,
            products: {
              sort_order: 10,
              complement_of_id: 'product-1',
              unit: 'karton',
              storage_locations: { name: 'Dry', code: 'D', sort_order: 1 },
              categories: { name: 'Packaging', sort_order: 1 },
            },
          },
        ]}
        isAdmin={false}
      />
    );

    const text = container.textContent ?? '';
    const bowlIndex = text.indexOf('Bowl');
    const deckelIndex = text.indexOf('Deckel');
    const napkinIndex = text.indexOf('Napkin');

    // Deckel (sort_order 10) must sit right after its base Bowl, before Napkin (sort_order 2).
    expect(bowlIndex).toBeLessThan(deckelIndex);
    expect(deckelIndex).toBeLessThan(napkinIndex);
  });
});
