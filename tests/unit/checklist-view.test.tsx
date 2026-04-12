// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    vi.useRealTimers();
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
});
