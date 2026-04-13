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
        'grid grid-cols-1 gap-3 rounded-[24px] border border-border/70 bg-white/90 p-3 shadow-[0_10px_30px_-24px_rgba(38,32,29,0.35)] transition-colors sm:grid-cols-[minmax(0,1fr)_124px_64px_56px] sm:items-center sm:gap-3 sm:p-3.5',
        state.isChecked && 'bg-muted/58',
        state.isMissing && !state.isChecked && 'border-amber-200 bg-amber-50/95 dark:bg-amber-950/20',
        state.saveState === 'saving' && 'opacity-80',
        state.saveState === 'error' && 'ring-1 ring-destructive/40'
      )}
    >
      <div className="min-w-0 space-y-1">
        <span className={cn(
          'block truncate text-[0.96rem] font-semibold tracking-tight',
          state.isChecked && 'line-through text-muted-foreground'
        )}>{item.product_name}</span>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            Min. {minStockDisplay} {unitLabel}
          </span>
          {state.isMissing && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
              {de.checklist.missing}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:contents">
        <Input
          type="text"
          value={state.currentStock}
          onChange={(event) => onStockChange(event.target.value)}
          onBlur={onStockBlur}
          placeholder={de.checklist.stock}
          className="h-11 text-center text-sm sm:h-12"
          disabled={isReadOnly}
        />

        <div className="flex justify-center">
          <Button
            variant={state.isMissing ? 'default' : 'outline'}
            size="icon"
            onClick={onMissingToggle}
            disabled={isReadOnly}
            className={cn(
              'size-11 text-sm font-bold sm:size-12',
              state.isMissing && 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-[0_14px_26px_-22px_rgba(217,119,6,0.8)]'
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
            className="size-6 sm:size-5"
          />
        </div>
      </div>
    </div>
  );
}
