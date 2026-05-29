'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
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
        'grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 border-b border-border/40 px-2 py-2 transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(132px,160px)_88px_44px]',
        state.isChecked && 'bg-emerald-50/45 dark:bg-emerald-950/15',
        state.isMissing && 'border-l-4 border-l-amber-500 bg-amber-50/90 dark:bg-amber-950/25',
        state.saveState === 'saving' && 'opacity-70',
        state.saveState === 'error' && 'ring-1 ring-destructive/40'
      )}
    >
      <div className="min-w-0 flex flex-col gap-1 leading-tight">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'truncate text-sm font-semibold text-foreground',
              state.isMissing && 'text-amber-950 dark:text-amber-200'
            )}
          >
            {item.product_name}
          </span>
          {state.isMissing && (
            <Badge variant="outline" className="h-5 border-amber-300 bg-amber-100 px-2 text-[0.68rem] text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              {de.checklist.missing}
            </Badge>
          )}
          {state.isChecked && (
            <Badge variant="outline" className="h-5 border-emerald-300 bg-emerald-50 px-2 text-[0.68rem] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {de.checklist.checked}
            </Badge>
          )}
        </div>
        <span className="truncate text-[11px] text-muted-foreground">
          Min. {minStockDisplay} {unitLabel}
        </span>
      </div>

      <div className="col-span-2 sm:col-span-1">
        <Input
          type="text"
          inputMode="text"
          maxLength={100}
          value={state.currentStock}
          onChange={(event) => onStockChange(event.target.value)}
          onBlur={onStockBlur}
          placeholder="z.B. 3 Stück"
          aria-label={de.checklist.stock}
          className="h-10 w-full text-sm font-medium"
          disabled={isReadOnly}
        />
      </div>

      <Button
        variant={state.isMissing ? 'default' : 'outline'}
        size="sm"
        onClick={onMissingToggle}
        disabled={isReadOnly}
        className={cn(
          'h-10 w-full text-xs font-bold sm:w-[88px]',
          state.isMissing && 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'
        )}
        title={de.checklist.missing}
        aria-pressed={state.isMissing}
        aria-label={de.checklist.missing}
      >
        {de.checklist.missing}
      </Button>

      <div className="flex h-10 w-10 items-center justify-center">
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
