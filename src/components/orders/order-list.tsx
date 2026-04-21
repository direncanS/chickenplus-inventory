'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { finalizeSuggestionGroup, generateOrderSuggestions, updateOrderItems, updateOrderStatus } from '@/app/(app)/orders/actions';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTimeVienna } from '@/lib/utils/date';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';
import {
  buildOrderedItemUpdates,
  createOrderedItemDraftState,
  hasOrderedItemChanges,
  normalizeSuggestedOrderCount,
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
    checklistItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    currentStock: string | null;
    isOrdered: boolean;
    orderedQuantity: number | null;
  }>;
}

function formatCurrentStock(
  currentStock: string | null
): { value: string; showUnit: boolean } {
  const trimmed = currentStock?.trim() ?? '';
  if (!trimmed) {
    return { value: de.orders.currentStockMissing, showUnit: false };
  }
  return { value: trimmed, showUnit: true };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: de.orders.statusDraft, variant: 'secondary' },
  ordered: { label: de.orders.statusOrdered, variant: 'default' },
  partially_delivered: { label: de.orders.statusPartiallyDelivered, variant: 'outline' },
  delivered: { label: de.orders.statusDelivered, variant: 'outline' },
  cancelled: { label: de.orders.statusCancelled, variant: 'destructive' },
};

function getOrderedItemsValidationMessage() {
  return de.orders.orderedQuantityInvalid;
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

function getQuantityInputPlaceholder(quantity: number) {
  return String(normalizeSuggestedOrderCount(quantity));
}

export function OrderList({
  orders,
  activeChecklist,
  initialSuggestions,
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
  initialSuggestions: Suggestion[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isSyncPending, startSyncTransition] = useTransition();
  const suggestionsAllowed = activeChecklist?.status === 'completed';
  const [ordersState, setOrdersState] = useState<Order[]>(orders);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    suggestionsAllowed ? initialSuggestions : []
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const showSuggestions = suggestionsAllowed && suggestions.length > 0;

  const openOrders = ordersState.filter((o) => OPEN_ORDER_STATUSES.includes(o.status as never));
  const closedOrders = ordersState.filter((o) => !OPEN_ORDER_STATUSES.includes(o.status as never));
  const isBackgroundOrderGenerationBusy =
    activeChecklist?.order_generation_status === 'pending' ||
    activeChecklist?.order_generation_status === 'running';
  const suggestionAvailabilityMessage = de.orders.suggestionsAvailableAfterCompletion;

  const totalSuggestedItems = suggestions.reduce((sum, group) => sum + group.items.length, 0);

  function syncServerState() {
    // The list stays responsive locally and then refreshes server-rendered side regions.
    startSyncTransition(() => {
      router.refresh();
    });
  }

  function patchOrder(orderId: string, updater: (order: Order) => Order) {
    setOrdersState((current) =>
      current.map((order) => (order.id === orderId ? updater(order) : order))
    );
  }

  function patchOrderItems(
    orderId: string,
    orderedItems: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }>
  ) {
    const patchMap = new Map(orderedItems.map((item) => [item.orderItemId, item]));

    patchOrder(orderId, (order) => ({
      ...order,
      order_items: order.order_items.map((item) => {
        const patch = patchMap.get(item.id);
        if (!patch) return item;

        return {
          ...item,
          is_ordered: patch.isOrdered,
          ordered_quantity: patch.orderedQuantity,
        };
      }),
    }));
  }

  function removeFinalizedSuggestionItems(supplierId: string, orderedChecklistItemIds: string[]) {
    if (orderedChecklistItemIds.length === 0) return;

    const orderedSet = new Set(orderedChecklistItemIds);
    setSuggestions((current) =>
      current.flatMap((group) => {
        if (group.supplierId !== supplierId) {
          return [group];
        }

        const remainingItems = group.items.filter(
          (item) => !orderedSet.has(item.checklistItemId)
        );

        return remainingItems.length > 0
          ? [{ ...group, items: remainingItems }]
          : [];
      })
    );
  }

  async function loadSuggestions(options?: { silentIfEmpty?: boolean }) {
    if (!activeChecklist) return;
    if (!suggestionsAllowed) return;

    setLoadingSuggestions(true);
    const result = await generateOrderSuggestions(activeChecklist.id);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setSuggestions(result.data);

      if (result.data.length === 0 && !options?.silentIfEmpty) {
        toast.info(de.orders.noSuggestions);
      }
    }

    setLoadingSuggestions(false);
  }

  async function handleGenerateSuggestions() {
    if (!suggestionsAllowed) {
      toast.info(suggestionAvailabilityMessage);
      return;
    }

    await loadSuggestions();
  }

  async function handleDeliveryToggle(orderId: string, orderItemId: string, isDelivered: boolean) {
    const result = await updateOrderStatus({
      orderId,
      itemDeliveries: [{ orderItemId, isDelivered }],
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      patchOrder(orderId, (order) => ({
        ...order,
        status: result.status ?? order.status,
        delivered_at: result.status === 'delivered' ? new Date().toISOString() : null,
        order_items: order.order_items.map((item) =>
          item.id === orderItemId ? { ...item, is_delivered: isDelivered } : item
        ),
      }));
      toast.success(de.orders.statusUpdateSuccess);
      syncServerState();
    }
  }

  const [exportingExcel, setExportingExcel] = useState(false);

  async function handleExportExcel() {
    if (!activeChecklist) return;
    setExportingExcel(true);
    try {
      const response = await fetch(`/api/export/orders/${activeChecklist.id}`);
      if (!response.ok) {
        const maybeJson = await response.json().catch(() => null);
        toast.error(maybeJson?.error ?? de.orders.exportFailed);
        return;
      }
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1]
        ?? `Bestellvorschlaege_KW${String(activeChecklist.iso_week).padStart(2, '0')}_${activeChecklist.iso_year}.xlsx`;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(de.orders.exportFailed);
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <div className="space-y-4">
      <OrderGenerationStatusBanner
        status={activeChecklist?.order_generation_status}
        ordersCreated={activeChecklist?.order_generation_orders_created}
        error={activeChecklist?.order_generation_error}
      />

      {activeChecklist && (
        <div className="surface-subtle flex flex-col gap-3 px-4 py-4" data-no-print>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Bestellvorschläge
              </p>
              {suggestionsAllowed && suggestions.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {de.orders.suppliersTotal.replace('{count}', String(suggestions.length))}
                  {' · '}
                  {de.orders.itemsTotal.replace('{count}', String(totalSuggestedItems))}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {suggestionsAllowed
                    ? 'Gruppieren Sie offene Fehlmengen nach Lieferant und behalten Sie bestehende Bestellungen parallel im Blick.'
                    : suggestionAvailabilityMessage}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={exportingExcel || !activeChecklist}
              >
                {exportingExcel ? de.common.loading : de.orders.exportExcel}
              </Button>
              <Button
                onClick={handleGenerateSuggestions}
                disabled={
                  loadingSuggestions ||
                  isBackgroundOrderGenerationBusy ||
                  !suggestionsAllowed
                }
                variant="outline"
                size="sm"
              >
                {loadingSuggestions ? de.common.loading : de.orders.generateSuggestions}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeChecklist && !suggestionsAllowed && ordersState.length > 0 && (
        <p className="text-sm text-muted-foreground">{suggestionAvailabilityMessage}</p>
      )}

      {showSuggestions && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-heading text-base font-semibold tracking-tight sm:text-lg">{de.orders.suggestions}</h3>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>
          <Accordion
            multiple
            defaultValue={suggestions.map((s) => `suggestion-${s.supplierId}`)}
            className="surface-subtle divide-y divide-border/40 px-2"
          >
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${activeChecklist?.id ?? 'no-checklist'}:${suggestion.supplierId}:${suggestion.items
                  .map((item) => item.checklistItemId)
                  .join(',')}`}
                checklistId={activeChecklist!.id}
                suggestion={suggestion}
                onCompleted={async (orderedChecklistItemIds) => {
                  removeFinalizedSuggestionItems(suggestion.supplierId, orderedChecklistItemIds);
                  syncServerState();
                }}
              />
            ))}
          </Accordion>
        </section>
      )}

      {openOrders.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-heading text-base font-semibold tracking-tight sm:text-lg">{de.dashboard.openOrders}</h3>
            <Badge variant="secondary">{openOrders.length}</Badge>
          </div>
          <Accordion multiple className="surface-subtle divide-y divide-border/40 px-2">
            {openOrders.map((order) => (
              <OrderCard
                key={getOrderRenderKey(order)}
                order={order}
                isAdmin={isAdmin}
                onDeliveryToggle={handleDeliveryToggle}
                onOrderedItemsSaved={(orderedItems) => {
                  patchOrderItems(order.id, orderedItems);
                }}
                onMarkedOrdered={(orderedItems) => {
                  if (orderedItems) {
                    patchOrderItems(order.id, orderedItems);
                  }
                  patchOrder(order.id, (current) => ({
                    ...current,
                    status: 'ordered',
                    ordered_at: current.ordered_at ?? new Date().toISOString(),
                  }));
                  syncServerState();
                }}
                onCancelled={() => {
                  patchOrder(order.id, (current) => ({
                    ...current,
                    status: 'cancelled',
                  }));
                  syncServerState();
                }}
              />
            ))}
          </Accordion>
        </section>
      )}

      {closedOrders.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-heading text-base font-semibold tracking-tight text-muted-foreground sm:text-lg">{de.orders.closedOrders}</h3>
            <Badge variant="outline">{closedOrders.length}</Badge>
          </div>
          <Accordion multiple className="surface-subtle divide-y divide-border/40 px-2">
            {closedOrders.map((order) => (
              <OrderCard
                key={getOrderRenderKey(order)}
                order={order}
                isAdmin={isAdmin}
                onDeliveryToggle={handleDeliveryToggle}
                onOrderedItemsSaved={(orderedItems) => {
                  patchOrderItems(order.id, orderedItems);
                }}
                onMarkedOrdered={(orderedItems) => {
                  if (orderedItems) {
                    patchOrderItems(order.id, orderedItems);
                  }
                  patchOrder(order.id, (current) => ({
                    ...current,
                    status: 'ordered',
                    ordered_at: current.ordered_at ?? new Date().toISOString(),
                  }));
                  syncServerState();
                }}
                onCancelled={() => {
                  patchOrder(order.id, (current) => ({
                    ...current,
                    status: 'cancelled',
                  }));
                  syncServerState();
                }}
              />
            ))}
          </Accordion>
        </section>
      )}

      {ordersState.length === 0 && suggestions.length === 0 && !loadingSuggestions && !isSyncPending && (
        <div className="surface-subtle py-10 text-center">
          <p className="font-medium mb-1">{de.orders.noOrders}</p>
          <p className="text-sm text-muted-foreground">
            {suggestionsAllowed ? de.orders.noOrdersDescription : suggestionAvailabilityMessage}
          </p>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  checklistId,
  suggestion,
  onCompleted,
}: {
  checklistId: string;
  suggestion: Suggestion;
  onCompleted: (orderedChecklistItemIds: string[]) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [draftState, setDraftState] = useState(() =>
    Object.fromEntries(
      suggestion.items.map((item) => [
        item.checklistItemId,
        {
          isOrdered: item.isOrdered,
          orderedQuantity: item.orderedQuantity == null ? '' : String(item.orderedQuantity),
        },
      ])
    )
  );

  const checkedCount = Object.values(draftState).filter((item) => item.isOrdered).length;

  function handleToggle(checklistItemId: string, checked: boolean) {
    setDraftState((current) => ({
      ...current,
      [checklistItemId]: {
        isOrdered: checked,
        orderedQuantity: checked ? current[checklistItemId]?.orderedQuantity ?? '' : '',
      },
    }));
  }

  function handleQuantityChange(checklistItemId: string, value: string) {
    setDraftState((current) => ({
      ...current,
      [checklistItemId]: {
        ...(current[checklistItemId] ?? { isOrdered: false, orderedQuantity: '' }),
        orderedQuantity: value,
      },
    }));
  }

  async function handleComplete() {
    if (checkedCount === 0) {
      toast.info(de.orders.selectProductsFirst);
      return;
    }

    const itemsPayload = [];
    for (const item of suggestion.items) {
      const draft = draftState[item.checklistItemId] ?? { isOrdered: false, orderedQuantity: '' };
      const normalized = draft.orderedQuantity.trim().replace(',', '.');

      if (!draft.isOrdered) {
        itemsPayload.push({
          checklistItemId: item.checklistItemId,
          isOrdered: false,
          orderedQuantity: null,
        });
        continue;
      }

      if (normalized !== '') {
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
          toast.error(de.orders.orderedQuantityInvalid);
          return;
        }

        itemsPayload.push({
          checklistItemId: item.checklistItemId,
          isOrdered: true,
          orderedQuantity: parsed,
        });
        continue;
      }

      itemsPayload.push({
        checklistItemId: item.checklistItemId,
        isOrdered: true,
        orderedQuantity: null,
      });
    }

    setSaving(true);
    const result = await finalizeSuggestionGroup({
      checklistId,
      supplierId: suggestion.supplierId === 'unassigned' ? null : suggestion.supplierId,
      supplierName: suggestion.supplierName,
      items: itemsPayload,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.orders.suggestionGroupSaved);
      await onCompleted(
        itemsPayload
          .filter((item) => item.isOrdered)
          .map((item) => item.checklistItemId)
      );
    }

    setSaving(false);
  }

  return (
    <AccordionItem value={`suggestion-${suggestion.supplierId}`}>
      <AccordionTrigger className="px-2 py-3">
        <div className="flex w-full items-center gap-2 pr-2">
          <span className="flex-1 truncate text-sm font-semibold sm:text-base">{suggestion.supplierName}</span>
          <Badge variant="outline" className="font-mono text-[11px]">
            {suggestion.items.length}
          </Badge>
          {checkedCount > 0 && (
            <Badge variant="default" className="font-mono text-[11px]">
              {checkedCount}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">
        <div className="space-y-2">
          {suggestion.items.map((item) => {
            const draft = draftState[item.checklistItemId] ?? { isOrdered: false, orderedQuantity: '' };
            const stock = formatCurrentStock(item.currentStock);

            return (
              <div key={item.checklistItemId} className="rounded-lg border border-border/60 bg-muted/25 p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.isOrdered}
                      disabled={saving}
                      onCheckedChange={(checked) => handleToggle(item.checklistItemId, checked === true)}
                      className="size-5 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.productName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {de.orders.currentStockLabel}:{' '}
                        <span className="font-mono tabular-nums text-foreground">
                          {stock.value}
                          {stock.showUnit ? ` ${item.unit}` : ''}
                        </span>
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-col gap-1 sm:w-52">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {de.orders.orderQuantityLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={draft.orderedQuantity}
                        disabled={!draft.isOrdered || saving}
                        onChange={(event) => handleQuantityChange(item.checklistItemId, event.target.value)}
                        className="h-9"
                        aria-label={de.orders.orderQuantityHint}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{de.orders.orderQuantityHint}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end pt-1" data-no-print>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={saving || checkedCount === 0}
            >
              {saving ? de.common.loading : de.common.complete}
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function OrderCard({
  order,
  isAdmin,
  onDeliveryToggle,
  onOrderedItemsSaved,
  onMarkedOrdered,
  onCancelled,
}: {
  order: Order;
  isAdmin: boolean;
  onDeliveryToggle: (orderId: string, itemId: string, isDelivered: boolean) => void;
  onOrderedItemsSaved: (
    orderedItems: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }>
  ) => void;
  onMarkedOrdered: (
    orderedItems?: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }>
  ) => void;
  onCancelled: () => void;
}) {
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
      toast.error(getOrderedItemsValidationMessage());
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
      onOrderedItemsSaved(payload.data);
      toast.success(de.orders.orderedItemsSaved);
    }
    setSavingOrderedItems(false);
  }

  async function handleMarkOrdered() {
    let orderedItemsPayload: Array<{ orderItemId: string; isOrdered: boolean; orderedQuantity: number | null }> | undefined;

    if (hasDraftChanges) {
      const payload = buildOrderedItemUpdates(order.order_items, orderedItemsDraft);
      if (!payload.success) {
        toast.error(getOrderedItemsValidationMessage());
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
      onMarkedOrdered(orderedItemsPayload);
      toast.success(de.orders.statusUpdateSuccess);
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
      onCancelled();
      toast.success(de.orders.statusUpdateSuccess);
    }
  }

  return (
    <AccordionItem value={`order-${order.id}`} className={isReadOnly ? 'opacity-70' : ''}>
      <AccordionTrigger className="px-2 py-3">
        <div className="flex w-full flex-wrap items-center gap-2 pr-2">
          <span className="font-mono text-xs sm:text-sm">{order.order_number}</span>
          <span className="flex-1 truncate text-sm font-medium">
            {(order.suppliers as { name: string }).name}
          </span>
          <Badge variant="outline" className="font-mono text-[11px]">
            KW {(order.checklists as { iso_week: number }).iso_week}
          </Badge>
          <Badge variant={config.variant} className="text-[11px]">{config.label}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">
        <div className="space-y-2">
          {order.order_items.map((item) => {
            const draftItem = orderedItemsDraft[item.id] ?? {
              isOrdered: item.is_ordered,
              orderedQuantity: item.ordered_quantity == null ? '' : String(item.ordered_quantity),
            };
            const actualOrderedQuantity = formatActualOrderedQuantity(item.ordered_quantity, item.unit);

            return (
              <div key={item.id} className="rounded-lg border border-border/60 bg-muted/25 p-2">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {canDeliver && (
                      <Checkbox
                        checked={item.is_delivered}
                        onCheckedChange={(checked) => onDeliveryToggle(order.id, item.id, checked === true)}
                        className="size-5 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <span className={`block truncate font-medium ${item.is_delivered ? 'line-through text-muted-foreground' : ''}`}>
                        {(item.products as { name: string }).name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {de.orders.suggestionLabel}: <span className="font-mono tabular-nums text-foreground">{item.quantity} {item.unit}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {isDraft ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draftItem.isOrdered}
                        disabled={isBusy}
                        onCheckedChange={(checked) => handleOrderedToggle(item, checked === true)}
                        className="size-5"
                      />
                      <span>{de.orders.orderedItem}</span>
                    </label>
                    <div className="flex flex-col gap-1 sm:w-52">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {de.orders.orderQuantityLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draftItem.orderedQuantity}
                          disabled={!draftItem.isOrdered || isBusy}
                          onChange={(event) => handleOrderedQuantityChange(item.id, event.target.value)}
                          placeholder={getQuantityInputPlaceholder(item.quantity)}
                          className="h-9"
                          aria-label={de.orders.orderQuantityHint}
                        />
                        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>
                      </div>
                    </div>
                  </div>
                ) : actualOrderedQuantity ? (
                  <p className="mt-2 text-xs">
                    <span className="text-muted-foreground">{de.orders.orderQuantityLabel}: </span>
                    <span className="font-mono font-medium tabular-nums">{actualOrderedQuantity}</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2" data-no-print>
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
              <Button size="sm" onClick={handleMarkOrdered} disabled={isBusy}>
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

        {(order.ordered_at || order.delivered_at) && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {order.ordered_at && (
              <p>{de.orders.orderedAt}: {formatDateTimeVienna(order.ordered_at)}</p>
            )}
            {order.delivered_at && (
              <p>{de.orders.deliveredAt}: {formatDateTimeVienna(order.delivered_at)}</p>
            )}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
