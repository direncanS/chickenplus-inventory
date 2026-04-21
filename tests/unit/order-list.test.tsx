// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderList } from '@/components/orders/order-list';

const {
  refreshMock,
  toastSuccessMock,
  toastErrorMock,
  toastInfoMock,
  generateSuggestionsMock,
  finalizeSuggestionGroupMock,
  updateOrderItemsMock,
  updateOrderStatusMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  generateSuggestionsMock: vi.fn(),
  finalizeSuggestionGroupMock: vi.fn(),
  updateOrderItemsMock: vi.fn(),
  updateOrderStatusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    info: toastInfoMock,
  },
}));

vi.mock('@/app/(app)/orders/actions', () => ({
  generateOrderSuggestions: (...args: unknown[]) => generateSuggestionsMock(...args),
  finalizeSuggestionGroup: (...args: unknown[]) => finalizeSuggestionGroupMock(...args),
  updateOrderItems: (...args: unknown[]) => updateOrderItemsMock(...args),
  updateOrderStatus: (...args: unknown[]) => updateOrderStatusMock(...args),
}));

describe('OrderList', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    refreshMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    generateSuggestionsMock.mockReset();
    finalizeSuggestionGroupMock.mockReset();
    updateOrderItemsMock.mockReset();
    updateOrderStatusMock.mockReset();
    finalizeSuggestionGroupMock.mockResolvedValue({ success: true });
  });

  it('renders initial suggestions on first paint and removes finalized rows immediately', async () => {
    render(
      <OrderList
        orders={[]}
        activeChecklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'completed',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        initialSuggestions={[
          {
            supplierId: 'unassigned',
            supplierName: 'Nicht zugeordnet',
            items: [
              {
                checklistItemId: 'item-1',
                productId: 'product-1',
                productName: 'Cola',
                quantity: 3,
                unit: 'koli',
                currentStock: null,
                isOrdered: false,
                orderedQuantity: null,
              },
            ],
          },
        ]}
        isAdmin={false}
      />
    );

    expect(screen.getByText('Cola')).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Abschließen' }));

    await waitFor(() => {
      expect(finalizeSuggestionGroupMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Cola')).toBeNull();
    });
  });

  it('suppresses checklist suggestions until the checklist is completed', () => {
    render(
      <OrderList
        orders={[]}
        activeChecklist={{
          id: 'checklist-1',
          iso_year: 2026,
          iso_week: 14,
          status: 'in_progress',
          order_generation_status: 'idle',
          order_generation_orders_created: 0,
          order_generation_error: null,
        }}
        initialSuggestions={[
          {
            supplierId: 'unassigned',
            supplierName: 'Nicht zugeordnet',
            items: [
              {
                checklistItemId: 'item-1',
                productId: 'product-1',
                productName: 'Cola',
                quantity: 3,
                unit: 'koli',
                currentStock: null,
                isOrdered: false,
                orderedQuantity: null,
              },
            ],
          },
        ]}
        isAdmin={false}
      />
    );

    expect(screen.queryByText('Cola')).toBeNull();
    expect(
      screen.getAllByText('Bestellvorschlaege werden erst nach Abschluss der Kontrollliste angezeigt.').length
    ).toBeGreaterThan(0);
    expect(
      (screen.getByRole('button', { name: /Vorschl.ge generieren/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
