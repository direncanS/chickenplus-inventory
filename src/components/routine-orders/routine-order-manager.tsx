'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { de } from '@/i18n/de';
import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS, type DayOfWeek } from '@/lib/constants';
import { toast } from 'sonner';
import {
  createRoutineOrder,
  deleteRoutineOrder,
  updateRoutineOrder,
  addRoutineOrderItem,
  removeRoutineOrderItem,
  getAvailableProductsForRoutine,
} from '@/app/(app)/orders/routine/actions';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';

interface RoutineProduct {
  id: string;
  name: string;
  unit: string | null;
  is_active: boolean;
}

interface RoutineItem {
  id: string;
  product_id: string;
  default_quantity: number;
  products: RoutineProduct | RoutineProduct[];
}

interface RoutineSupplier {
  id: string;
  name: string;
  is_active: boolean;
}

interface Routine {
  id: string;
  supplier_id: string;
  day_of_week: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  suppliers: RoutineSupplier | RoutineSupplier[];
  routine_order_items: RoutineItem[];
}

function unwrap<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

export function RoutineOrderManager({
  routines,
  suppliers,
}: {
  routines: Routine[];
  suppliers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');

  // Group routines by day_of_week
  const routinesByDay = new Map<string, Routine[]>();
  for (const day of DAYS_OF_WEEK) {
    routinesByDay.set(day, []);
  }
  for (const routine of routines) {
    const dayRoutines = routinesByDay.get(routine.day_of_week) ?? [];
    dayRoutines.push(routine);
    routinesByDay.set(routine.day_of_week, dayRoutines);
  }

  const daysWithRoutines = DAYS_OF_WEEK.filter(
    (day) => (routinesByDay.get(day) ?? []).length > 0
  );

  async function handleCreate() {
    if (!selectedSupplier || !selectedDay) return;
    setCreating(true);

    const result = await createRoutineOrder({
      supplierId: selectedSupplier,
      dayOfWeek: selectedDay as DayOfWeek,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.createSuccess);
      setCreateOpen(false);
      setSelectedSupplier('');
      setSelectedDay('');
      router.refresh();
    }
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/orders">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeftIcon className="size-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{de.routineOrders.title}</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <PlusIcon className="size-4 mr-1" />
            {de.routineOrders.newRoutine}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{de.routineOrders.newRoutine}</DialogTitle>
              <DialogDescription>
                {de.routineOrders.noRoutinesDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{de.routineOrders.supplier}</Label>
                <Select value={selectedSupplier} onValueChange={(v) => v && setSelectedSupplier(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={de.routineOrders.selectSupplier} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{de.routineOrders.dayOfWeek}</Label>
                <Select value={selectedDay} onValueChange={(v) => v && setSelectedDay(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={de.routineOrders.selectDay} />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day} value={day}>
                        {DAY_OF_WEEK_LABELS[day]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {de.common.cancel}
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={creating || !selectedSupplier || !selectedDay}
              >
                {creating ? de.common.loading : de.common.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-8">
          <p className="font-medium mb-1">{de.routineOrders.noRoutines}</p>
          <p className="text-sm text-muted-foreground">
            {de.routineOrders.noRoutinesDescription}
          </p>
        </div>
      ) : (
        <Accordion multiple defaultValue={daysWithRoutines}>
          {DAYS_OF_WEEK.map((day) => {
            const dayRoutines = routinesByDay.get(day) ?? [];
            if (dayRoutines.length === 0) return null;

            return (
              <AccordionItem key={day} value={day}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    {DAY_OF_WEEK_LABELS[day]}
                    <Badge variant="secondary" className="text-xs">
                      {dayRoutines.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {dayRoutines.map((routine) => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        onChanged={() => router.refresh()}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function RoutineCard({
  routine,
  onChanged,
}: {
  routine: Routine;
  onChanged: () => void;
}) {
  const supplier = unwrap(routine.suppliers);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRoutineOrder(routine.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.deleteSuccess);
      setDeleteOpen(false);
      onChanged();
    }
    setDeleting(false);
  }

  async function handleToggleActive() {
    setToggling(true);
    const result = await updateRoutineOrder({
      routineId: routine.id,
      isActive: !routine.is_active,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.updateSuccess);
      onChanged();
    }
    setToggling(false);
  }

  async function handleRemoveItem(itemId: string) {
    const result = await removeRoutineOrderItem(itemId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.itemRemovedSuccess);
      onChanged();
    }
  }

  return (
    <Card className={!routine.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{supplier.name}</CardTitle>
            <Badge variant={routine.is_active ? 'default' : 'secondary'}>
              {routine.is_active ? de.routineOrders.active : de.routineOrders.inactive}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {routine.is_active ? de.suppliers.deactivate : de.suppliers.activate}
            </Button>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger render={<Button size="icon-sm" variant="destructive" />}>
                <TrashIcon className="size-3.5" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{de.routineOrders.deleteRoutine}</DialogTitle>
                  <DialogDescription>
                    {de.routineOrders.deleteConfirm}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    {de.common.cancel}
                  </DialogClose>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? de.common.loading : de.common.delete}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {routine.routine_order_items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{de.routineOrders.noRoutinesDescription}</p>
          ) : (
            routine.routine_order_items.map((item) => {
              const product = unwrap(item.products);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2 text-sm"
                >
                  <span className={!product.is_active ? 'line-through text-muted-foreground' : ''}>
                    {product.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.default_quantity} {product.unit ?? ''}
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <AddProductButton
            routineOrderId={routine.id}
            open={addProductOpen}
            onOpenChange={setAddProductOpen}
            onAdded={onChanged}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AddProductButton({
  routineOrderId,
  open,
  onOpenChange,
  onAdded,
}: {
  routineOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [products, setProducts] = useState<Array<{ id: string; name: string; unit: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [adding, setAdding] = useState(false);

  async function loadProducts() {
    setLoading(true);
    const result = await getAvailableProductsForRoutine(routineOrderId);
    if (result.data) {
      setProducts(result.data);
    }
    setLoading(false);
  }

  function handleOpen(isOpen: boolean) {
    onOpenChange(isOpen);
    if (isOpen) {
      setSelectedProduct('');
      setQuantity('');
      loadProducts();
    }
  }

  async function handleAdd() {
    if (!selectedProduct || !quantity) return;
    const parsed = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(de.errors.invalidInput);
      return;
    }

    setAdding(true);
    const result = await addRoutineOrderItem({
      routineOrderId,
      productId: selectedProduct,
      defaultQuantity: parsed,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.itemAddedSuccess);
      onOpenChange(false);
      onAdded();
    }
    setAdding(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="w-full" />}>
        <PlusIcon className="size-4 mr-1" />
        {de.routineOrders.addProduct}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{de.routineOrders.addProduct}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">{de.common.loading}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{de.routineOrders.selectProduct}</Label>
              <Select value={selectedProduct} onValueChange={(v) => v && setSelectedProduct(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={de.routineOrders.selectProduct} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{de.routineOrders.defaultQuantity}</Label>
              <Input
                type="number"
                min="0.01"
                step="1"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {de.common.cancel}
          </DialogClose>
          <Button
            onClick={handleAdd}
            disabled={adding || !selectedProduct || !quantity}
          >
            {adding ? de.common.loading : de.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
