'use client';

import { AlertTriangle } from 'lucide-react';
import type { Ref } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  inputRef?: Ref<HTMLInputElement>;
  onStockFocus?: () => void;
  onStockNext?: () => void;
  onMissingToggle: () => void;
  onCheckToggle: (checked: boolean) => void;
}

export function ChecklistItemRow({
  item,
  state,
  isReadOnly,
  onStockChange,
  onStockBlur,
  inputRef,
  onStockFocus,
  onStockNext,
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
        'grid grid-cols-[minmax(0,1fr)_72px_48px] items-center gap-2 border-b border-border/40 px-2 py-2 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(132px,160px)_88px_44px] sm:gap-3',
        state.isMissing && 'border-l-4 border-l-rose-400 bg-rose-50/80 dark:bg-rose-950/20',
        state.saveState === 'saving' && 'opacity-70',
        state.saveState === 'error' && 'ring-1 ring-destructive/40'
      )}
      data-checklist-row={item.id}
    >
      <div className="col-span-3 min-w-0 flex flex-col gap-1 leading-tight sm:col-span-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'break-words text-base font-semibold text-foreground sm:text-sm',
              state.isMissing && 'text-rose-950 dark:text-rose-200'
            )}
          >
            {item.product_name}
          </span>
          {state.isMissing && (
            <Badge variant="outline" className="h-5 border-rose-300 bg-rose-100 px-2 text-[0.68rem] text-rose-800">
              <AlertTriangle className="h-3 w-3" />
              {de.checklist.missing}
            </Badge>
          )}
        </div>
        <span className="truncate text-[11px] text-muted-foreground">
          Min. {minStockDisplay} {unitLabel}
        </span>
      </div>

      <div className="col-span-1 sm:col-span-1">
        <Input
          ref={inputRef}
          data-stock-input={item.id}
          type="text"
          inputMode="text"
          maxLength={100}
          value={state.currentStock}
          onChange={(event) => onStockChange(event.target.value)}
          onBlur={onStockBlur}
          onFocus={onStockFocus}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && onStockNext) {
              event.preventDefault();
              onStockNext();
            }
          }}
          enterKeyHint="next"
          placeholder="z.B. 3 Stück"
          aria-label={`${de.checklist.stock}: ${item.product_name}`}
          className="h-12 w-full text-base font-medium md:h-10 md:text-sm"
          disabled={isReadOnly}
        />
      </div>

      <Button
        variant={state.isMissing ? 'default' : 'outline'}
        size="sm"
        onClick={onMissingToggle}
        disabled={isReadOnly}
        className={cn(
          'h-12 w-full text-xs font-bold sm:h-10 sm:w-[88px]',
          state.isMissing &&
            'border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-600 dark:bg-red-600 dark:hover:bg-red-700'
        )}
        title={`${de.checklist.missing}: ${item.product_name}`}
        aria-pressed={state.isMissing}
        aria-label={`${de.checklist.missing}: ${item.product_name}`}
      >
        {de.checklist.missing}
      </Button>

      <div className="flex h-12 w-12 items-center justify-center sm:h-10 sm:w-10">
        <Checkbox
          checked={state.isChecked}
          onCheckedChange={(checked) => onCheckToggle(checked === true)}
          disabled={isReadOnly}
          aria-label={`${de.checklist.checked}: ${item.product_name}`}
          className="size-6 after:-inset-y-3 sm:after:-inset-y-2"
        />
      </div>
    </div>
  );
}
