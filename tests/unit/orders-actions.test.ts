import { beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from '@/i18n/de';

vi.mock('server-only', () => ({}));

const {
  createServerClientMock,
  createAdminClientMock,
  getActiveProfileMock,
  logAuditMock,
  revalidatePathMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getActiveProfileMock: vi.fn(),
  logAuditMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  updateTag: () => undefined,
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}));

vi.mock('@/lib/supabase/auth-helpers', () => ({
  getActiveProfile: (...args: unknown[]) => getActiveProfileMock(...args),
}));

vi.mock('@/lib/utils/audit', () => ({
  logAudit: (...args: unknown[]) => logAuditMock(...args),
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

const userId = '11111111-1111-4111-8111-111111111111';
const checklistId = '22222222-2222-4222-8222-222222222222';
const supplierId = '33333333-3333-4333-8333-333333333333';
const checklistItemId = '44444444-4444-4444-8444-444444444444';
const productId = '55555555-5555-4555-8555-555555555555';

function createChecklistItemsQuery(data: unknown) {
  return {
    select: vi.fn(() => ({
      in: vi.fn().mockResolvedValue({ data, error: null }),
    })),
  };
}

function createProductSuppliersQuery(data: unknown) {
  return {
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data, error: null }),
      })),
    })),
  };
}

describe('finalizeSuggestionGroup', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    createAdminClientMock.mockReset();
    getActiveProfileMock.mockReset();
    logAuditMock.mockReset();
    revalidatePathMock.mockReset();
    loggerErrorMock.mockReset();

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
        }),
      },
    });

    getActiveProfileMock.mockResolvedValue({
      id: userId,
      role: 'staff',
      is_active: true,
    });
  });

  it('returns an error without partial checklist writes when the transactional RPC fails', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error: 'order_number_conflict',
      },
      error: null,
    });

    const fromMock = vi.fn((table: string) => {
      if (table === 'checklist_items') {
        return createChecklistItemsQuery([
          {
            id: checklistItemId,
            checklist_id: checklistId,
            product_id: productId,
            product_name: 'Cola',
            min_stock_snapshot: 2,
            min_stock_max_snapshot: 5,
            is_missing: true,
            products: { unit: 'koli', is_active: true },
          },
        ]);
      }

      if (table === 'product_suppliers') {
        return createProductSuppliersQuery([
          {
            product_id: productId,
            supplier_id: supplierId,
            suppliers: { id: supplierId, name: 'Metro', is_active: true },
          },
        ]);
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createAdminClientMock.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    });

    const { finalizeSuggestionGroup } = await import('@/app/(app)/orders/actions');

    const result = await finalizeSuggestionGroup({
      checklistId,
      supplierId,
      supplierName: 'Metro',
      items: [
        {
          checklistItemId,
          isOrdered: true,
          orderedQuantity: 3,
        },
      ],
    });

    expect(result).toEqual({ error: de.orders.orderNumberConflict });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(logAuditMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('uses the transactional RPC and logs the created ordered order on success', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        success: true,
        order_id: '66666666-6666-6666-6666-666666666666',
        order_number: 'ORD-2026-W14-1',
      },
      error: null,
    });

    const fromMock = vi.fn((table: string) => {
      if (table === 'checklist_items') {
        return createChecklistItemsQuery([
          {
            id: checklistItemId,
            checklist_id: checklistId,
            product_id: productId,
            product_name: 'Cola',
            min_stock_snapshot: 2,
            min_stock_max_snapshot: 5,
            is_missing: true,
            products: { unit: 'koli', is_active: true },
          },
        ]);
      }

      if (table === 'product_suppliers') {
        return createProductSuppliersQuery([
          {
            product_id: productId,
            supplier_id: supplierId,
            suppliers: { id: supplierId, name: 'Metro', is_active: true },
          },
        ]);
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createAdminClientMock.mockReturnValue({
      from: fromMock,
      rpc: rpcMock,
    });

    const { finalizeSuggestionGroup } = await import('@/app/(app)/orders/actions');

    const result = await finalizeSuggestionGroup({
      checklistId,
      supplierId,
      supplierName: 'Metro',
      items: [
        {
          checklistItemId,
          isOrdered: true,
          orderedQuantity: 3,
        },
      ],
    });

    expect(result).toEqual({ success: true });
    expect(rpcMock).toHaveBeenCalledWith('rpc_finalize_suggestion_group', {
      p_checklist_id: checklistId,
      p_supplier_id: supplierId,
      p_supplier_name: 'Metro',
      p_created_by: userId,
      p_items: [
        {
          checklist_item_id: checklistItemId,
          product_id: productId,
          quantity: 5,
          unit: 'koli',
          is_ordered: true,
          ordered_quantity: 3,
        },
      ],
    });
    expect(logAuditMock).toHaveBeenCalledWith({
      userId,
      action: 'order_created',
      entityType: 'order',
      entityId: '66666666-6666-6666-6666-666666666666',
      details: {
        orderNumber: 'ORD-2026-W14-1',
        supplierId,
        initialStatus: 'ordered',
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/orders');
  });
});

describe('updateOrderStatus delivery transitions', () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    createAdminClientMock.mockReset();
    getActiveProfileMock.mockReset();
    logAuditMock.mockReset();
    revalidatePathMock.mockReset();
    loggerErrorMock.mockReset();

    getActiveProfileMock.mockResolvedValue({
      id: userId,
      role: 'staff',
      is_active: true,
    });
  });

  it('returns an order to ordered when all delivered items are unchecked again', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        status: 'partially_delivered',
      },
      error: null,
    });

    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        success: true,
        status: 'ordered',
        delivered_items: 0,
        total_items: 2,
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: singleMock,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
      rpc: rpcMock,
    });

    const { updateOrderStatus } = await import('@/app/(app)/orders/actions');

    const result = await updateOrderStatus({
      orderId: '77777777-7777-4777-8777-777777777777',
      itemDeliveries: [
        {
          orderItemId: '88888888-8888-4888-8888-888888888888',
          isDelivered: false,
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith('rpc_update_order_delivery', {
      p_order_id: '77777777-7777-4777-8777-777777777777',
      p_item_deliveries: [
        {
          order_item_id: '88888888-8888-4888-8888-888888888888',
          is_delivered: false,
        },
      ],
    });
    expect(result).toEqual({ success: true, status: 'ordered' });
    expect(logAuditMock).toHaveBeenCalledWith({
      userId,
      action: 'order_status_changed',
      entityType: 'order',
      entityId: '77777777-7777-4777-8777-777777777777',
      details: { status: 'ordered', deliveredItems: 0, totalItems: 2 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/orders');
  });
});
