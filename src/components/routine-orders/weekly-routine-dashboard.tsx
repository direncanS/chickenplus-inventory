'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { de } from '@/i18n/de';
import { DAY_OF_WEEK_LABELS, type DayOfWeek } from '@/lib/constants';
import { getISOWeekMonday } from '@/lib/utils/date';
import { toast } from 'sonner';
import {
  generateRoutineInstances,
  confirmRoutineInstance,
  skipRoutineInstance,
  adjustRoutineInstanceItem,
} from '@/app/(app)/orders/routine-actions';

interface InstanceProduct {
  id: string;
  name: string;
  unit: string | null;
}

interface InstanceItem {
  id: string;
  product_id: string;
  default_quantity: number;
  adjusted_quantity: number | null;
  is_included: boolean;
  products: InstanceProduct | InstanceProduct[];
}

interface InstanceRoutineOrder {
  id: string;
  supplier_id: string;
  day_of_week: string;
  is_active: boolean;
  suppliers: { id: string; name: string } | Array<{ id: string; name: string }>;
}

interface RoutineInstance {
  id: string;
  routine_order_id: string;
  checklist_id: string | null;
  order_id: string | null;
  iso_year: number;
  iso_week: number;
  scheduled_date: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  routine_orders: InstanceRoutineOrder | InstanceRoutineOrder[];
  routine_order_instance_items: InstanceItem[];
}

interface ChecklistItem {
  product_id: string;
  product_name: string;
  is_missing: boolean;
  missing_amount_final: number | null;
}

function unwrap<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

export function WeeklyRoutineDashboard({
  instances,
  activeChecklist,
  checklistItems,
  isoYear,
  isoWeek,
  hasActiveRoutines,
}: {
  instances: RoutineInstance[];
  activeChecklist: {
    id: string;
    iso_year: number;
    iso_week: number;
    status: string;
  } | null;
  checklistItems: ChecklistItem[];
  isoYear: number;
  isoWeek: number;
  hasActiveRoutines: boolean;
}) {
  const [generating, setGenerating] = useState(false);

  const checklistCompleted = activeChecklist?.status === 'completed';

  // Build a map of missing products from checklist
  const missingProductMap = new Map<string, ChecklistItem>();
  for (const item of checklistItems) {
    if (item.is_missing) {
      missingProductMap.set(item.product_id, item);
    }
  }

  // Separate instances by resolution status
  const pendingInstances = instances.filter(
    (i) => i.status === 'pending' && i.order_id == null
  );
  const resolvedInstances = instances.filter(
    (i) => i.status === 'skipped' || i.order_id != null
  );

  // Find gap products: missing in checklist but NOT covered by any routine instance
  const routineCoveredProducts = new Set<string>();
  for (const instance of instances) {
    if (instance.status === 'skipped') continue;
    for (const item of instance.routine_order_instance_items) {
      if (item.is_included) {
        routineCoveredProducts.add(item.product_id);
      }
    }
  }
  const gapProducts = checklistItems.filter(
    (item) => item.is_missing && !routineCoveredProducts.has(item.product_id)
  );

  async function handlePrepareWeek() {
    setGenerating(true);
    const weekStart = getISOWeekMonday(isoYear, isoWeek);
    const result = await generateRoutineInstances({
      isoYear,
      isoWeek,
      weekStartDate: weekStart,
      checklistId: activeChecklist?.id ?? null,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      const created = result.instancesCreated ?? 0;
      const backfilled = result.instancesBackfilled ?? 0;
      if (created === 0 && backfilled === 0) {
        toast.info(de.routineOrders.noInstancesNeeded);
      } else {
        toast.success(
          de.routineOrders.instancesGenerated
            .replace('{created}', String(created))
            .replace('{backfilled}', String(backfilled))
        );
      }
    }
    setGenerating(false);
  }

  // Don't show anything if no routines exist and no instances
  if (!hasActiveRoutines && instances.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {de.routineOrders.weeklyDashboardTitle.replace('{week}', String(isoWeek))}
        </h2>
        {hasActiveRoutines && (
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrepareWeek}
            disabled={generating}
          >
            {generating ? de.routineOrders.preparing : de.routineOrders.prepareWeek}
          </Button>
        )}
      </div>

      {instances.length === 0 && hasActiveRoutines && (
        <p className="text-sm text-muted-foreground">
          {de.routineOrders.noPendingRoutines}
        </p>
      )}

      {pendingInstances.length > 0 && (
        <div className="space-y-3">
          {pendingInstances.map((instance) => (
            <RoutineInstanceCard
              key={instance.id}
              instance={instance}
              checklistCompleted={checklistCompleted}
              checklistId={activeChecklist?.id ?? null}
              missingProductMap={missingProductMap}
              onChanged={() => {}}
            />
          ))}
        </div>
      )}

      {checklistCompleted && gapProducts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-800">
            {de.routineOrders.gapsWarning.replace('{count}', String(gapProducts.length))}
          </p>
          <p className="text-amber-700 mt-1">{de.routineOrders.seeSuggestions}</p>
        </div>
      )}

      {resolvedInstances.length > 0 && (
        <div className="space-y-2">
          {resolvedInstances.map((instance) => {
            const routine = unwrap(instance.routine_orders);
            const supplier = unwrap(routine.suppliers);
            const dayLabel = DAY_OF_WEEK_LABELS[routine.day_of_week as DayOfWeek] ?? routine.day_of_week;

            return (
              <div key={instance.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 p-3 opacity-60">
                <span className="text-sm">
                  {dayLabel} &mdash; {supplier.name}
                </span>
                <Badge variant={instance.status === 'skipped' ? 'secondary' : 'outline'}>
                  {instance.order_id ? de.routineOrders.confirmed : de.routineOrders.skipped}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {instances.length > 0 && pendingInstances.length === 0 && (
        <p className="text-sm text-muted-foreground">{de.routineOrders.allResolved}</p>
      )}
    </div>
  );
}

function RoutineInstanceCard({
  instance,
  checklistCompleted,
  checklistId,
  missingProductMap,
  onChanged,
}: {
  instance: RoutineInstance;
  checklistCompleted: boolean;
  checklistId: string | null;
  missingProductMap: Map<string, ChecklistItem>;
  onChanged: () => void;
}) {
  const routine = unwrap(instance.routine_orders);
  const supplier = unwrap(routine.suppliers);
  const dayLabel = DAY_OF_WEEK_LABELS[routine.day_of_week as DayOfWeek] ?? routine.day_of_week;

  const [confirming, setConfirming] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const actionsDisabled = !checklistCompleted || !checklistId;

  async function handleConfirm() {
    if (!checklistId) return;
    setConfirming(true);
    const result = await confirmRoutineInstance({
      instanceId: instance.id,
      checklistId,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.confirmSuccess);
      onChanged();
    }
    setConfirming(false);
  }

  async function handleSkip() {
    if (!checklistId) return;
    setSkipping(true);
    const result = await skipRoutineInstance({
      instanceId: instance.id,
      checklistId,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.routineOrders.skipSuccess);
      onChanged();
    }
    setSkipping(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">
              {dayLabel} &mdash; {supplier.name}
            </CardTitle>
          </div>
          <Badge variant="secondary">{de.routineOrders.pending}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!checklistCompleted && (
          <p className="text-sm text-amber-600 mb-3">{de.routineOrders.checklistRequired}</p>
        )}

        <div className="space-y-2">
          {/* Comparison table header */}
          {checklistCompleted && (
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
              <span>{de.checklist.product}</span>
              <span className="text-right w-20">{de.routineOrders.routineQuantity}</span>
              <span className="text-right w-20">{de.routineOrders.weeklyNeed}</span>
              <span className="text-right w-20">{de.routineOrders.coverage}</span>
            </div>
          )}

          {instance.routine_order_instance_items.map((item) => {
            const product = unwrap(item.products);
            const missingInfo = missingProductMap.get(item.product_id);
            const effectiveQty = item.adjusted_quantity ?? item.default_quantity;

            let coverageLabel = '';
            let coverageColor = '';
            if (checklistCompleted) {
              if (missingInfo) {
                coverageLabel = de.routineOrders.covered;
                coverageColor = 'text-green-600';
              } else {
                coverageLabel = de.routineOrders.excess;
                coverageColor = 'text-blue-600';
              }
            }

            return (
              <InstanceItemRow
                key={item.id}
                item={item}
                product={product}
                missingInfo={missingInfo}
                effectiveQty={effectiveQty}
                coverageLabel={coverageLabel}
                coverageColor={coverageColor}
                checklistCompleted={checklistCompleted}
                isPending={instance.status === 'pending' && instance.order_id == null}
              />
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={actionsDisabled || confirming || skipping}
          >
            {confirming ? de.common.loading : de.routineOrders.confirmInstance}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkip}
            disabled={actionsDisabled || confirming || skipping}
          >
            {skipping ? de.common.loading : de.routineOrders.skipInstance}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InstanceItemRow({
  item,
  product,
  missingInfo,
  effectiveQty,
  coverageLabel,
  coverageColor,
  checklistCompleted,
  isPending,
}: {
  item: InstanceItem;
  product: InstanceProduct;
  missingInfo: ChecklistItem | undefined;
  effectiveQty: number;
  coverageLabel: string;
  coverageColor: string;
  checklistCompleted: boolean;
  isPending: boolean;
}) {
  const [localIncluded, setLocalIncluded] = useState(item.is_included);
  const [localQuantity, setLocalQuantity] = useState(
    item.adjusted_quantity != null ? String(item.adjusted_quantity) : ''
  );
  const [saving, setSaving] = useState(false);

  async function handleToggleIncluded(checked: boolean) {
    setLocalIncluded(checked);
    setSaving(true);
    const result = await adjustRoutineInstanceItem({
      itemId: item.id,
      isIncluded: checked,
    });
    if (result.error) {
      toast.error(result.error);
      setLocalIncluded(!checked);
    }
    setSaving(false);
  }

  async function handleQuantityBlur() {
    const trimmed = localQuantity.trim().replace(',', '.');
    if (trimmed === '') {
      // Reset to default
      if (item.adjusted_quantity != null) {
        setSaving(true);
        await adjustRoutineInstanceItem({
          itemId: item.id,
          adjustedQuantity: null,
        });
        setSaving(false);
      }
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(de.errors.invalidInput);
      setLocalQuantity(item.adjusted_quantity != null ? String(item.adjusted_quantity) : '');
      return;
    }
    if (parsed !== item.adjusted_quantity) {
      setSaving(true);
      const result = await adjustRoutineInstanceItem({
        itemId: item.id,
        adjustedQuantity: parsed,
      });
      if (result.error) {
        toast.error(result.error);
        setLocalQuantity(item.adjusted_quantity != null ? String(item.adjusted_quantity) : '');
      }
      setSaving(false);
    }
  }

  if (checklistCompleted) {
    return (
      <div className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-sm py-1 ${!localIncluded ? 'opacity-50' : ''}`}>
        <label className="flex items-center gap-2 min-w-0">
          {isPending && (
            <Checkbox
              checked={localIncluded}
              disabled={saving}
              onCheckedChange={(checked) => handleToggleIncluded(checked === true)}
            />
          )}
          <span className={!localIncluded ? 'line-through' : ''}>{product.name}</span>
        </label>
        <div className="flex items-center gap-1 w-20 justify-end">
          {isPending && localIncluded ? (
            <Input
              type="number"
              min="0.01"
              step="1"
              className="w-16 h-7 text-xs text-right"
              value={localQuantity}
              placeholder={String(item.default_quantity)}
              onChange={(e) => setLocalQuantity(e.target.value)}
              onBlur={handleQuantityBlur}
              disabled={saving}
            />
          ) : (
            <span className="font-mono text-xs">{effectiveQty}</span>
          )}
          <span className="text-xs text-muted-foreground">{product.unit ?? ''}</span>
        </div>
        <span className="text-xs text-right w-20">
          {missingInfo
            ? `${missingInfo.missing_amount_final ?? '?'} fehlt`
            : '\u2014'
          }
        </span>
        <span className={`text-xs font-medium text-right w-20 ${coverageColor}`}>
          {coverageLabel}
        </span>
      </div>
    );
  }

  // Simple view without comparison
  return (
    <div className={`flex items-center justify-between gap-2 text-sm py-1 ${!localIncluded ? 'opacity-50' : ''}`}>
      <label className="flex items-center gap-2 min-w-0">
        {isPending && (
          <Checkbox
            checked={localIncluded}
            disabled={saving}
            onCheckedChange={(checked) => handleToggleIncluded(checked === true)}
          />
        )}
        <span className={!localIncluded ? 'line-through' : ''}>{product.name}</span>
      </label>
      <div className="flex items-center gap-1">
        {isPending && localIncluded ? (
          <Input
            type="number"
            min="0.01"
            step="1"
            className="w-16 h-7 text-xs text-right"
            value={localQuantity}
            placeholder={String(item.default_quantity)}
            onChange={(e) => setLocalQuantity(e.target.value)}
            onBlur={handleQuantityBlur}
            disabled={saving}
          />
        ) : (
          <span className="font-mono text-xs">{effectiveQty}</span>
        )}
        <span className="text-xs text-muted-foreground">{product.unit ?? ''}</span>
      </div>
    </div>
  );
}
