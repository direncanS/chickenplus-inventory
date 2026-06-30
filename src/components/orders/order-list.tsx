'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { generateOrderSuggestions, createOrder, updateOrderStatus } from '@/app/(app)/orders/actions';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTimeVienna } from '@/lib/utils/date';
import { OPEN_ORDER_STATUSES } from '@/lib/constants';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  is_delivered: boolean;
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

export function OrderList({
  orders,
  activeChecklist,
  isAdmin,
}: {
  orders: Order[];
  activeChecklist: { id: string; iso_year: number; iso_week: number; status: string } | null;
  isAdmin: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);

  const openOrders = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status as never));
  const closedOrders = orders.filter((o) => !OPEN_ORDER_STATUSES.includes(o.status as never));

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
    }
    setCreatingOrder(null);
  }

  async function handleMarkOrdered(orderId: string) {
    const result = await updateOrderStatus({ orderId, status: 'ordered' });
    if (result.error) toast.error(result.error);
    else toast.success(de.orders.statusUpdateSuccess);
  }

  async function handleDeliveryToggle(orderId: string, orderItemId: string, isDelivered: boolean) {
    const result = await updateOrderStatus({
      orderId,
      itemDeliveries: [{ orderItemId, isDelivered }],
    });
    if (result.error) toast.error(result.error);
    else toast.success(de.orders.statusUpdateSuccess);
  }

  return (
    <div className="space-y-6">
      {/* Suggestions section */}
      {activeChecklist && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleGenerateSuggestions}
            disabled={loadingSuggestions}
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

      {/* Open Orders */}
      {openOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">{de.dashboard.openOrders} ({openOrders.length})</h3>
          {openOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isAdmin={isAdmin}
              onMarkOrdered={handleMarkOrdered}
              onDeliveryToggle={handleDeliveryToggle}
            />
          ))}
        </div>
      )}

      {/* Closed Orders */}
      {closedOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground">{de.orders.closedOrders}</h3>
          {closedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isAdmin={isAdmin}
              onMarkOrdered={handleMarkOrdered}
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
  onMarkOrdered,
  onDeliveryToggle,
}: {
  order: Order;
  isAdmin: boolean;
  onMarkOrdered: (orderId: string) => void;
  onDeliveryToggle: (orderId: string, itemId: string, isDelivered: boolean) => void;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const config = statusConfig[order.status] ?? statusConfig.draft;
  const isReadOnly = order.status === 'delivered' || order.status === 'cancelled';
  const canDeliver = order.status === 'ordered' || order.status === 'partially_delivered';

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
          <div className="flex items-center gap-2">
            <Badge variant={config.variant}>{config.label}</Badge>
            {order.status === 'draft' && (
              <Button size="sm" variant="outline" onClick={() => onMarkOrdered(order.id)}>
                {de.orders.markOrdered}
              </Button>
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
        <div className="space-y-1">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
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
              <span className="font-mono text-muted-foreground">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
        {order.ordered_at && (
          <p className="text-xs text-muted-foreground mt-2">
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
