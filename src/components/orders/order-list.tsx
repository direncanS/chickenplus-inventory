'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OrderGenerationStatusBanner } from '@/components/checklist/order-generation-status-banner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { de } from '@/i18n/de';
import { generateOrderSuggestions, createOrder, updateOrderItems, updateOrderStatus } from '@/app/(app)/orders/actions';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTimeVienna } from '@/lib/utils/date';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';
import {
  buildOrderedItemUpdates,
  createOrderedItemDraftState,
  hasOrderedItemChanges,
  prefillOrderedQuantity,
} from '@/lib/utils/order-items';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  is_delivered: boolean;
  is_ordered: boolean;
  ordered_quantity: number | null;
  products: { name: string };
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  ordered_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  suppliers: { id: string; name: string };
  checklists: { iso_year: number; iso_week: number };
  order_items: OrderItem[];
}

interface Suggestion {
  supplierId: string;
  supplierName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    hasOpenOrder: boolean;
  }>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: de.orders.statusDraft, variant: 'secondary' },
  ordered: { label: de.orders.statusOrdered, variant: 'default' },
  partially_delivered: { label: de.orders.statusPartiallyDelivered, variant: 'outline' },
  delivered: { label: de.orders.statusDelivered, variant: 'outline' },
  cancelled: { label: de.orders.statusCancelled, variant: 'destructive' },
};

function getOrderedItemsValidationMessage(error: 'ordered_quantity_required' | 'ordered_quantity_invalid') {
  return error === 'ordered_quantity_required'
    ? de.orders.orderedQuantityRequired
    : de.orders.orderedQuantityInvalid;
}

function getOrderRenderKey(order: Order) {
  const itemsFingerprint = order.order_items
    .map((item) => `${item.id}:${item.is_ordered ? 1 : 0}:${item.ordered_quantity ?? 'null'}:${item.is_delivered ? 1 : 0}`)
    .join('|');

  return `${order.id}:${order.status}:${itemsFingerprint}`;
}

function formatActualOrderedQuantity(value: number | null, unit: string) {
  if (value == null) return null;
  return `${value} ${unit}`;
}

export function OrderList({
  orders,
  activeChecklist,
  isAdmin,
}: {
  orders: Order[];
  activeChecklist: {
    id: string;
    iso_year: number;
    iso_week: number;
    status: string;
    order_generation_status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | null;
    order_generation_orders_created?: number | null;
    order_generation_error?: string | null;
  } | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);

  const openOrders = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status as never));
  const closedOrders = orders.filter((o) => !OPEN_ORDER_STATUSES.includes(o.status as never));
  const isBackgroundOrderGenerationBusy =
    activeChecklist?.order_generation_status === 'pending' ||
    activeChecklist?.order_generation_status === 'running';

  async function handleGenerateSuggestions() {
    if (!activeChecklist) return;
    setLoadingSuggestions(true);
    const result = await generateOrderSuggestions(activeChecklist.id);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setSuggestions(result.data);
      setShowSuggestions(true);
      if (result.data.length === 0) {
        toast.info(de.orders.noSuggestions);
      }
    }
    setLoadingSuggestions(false);
  }

  async function handleCreateOrder(suggestion: Suggestion) {
    if (!activeChecklist || suggestion.supplierId === 'unassigned') return;
    setCreatingOrder(suggestion.supplierId);

    const items = suggestion.items
      .filter((i) => !i.hasOpenOrder)
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
      }));

    if (items.length === 0) {
      toast.info(de.orders.allProductsHaveOpenOrders);
      setCreatingOrder(null);
      return;
    }

    const result = await createOrder({
      supplierId: suggestion.supplierId,
      checklistId: activeChecklist.id,
      items,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${de.orders.createSuccess} ${result.orderNumber}`);
      setShowSuggestions(false);
      router.refresh();
    }
    setCreatingOrder(null);
  }

  async function handleDeliveryToggle(orderId: string, orderItemId: string, isDelivered: boolean) {
    const result = await updateOrderStatus({
      orderId,
      itemDeliveries: [{ orderItemId, isDelivered }],
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.orders.statusUpdateSuccess);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <OrderGenerationStatusBanner
        status={activeChecklist?.order_generation_status}
        ordersCreated={activeChecklist?.order_generation_orders_created}
        error={activeChecklist?.order_generation_error}
      />

      {activeChecklist && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleGenerateSuggestions}
            disabled={loadingSuggestions || isBackgroundOrderGenerationBusy}
            variant="outline"
          >
            {loadingSuggestions ? de.common.loading : de.orders.generateSuggestions}
          </Button>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">{de.orders.suggestions}</h3>
          {suggestions.map((suggestion) => (
            <Card key={suggestion.supplierId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{suggestion.supplierName}</CardTitle>
                  {suggestion.supplierId !== 'unassigned' && (
                    <Button
                      size="sm"
                      onClick={() => handleCreateOrder(suggestion)}
                      disabled={creatingOrder === suggestion.supplierId}
                    >
                      {creatingOrder === suggestion.supplierId ? de.common.loading : de.orders.createNew}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {suggestion.items.map((item) => (
                    <div key={item.productId} className="flex justify-between items-center">
                      <span className={item.hasOpenOrder ? 'text-muted-foreground line-through' : ''}>
                        {item.productName}
                      </span>
                      <span className="font-mono">
                        {item.quantity} {item.unit}
                        {item.hasOpenOrder && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {de.orders.duplicateWarning}
                          </Badge>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {openOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">{de.dashboard.openOrders} ({openOrders.length})</h3>
          {openOrders.map((order) => (
            <OrderCard
              key={getOrderRenderKey(order)}
              order={order}
              isAdmin={isAdmin}
              onDeliveryToggle={handleDeliveryToggle}
            />
          ))}
        </div>
      )}

      {closedOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground">{de.orders.closedOrders}</h3>
          {closedOrders.map((order) => (
            <OrderCard
              key={getOrderRenderKey(order)}
              order={order}
              isAdmin={isAdmin}
              onDeliveryToggle={handleDeliveryToggle}
            />
          ))}
        </div>
      )}

      {orders.length === 0 && !showSuggestions && (
        <div className="text-center py-8">
          <p className="font-medium mb-1">{de.orders.noOrders}</p>
          <p className="text-sm text-muted-foreground">{de.orders.noOrdersDescription}</p>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  isAdmin,
  onDeliveryToggle,
}: {
  order: Order;
  isAdmin: boolean;
  onDeliveryToggle: (orderId: string, itemId: string, isDelivered: boolean) => void;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [savingOrderedItems, setSavingOrderedItems] = useState(false);
  const [markingOrdered, setMarkingOrdered] = useState(false);
  const [orderedItemsDraft, setOrderedItemsDraft] = useState(() => createOrderedItemDraftState(order.order_items));

  const config = statusConfig[order.status] ?? statusConfig.draft;
  const isDraft = order.status === 'draft';
  const isReadOnly = order.status === 'delivered' || order.status === 'cancelled';
  const canDeliver = order.status === 'ordered' || order.status === 'partially_delivered';
  const isBusy = savingOrderedItems || markingOrdered || cancelling;
  const hasDraftChanges = isDraft && hasOrderedItemChanges(order.order_items, orderedItemsDraft);

  function handleOrderedToggle(item: OrderItem, checked: boolean) {
    setOrderedItemsDraft((current) => {
      const previous = current[item.id] ?? {
        isOrdered: item.is_ordered,
        orderedQuantity: item.ordered_quantity == null ? '' : String(item.ordered_quantity),
      };

      return {
        ...current,
        [item.id]: {
          isOrdered: checked,
          orderedQuantity: checked ? prefillOrderedQuantity(previous.orderedQuantity, item.quantity) : '',
        },
      };
    });
  }

  function handleOrderedQuantityChange(itemId: string, value: string) {
    setOrderedItemsDraft((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? { isOrdered: false, orderedQuantity: '' }),
        orderedQuantity: value,
      },
    }));
  }

  async function handleSaveOrderedItems() {
    const payload = buildOrderedItemUpdates(order.order_items, orderedItemsDraft);
    if (!payload.success) {
      toast.error(getOrderedItemsValidationMessage(payload.error));
      return;
    }

    if (payload.data.length === 0) {
      return;
    }

    setSavingOrderedItems(true);
    const result = await updateOrderItems({
      orderId: order.id,
      orderedItems: payload.data,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.orders.orderedItemsSaved);
      router.refresh();
    }
    setSavingOrderedItems(false);
  }

  async function handleMarkOrdered() {
    let orderedItemsPayload: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }> | undefined;

    if (hasDraftChanges) {
      const payload = buildOrderedItemUpdates(order.order_items, orderedItemsDraft);
      if (!payload.success) {
        toast.error(getOrderedItemsValidationMessage(payload.error));
        return;
      }
      orderedItemsPayload = payload.data;
    }

    setMarkingOrdered(true);
    const result = await updateOrderStatus({
      orderId: order.id,
      status: 'ordered',
      orderedItems: orderedItemsPayload,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.orders.statusUpdateSuccess);
      router.refresh();
    }
    setMarkingOrdered(false);
  }

  async function handleConfirmCancel() {
    setCancelling(true);
    setCancelError(null);
    const result = await updateOrderStatus({ orderId: order.id, status: 'cancelled' });
    if (result.error) {
      setCancelError(result.error);
      setCancelling(false);
    } else {
      setCancelOpen(false);
      setCancelling(false);
      toast.success(de.orders.statusUpdateSuccess);
      router.refresh();
    }
  }

  return (
    <Card className={isReadOnly ? 'opacity-70' : ''}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-mono">{order.order_number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {(order.suppliers as { name: string }).name} &middot; KW {(order.checklists as { iso_week: number }).iso_week}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={config.variant}>{config.label}</Badge>
            {isDraft && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveOrderedItems}
                  disabled={!hasDraftChanges || isBusy}
                >
                  {savingOrderedItems ? de.common.loading : de.common.save}
                </Button>
                <Button size="sm" variant="outline" onClick={handleMarkOrdered} disabled={isBusy}>
                  {markingOrdered ? de.common.loading : de.orders.markOrdered}
                </Button>
              </>
            )}
            {!isReadOnly && isAdmin && (
              <Dialog open={cancelOpen} onOpenChange={(open) => { setCancelOpen(open); if (!open) setCancelError(null); }}>
                <DialogTrigger render={<Button size="sm" variant="destructive" />}>
                  {de.orders.cancelOrder}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{de.orders.cancelDialogTitle}</DialogTitle>
                    <DialogDescription>
                      {de.orders.cancelDialogDescription}
                    </DialogDescription>
                  </DialogHeader>
                  {cancelError && (
                    <p className="text-sm text-destructive">{cancelError}</p>
                  )}
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                      {de.common.cancel}
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleConfirmCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? de.common.loading : de.orders.cancelOrder}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {order.order_items.map((item) => {
            const draftItem = orderedItemsDraft[item.id] ?? {
              isOrdered: item.is_ordered,
              orderedQuantity: item.ordered_quantity == null ? '' : String(item.ordered_quantity),
            };
            const actualOrderedQuantity = formatActualOrderedQuantity(item.ordered_quantity, item.unit);

            return (
              <div key={item.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {canDeliver && (
                      <Checkbox
                        checked={item.is_delivered}
                        onCheckedChange={(checked) => onDeliveryToggle(order.id, item.id, checked === true)}
                      />
                    )}
                    <span className={item.is_delivered ? 'line-through text-muted-foreground' : ''}>
                      {(item.products as { name: string }).name}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {de.orders.suggestedQuantity}: {item.quantity} {item.unit}
                  </span>
                </div>

                {isDraft ? (
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draftItem.isOrdered}
                        disabled={isBusy}
                        onCheckedChange={(checked) => handleOrderedToggle(item, checked === true)}
                      />
                      <span>{de.orders.orderedItem}</span>
                    </label>
                    <div className="flex items-center gap-2 sm:w-64">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={draftItem.orderedQuantity}
                        disabled={!draftItem.isOrdered || isBusy}
                        onChange={(event) => handleOrderedQuantityChange(item.id, event.target.value)}
                        placeholder={String(item.quantity)}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>
                    </div>
                  </div>
                ) : actualOrderedQuantity ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {de.orders.orderedItem}: <span className="font-mono">{actualOrderedQuantity}</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {order.ordered_at && (
          <p className="text-xs text-muted-foreground mt-3">
            {de.orders.orderedAt}: {formatDateTimeVienna(order.ordered_at)}
          </p>
        )}
        {order.delivered_at && (
          <p className="text-xs text-muted-foreground">
            {de.orders.deliveredAt}: {formatDateTimeVienna(order.delivered_at)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
