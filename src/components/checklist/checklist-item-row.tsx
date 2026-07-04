'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { updateChecklistItem } from '@/app/(app)/checklist/actions';
import { toast } from 'sonner';
import { de } from '@/i18n/de';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ChecklistItemRowProps {
  item: {
    id: string;
    checklist_id: string;
    product_name: string;
    min_stock_snapshot: number | null;
    min_stock_max_snapshot: number | null;
    current_stock: string | null;
    is_missing: boolean;
    is_checked: boolean;
    products: {
      unit: string | null;
    };
  };
  isReadOnly: boolean;
  onCheckChange: (itemId: string, checked: boolean) => void;
}

export function ChecklistItemRow({ item, isReadOnly, onCheckChange }: ChecklistItemRowProps) {
  const [currentStock, setCurrentStock] = useState<string>(item.current_stock ?? '');
  const [isMissing, setIsMissing] = useState(item.is_missing);
  const [isChecked, setIsChecked] = useState(item.is_checked);
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedValueRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);

  const unitLabels = de.unitsShort;

  const minStockDisplay = item.min_stock_max_snapshot
    ? `${item.min_stock_snapshot}-${item.min_stock_max_snapshot}`
    : item.min_stock_snapshot !== null
      ? String(item.min_stock_snapshot)
      : '-';

  const unitLabel = item.products.unit ? unitLabels[item.products.unit as keyof typeof unitLabels] ?? item.products.unit : '';

  const saveItem = useCallback(
    async (stock: string, missing: boolean, checked: boolean) => {
      const version = ++requestVersionRef.current;

      // Double-submit prevention
      const valueKey = `${stock}|${missing}|${checked}`;
      if (valueKey === lastSavedValueRef.current) return;

      setSaving(true);
      const result = await updateChecklistItem({
        checklistItemId: item.id,
        currentStock: stock === '' ? null : stock,
        isMissing: missing,
        isChecked: checked,
      });

      // Stale write protection
      if (version !== requestVersionRef.current) {
        setSaving(false);
        return;
      }

      if (result.error) {
        toast.error(de.checklist.saveFailed);
      } else {
        lastSavedValueRef.current = valueKey;
      }
      setSaving(false);
    },
    [item.id]
  );

  function debouncedSave(stock: string, missing: boolean, checked: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveItem(stock, missing, checked);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function handleStockChange(value: string) {
    setCurrentStock(value);
    debouncedSave(value, isMissing, isChecked);
  }

  function handleMissingToggle() {
    const newMissing = !isMissing;
    setIsMissing(newMissing);
    // Save immediately on toggle
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveItem(currentStock, newMissing, isChecked);
  }

  function handleCheckToggle(checked: boolean) {
    setIsChecked(checked);
    onCheckChange(item.id, checked);
    // Save immediately on check toggle
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveItem(currentStock, isMissing, checked);
  }

  function handleBlur() {
    // Immediate save on blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveItem(currentStock, isMissing, isChecked);
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_80px_40px_40px] sm:grid-cols-[1fr_100px_48px_48px] items-center gap-2 px-2 py-1.5 rounded-md',
        isChecked && 'bg-muted/50',
        isMissing && !isChecked && 'bg-destructive/5'
      )}
    >
      {/* Product name + unit */}
      <div className="min-w-0">
        <span className="text-sm font-medium truncate block">{item.product_name}</span>
        <span className="text-xs text-muted-foreground">
          {minStockDisplay} {unitLabel}
        </span>
      </div>

      {/* Bestand input (free text) */}
      <Input
        type="text"
        value={currentStock}
        onChange={(e) => handleStockChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={de.checklist.stock}
        className="h-8 text-center text-sm"
        disabled={isReadOnly}
      />

      {/* Fehlt toggle button */}
      <div className="flex justify-center">
        <Button
          variant={isMissing ? 'default' : 'outline'}
          size="icon-sm"
          onClick={handleMissingToggle}
          disabled={isReadOnly}
          className={cn(
            isMissing && 'bg-green-600 hover:bg-green-700 text-white border-green-600',
            saving && 'opacity-50'
          )}
          title={de.checklist.missing}
        >
          F
        </Button>
      </div>

      {/* Geprüft checkbox */}
      <div className="flex justify-center">
        <Checkbox
          checked={isChecked}
          onCheckedChange={(checked) => handleCheckToggle(checked === true)}
          disabled={isReadOnly}
          className={cn(saving && 'opacity-50')}
        />
      </div>
    </div>
  );
}
