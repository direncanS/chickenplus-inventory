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
        'grid grid-cols-[minmax(0,1fr)_72px_44px_44px] items-center gap-2 border-b border-border/40 px-2 py-1 transition-colors',
        state.isChecked && 'bg-muted/40',
        state.isMissing && !state.isChecked && 'bg-amber-50/70 dark:bg-amber-950/20',
        state.saveState === 'saving' && 'opacity-70',
        state.saveState === 'error' && 'ring-1 ring-destructive/40'
      )}
    >
      <div className="min-w-0 flex flex-col leading-tight">
        <span className={cn(
          'truncate text-sm font-medium',
          state.isChecked && 'line-through text-muted-foreground'
        )}>
          {item.product_name}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          Min. {minStockDisplay} {unitLabel}
        </span>
      </div>

      <Input
        type="text"
        inputMode="decimal"
        value={state.currentStock}
        onChange={(event) => onStockChange(event.target.value)}
        onBlur={onStockBlur}
        placeholder="—"
        aria-label={de.checklist.stock}
        className="h-9 w-full text-center text-sm"
        disabled={isReadOnly}
      />

      <Button
        variant={state.isMissing ? 'default' : 'outline'}
        size="icon"
        onClick={onMissingToggle}
        disabled={isReadOnly}
        className={cn(
          'h-9 w-9 text-sm font-bold',
          state.isMissing && 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
        )}
        title={de.checklist.missing}
        aria-pressed={state.isMissing}
        aria-label={de.checklist.missing}
      >
        F
      </Button>

      <div className="flex h-9 w-9 items-center justify-center">
        <Checkbox
          checked={state.isChecked}
          onCheckedChange={(checked) => onCheckToggle(checked === true)}
          disabled={isReadOnly}
          aria-label={de.checklist.checked}
          className="size-6"
        />
      </div>
    </div>
  );
}
