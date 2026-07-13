'use client';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { cn } from '@/lib/utils';
import type { ChecklistItemDraftState } from '@/lib/utils/checklist-batch';

interface ChecklistItemRowProps {
  item: {
    id: string;
    checklist_id: string;
    product_name: string;
    min_stock_snapshot: number | null;
    min_stock_max_snapshot: number | null;
    products: {
      unit: string | null;
    };
  };
  state: ChecklistItemDraftState;
  isReadOnly: boolean;
  onStockChange: (value: string) => void;
  onStockBlur: () => void;
  onMissingToggle: () => void;
  onCheckToggle: (checked: boolean) => void;
}

export function ChecklistItemRow({
  item,
  state,
  isReadOnly,
  onStockChange,
  onStockBlur,
  onMissingToggle,
  onCheckToggle,
}: ChecklistItemRowProps) {
  const unitLabels = de.unitsShort;

  const minStockDisplay = item.min_stock_max_snapshot
    ? `${item.min_stock_snapshot}-${item.min_stock_max_snapshot}`
    : item.min_stock_snapshot !== null
      ? String(item.min_stock_snapshot)
      : '-';

  const unitLabel = item.products.unit
    ? unitLabels[item.products.unit as keyof typeof unitLabels] ?? item.products.unit
    : '';

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_80px_44px_44px] sm:grid-cols-[1fr_100px_48px_48px] items-center gap-2 px-2 py-2 rounded-md transition-colors',
        state.isChecked && 'bg-muted/60',
        state.isMissing && !state.isChecked && 'bg-amber-50 dark:bg-amber-950/20',
        state.saveState === 'saving' && 'opacity-80',
        state.saveState === 'error' && 'ring-1 ring-destructive/40'
      )}
    >
      <div className="min-w-0">
        <span className={cn(
          'text-sm font-medium truncate block',
          state.isChecked && 'line-through text-muted-foreground'
        )}>{item.product_name}</span>
        <span className="text-xs text-muted-foreground">
          {minStockDisplay} {unitLabel}
        </span>
      </div>

      <Input
        type="text"
        value={state.currentStock}
        onChange={(event) => onStockChange(event.target.value)}
        onBlur={onStockBlur}
        placeholder={de.checklist.stock}
        className="h-9 text-center text-sm"
        disabled={isReadOnly}
      />

      <div className="flex justify-center">
        <Button
          variant={state.isMissing ? 'default' : 'outline'}
          size="icon"
          onClick={onMissingToggle}
          disabled={isReadOnly}
          className={cn(
            'size-9',
            state.isMissing && 'bg-green-600 hover:bg-green-700 text-white border-green-600'
          )}
          title={de.checklist.missing}
        >
          F
        </Button>
      </div>

      <div className="flex justify-center">
        <Checkbox
          checked={state.isChecked}
          onCheckedChange={(checked) => onCheckToggle(checked === true)}
          disabled={isReadOnly}
        />
      </div>
    </div>
  );
}
