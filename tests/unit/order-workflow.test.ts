import { describe, expect, it } from 'vitest';
import { summarizeOrderWorkflow } from '@/lib/utils/order-workflow';

describe('summarizeOrderWorkflow', () => {
  it('summarizes suggestions and order stages', () => {
    const summary = summarizeOrderWorkflow(
      [
        { status: 'draft', order_items: [{ is_delivered: false }] },
        {
          status: 'ordered',
          order_items: [{ is_delivered: true }, { is_delivered: false }],
        },
        {
          status: 'partially_delivered',
          order_items: [{ is_delivered: true }, { is_delivered: false }],
        },
        { status: 'delivered', order_items: [{ is_delivered: true }] },
        { status: 'cancelled', order_items: [{ is_delivered: false }] },
      ],
      [
        { supplierId: 'supplier-1', items: [{}, {}] },
        { supplierId: 'unassigned', items: [{}] },
      ]
    );

    expect(summary).toMatchObject({
      suggestionGroups: 2,
      suggestedItems: 3,
      unassignedSuggestionItems: 1,
      openOrders: 3,
      draftOrders: 1,
      orderedOrders: 1,
      partiallyDeliveredOrders: 1,
      deliveredOrders: 1,
      cancelledOrders: 1,
      deliveryItemsTotal: 4,
      deliveryItemsDone: 2,
    });
  });
});
