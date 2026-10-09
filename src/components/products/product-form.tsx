'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UNIT_TYPES, type UnitType } from '@/lib/constants';
import { createProduct, updateProduct } from '@/app/(app)/products/actions';
import { de } from '@/i18n/de';
import type { ProductManagerData, ProductRow } from './product-manager';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRow | null;
  products: ProductManagerData['products'];
  storageLocations: ProductManagerData['storageLocations'];
  categories: ProductManagerData['categories'];
  suppliers: ProductManagerData['suppliers'];
  onSaved: () => void;
}

const NONE_VALUE = '__none__';

function numberToInput(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

function parseNumberInput(value: string) {
  if (value.trim() === '') return null;
  return Number(value);
}

export function ProductForm({
  open,
  onOpenChange,
  product,
  products,
  storageLocations,
  categories,
  suppliers,
  onSaved,
}: ProductFormProps) {
  const preferredSupplier = product?.product_suppliers.find((item) => item.is_preferred);
  const initialStorageLocationId = product?.storage_location_id ?? storageLocations[0]?.id ?? '';
  const initialCategoryId =
    product?.category_id ??
    categories.find((category) => category.storage_location_id === initialStorageLocationId)?.id ??
    '';
  const [name, setName] = useState(product?.name ?? '');
  const [storageLocationId, setStorageLocationId] = useState(initialStorageLocationId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [unit, setUnit] = useState<UnitType | typeof NONE_VALUE>(
    (product?.unit as UnitType | null) ?? NONE_VALUE
  );
  const [minStock, setMinStock] = useState(numberToInput(product?.min_stock));
  const [minStockMax, setMinStockMax] = useState(numberToInput(product?.min_stock_max));
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));
  const [preferredSupplierId, setPreferredSupplierId] = useState(
    preferredSupplier?.supplier_id ?? NONE_VALUE
  );
  const [complementOfId, setComplementOfId] = useState(product?.complement_of_id ?? NONE_VALUE);
  const [isPending, startTransition] = useTransition();

  const availableCategories = useMemo(
    () => categories.filter((category) => category.storage_location_id === storageLocationId),
    [categories, storageLocationId]
  );

  // Complement candidates: other products in the same category.
  const complementCandidates = useMemo(
    () =>
      products.filter(
        (candidate) => candidate.category_id === categoryId && candidate.id !== product?.id
      ),
    [products, categoryId, product?.id]
  );

  function handleStorageChange(value: string) {
    if (!value) return;
    setStorageLocationId(value);
    const firstCategory = categories.find((category) => category.storage_location_id === value);
    setCategoryId(firstCategory?.id ?? '');
    setComplementOfId(NONE_VALUE);
  }

  function handleCategoryChange(value: string) {
    if (!value) return;
    setCategoryId(value);
    setComplementOfId(NONE_VALUE);
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        name,
        storageLocationId,
        categoryId,
        unit: unit === NONE_VALUE ? null : unit,
        minStock: parseNumberInput(minStock),
        minStockMax: parseNumberInput(minStockMax),
        sortOrder: Number(sortOrder || 0),
        preferredSupplierId: preferredSupplierId === NONE_VALUE ? null : preferredSupplierId,
        complementOfId: complementOfId === NONE_VALUE ? null : complementOfId,
      };

      const result = product
        ? await updateProduct({
            ...payload,
            productId: product.id,
            isActive: product.is_active,
          })
        : await createProduct(payload);

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success(product ? de.products.updateSuccess : de.products.createSuccess);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-sm p-5">
        <DialogHeader>
          <DialogTitle>{product ? de.products.editProduct : de.products.addNew}</DialogTitle>
          <DialogDescription>{de.products.formDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 space-y-1.5 text-sm font-medium">
            {de.products.name}
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.storageLocation}
            <Select value={storageLocationId} onValueChange={(value) => handleStorageChange(value ?? '')}>
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder={de.products.selectStorageLocation} />
              </SelectTrigger>
              <SelectContent>
                {storageLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code} · {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.category}
            <Select value={categoryId} onValueChange={(value) => handleCategoryChange(value ?? '')}>
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder={de.products.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.unit}
            <Select
              value={unit}
              onValueChange={(value) => value && setUnit(value as UnitType | typeof NONE_VALUE)}
            >
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder={de.products.selectUnit} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{de.products.noUnit}</SelectItem>
                {UNIT_TYPES.map((unitType) => (
                  <SelectItem key={unitType} value={unitType}>
                    {unitType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.sortOrder}
            <Input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.minStock}
            <Input
              type="number"
              min={0}
              step="0.01"
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            {de.products.minStockMax}
            <Input
              type="number"
              min={0}
              step="0.01"
              value={minStockMax}
              onChange={(event) => setMinStockMax(event.target.value)}
            />
          </label>

          <label className="sm:col-span-2 space-y-1.5 text-sm font-medium">
            {de.products.preferredSupplier}
            <Select value={preferredSupplierId} onValueChange={(value) => value && setPreferredSupplierId(value)}>
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder={de.products.selectSupplier} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{de.products.noPreferredSupplier}</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="sm:col-span-2 space-y-1.5 text-sm font-medium">
            {de.products.complementOf}
            <Select
              value={complementOfId}
              onValueChange={(value) => value && setComplementOfId(value)}
              disabled={complementCandidates.length === 0}
            >
              <SelectTrigger className="text-base md:text-sm">
                <SelectValue placeholder={de.products.noComplement} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{de.products.noComplement}</SelectItem>
                {complementCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="block text-xs font-normal text-muted-foreground">
              {de.products.complementHint}
            </span>
          </label>
        </div>

        <DialogFooter className="rounded-b-sm">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {de.common.cancel}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? de.common.loading : de.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
