export interface WorkflowOrder {
  status: string;
  order_items: Array<{
    is_delivered: boolean;
  }>;
}

export interface WorkflowSuggestion {
  supplierId: string;
  items: Array<unknown>;
}

export interface OrderWorkflowSummary {
  suggestionGroups: number;
  suggestedItems: number;
  unassignedSuggestionItems: number;
  openOrders: number;
  draftOrders: number;
  orderedOrders: number;
  partiallyDeliveredOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  deliveryItemsTotal: number;
  deliveryItemsDone: number;
}

export function summarizeOrderWorkflow(
  orders: WorkflowOrder[],
  suggestions: WorkflowSuggestion[]
): OrderWorkflowSummary {
  const summary: OrderWorkflowSummary = {
    suggestionGroups: suggestions.length,
    suggestedItems: suggestions.reduce((sum, group) => sum + group.items.length, 0),
    unassignedSuggestionItems: suggestions
      .filter((group) => group.supplierId === 'unassigned')
      .reduce((sum, group) => sum + group.items.length, 0),
    openOrders: 0,
    draftOrders: 0,
    orderedOrders: 0,
    partiallyDeliveredOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    deliveryItemsTotal: 0,
    deliveryItemsDone: 0,
  };

  for (const order of orders) {
    if (order.status === 'draft') {
      summary.openOrders += 1;
      summary.draftOrders += 1;
      continue;
    }

    if (order.status === 'ordered') {
      summary.openOrders += 1;
      summary.orderedOrders += 1;
    } else if (order.status === 'partially_delivered') {
      summary.openOrders += 1;
      summary.partiallyDeliveredOrders += 1;
    } else if (order.status === 'delivered') {
      summary.deliveredOrders += 1;
    } else if (order.status === 'cancelled') {
      summary.cancelledOrders += 1;
    }

    if (order.status === 'ordered' || order.status === 'partially_delivered') {
      summary.deliveryItemsTotal += order.order_items.length;
      summary.deliveryItemsDone += order.order_items.filter((item) => item.is_delivered).length;
    }
  }

  return summary;
}
