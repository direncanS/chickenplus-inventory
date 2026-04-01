'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
    current_stock: number | null;
    missing_amount_calculated: number | null;
    missing_amount_final: number | null;
    is_missing_overridden: boolean;
    is_checked: boolean;
    products: {
      unit: string | null;
    };
  };
  isReadOnly: boolean;
  onCheckChange: (itemId: string, checked: boolean) => void;
}

export function ChecklistItemRow({ item, isReadOnly, onCheckChange }: ChecklistItemRowProps) {
  const [currentStock, setCurrentStock] = useState<string>(
    item.current_stock !== null ? String(item.current_stock) : ''
  );
  const [missingFinal, setMissingFinal] = useState<string>(
    item.missing_amount_final !== null ? String(item.missing_amount_final) : ''
  );
  const [isChecked, setIsChecked] = useState(item.is_checked);
  const [isOverridden, setIsOverridden] = useState(item.is_missing_overridden);
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
    async (stock: string, fehlt: string | undefined, checked: boolean, overridden: boolean) => {
      const version = ++requestVersionRef.current;
      const stockNum = stock === '' ? null : parseFloat(stock);

      // Double-submit prevention
      const valueKey = `${stock}|${fehlt}|${checked}|${overridden}`;
      if (valueKey === lastSavedValueRef.current) return;

      setSaving(true);
      const result = await updateChecklistItem({
        checklistItemId: item.id,
        currentStock: stockNum,
        missingAmountFinal: fehlt !== undefined && fehlt !== '' ? parseFloat(fehlt) : undefined,
        isMissingOverridden: overridden,
        isChecked: checked,
      });

      // Stale write protection
      if (version !== requestVersionRef.current) {
        setSaving(false);
        return;
      }

      if (result.error) {
        toast.error(de.checklist.saveFailed);
      } else if (result.data) {
        lastSavedValueRef.current = valueKey;
        // Update local state from server response
        if (result.data.missing_amount_final !== null && !overridden) {
          setMissingFinal(String(result.data.missing_amount_final));
        }
      }
      setSaving(false);
    },
    [item.id]
  );

  function debouncedSave(stock: string, fehlt: string | undefined, checked: boolean, overridden: boolean) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveItem(stock, fehlt, checked, overridden);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function handleStockChange(value: string) {
    setCurrentStock(value);
    if (!isOverridden) {
      // Auto-calculate missing
      const stock = value === '' ? null : parseFloat(value);
      if (stock !== null && item.min_stock_snapshot !== null) {
        const calc = Math.max(0, item.min_stock_snapshot - stock);
        setMissingFinal(calc > 0 ? String(calc) : '0');
      } else {
        setMissingFinal('');
      }
    }
    debouncedSave(value, isOverridden ? missingFinal : undefined, isChecked, isOverridden);
  }

  function handleMissingChange(value: string) {
    setMissingFinal(value);
    const newOverridden = value !== '';
    setIsOverridden(newOverridden);
    debouncedSave(currentStock, value || undefined, isChecked, newOverridden);
  }

  function handleMissingClear() {
    // Clear override: recalculate
    setIsOverridden(false);
    const stock = currentStock === '' ? null : parseFloat(currentStock);
    if (stock !== null && item.min_stock_snapshot !== null) {
      const calc = Math.max(0, item.min_stock_snapshot - stock);
      setMissingFinal(calc > 0 ? String(calc) : '0');
    } else {
      setMissingFinal('');
    }
    saveItem(currentStock, undefined, isChecked, false);
  }

  function handleCheckToggle(checked: boolean) {
    setIsChecked(checked);
    onCheckChange(item.id, checked);
    // Save immediately on check toggle
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveItem(currentStock, isOverridden ? missingFinal : undefined, checked, isOverridden);
  }

  function handleBlur() {
    // Immediate save on blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveItem(currentStock, isOverridden ? missingFinal : undefined, isChecked, isOverridden);
  }

  const hasMissing = missingFinal !== '' && parseFloat(missingFinal) > 0;

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto_60px_60px_32px] sm:grid-cols-[1fr_auto_80px_80px_32px] items-center gap-2 px-2 py-1.5 rounded-md',
        isChecked && 'bg-muted/50',
        hasMissing && !isChecked && 'bg-destructive/5'
      )}
    >
      {/* Product name + unit */}
      <div className="min-w-0">
        <span className="text-sm font-medium truncate block">{item.product_name}</span>
        <span className="text-xs text-muted-foreground">
          {minStockDisplay} {unitLabel}
        </span>
      </div>

      {/* Override indicator */}
      <div className="w-4">
        {isOverridden && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 cursor-pointer"
            onClick={isReadOnly ? undefined : handleMissingClear}
            title={de.checklist.overrideActive}
          >
            !
          </Badge>
        )}
      </div>

      {/* Bestand input */}
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={currentStock}
        onChange={(e) => handleStockChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={de.checklist.stock}
        className="h-8 text-center text-sm"
        disabled={isReadOnly}
      />

      {/* Fehlt input */}
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={missingFinal}
        onChange={(e) => handleMissingChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={de.checklist.missing}
        className={cn(
          'h-8 text-center text-sm',
          hasMissing && 'text-destructive font-medium'
        )}
        disabled={isReadOnly}
      />

      {/* Checkbox */}
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
