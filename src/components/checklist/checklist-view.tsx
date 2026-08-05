'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { ChecklistItemRow } from './checklist-item-row';
import { OrderGenerationStatusBanner } from './order-generation-status-banner';
import {
  completeChecklist,
  reopenChecklist,
  updateChecklistItemsBatch,
} from '@/app/(app)/checklist/actions';
import { toast } from 'sonner';
import { formatWeekRangeGerman } from '@/lib/utils/date';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import {
  collectDirtyChecklistItems,
  countCheckedChecklistItems,
  createChecklistItemDraftState,
  hasChecklistSaveError,
  hasDirtyChecklistItems,
  isChecklistSavePending,
  markChecklistItemsSaving,
  patchChecklistItemDraft,
  reconcileChecklistBatchError,
  reconcileChecklistBatchSuccess,
} from '@/lib/utils/checklist-batch';

interface ChecklistItem {
  id: string;
  checklist_id: string;
  product_id: string;
  product_name: string;
  min_stock_snapshot: number | null;
  min_stock_max_snapshot: number | null;
  current_stock: string | null;
  is_missing: boolean;
  is_checked: boolean;
  products: {
    sort_order: number;
    unit: string | null;
    storage_locations: {
      name: string;
      code: string;
      sort_order: number;
    };
    categories: {
      name: string;
      sort_order: number;
    };
  };
}

interface ChecklistViewProps {
  checklist: {
    id: string;
    iso_year: number;
    iso_week: number;
    checklist_date?: string;
    week_start_date?: string;
    week_end_date?: string;
    status: 'draft' | 'in_progress' | 'completed';
    order_generation_status?: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | null;
    order_generation_orders_created?: number | null;
    order_generation_error?: string | null;
  };
  items: ChecklistItem[];
  isAdmin: boolean;
}

interface GroupedItems {
  locationName: string;
  locationCode: string;
  locationSortOrder: number;
  categories: {
    categoryName: string;
    categorySortOrder: number;
    items: ChecklistItem[];
  }[];
}

export function ChecklistView({ checklist, items, isAdmin }: ChecklistViewProps) {
  const router = useRouter();
  const [, startSyncTransition] = useTransition();
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [localChecklistStatus, setLocalChecklistStatus] = useState(checklist.status);
  const [localOrderGenerationStatus, setLocalOrderGenerationStatus] = useState(
    checklist.order_generation_status ?? 'idle'
  );
  const [localOrdersCreated, setLocalOrdersCreated] = useState(
    checklist.order_generation_orders_created ?? 0
  );
  const [localOrderGenerationError, setLocalOrderGenerationError] = useState<string | null>(
    checklist.order_generation_error ?? null
  );
  const [itemStates, setItemStates] = useState(() => createChecklistItemDraftState(items));

  const itemStatesRef = useRef(itemStates);
  const isMountedRef = useRef(true);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPromiseRef = useRef<Promise<boolean> | null>(null);
  const flushPendingChangesRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    itemStatesRef.current = itemStates;
  }, [itemStates]);

  const applyItemStates = useCallback(
    (
      updater: (
        current: Record<string, ReturnType<typeof createChecklistItemDraftState>[string]>
      ) => Record<string, ReturnType<typeof createChecklistItemDraftState>[string]>
    ) => {
      const next = updater(itemStatesRef.current);
      itemStatesRef.current = next;

      if (isMountedRef.current) {
        setItemStates(next);
      }
    },
    []
  );

  useEffect(() => {
    setLocalChecklistStatus(checklist.status);
    setLocalOrderGenerationStatus(checklist.order_generation_status ?? 'idle');
    setLocalOrdersCreated(checklist.order_generation_orders_created ?? 0);
    setLocalOrderGenerationError(checklist.order_generation_error ?? null);
  }, [
    checklist.id,
    checklist.status,
    checklist.order_generation_status,
    checklist.order_generation_orders_created,
    checklist.order_generation_error,
  ]);

  const itemsSyncKey = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.id}:${item.current_stock ?? ''}:${item.is_missing ? 1 : 0}:${item.is_checked ? 1 : 0}`
        )
        .join('|'),
    [items]
  );

  useEffect(() => {
    if (hasDirtyChecklistItems(itemStatesRef.current)) {
      return;
    }

    const nextState = createChecklistItemDraftState(items);
    itemStatesRef.current = nextState;
    setItemStates(nextState);
  }, [checklist.id, itemsSyncKey, items]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      // Internal route transitions can unmount the checklist before the debounce fires.
      // This best-effort flush closes that common gap without pretending to cover every tab/browser lifecycle.
      if (hasDirtyChecklistItems(itemStatesRef.current) || flushPromiseRef.current) {
        void flushPendingChangesRef.current?.();
      }
    };
  }, []);

  const flushPendingChanges = useCallback(async function flushPendingChangesInternal(): Promise<boolean> {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    if (flushPromiseRef.current) {
      const inFlightSucceeded = await flushPromiseRef.current;
      if (!inFlightSucceeded) {
        return false;
      }

      if (!hasDirtyChecklistItems(itemStatesRef.current)) {
        return true;
      }
    }

    const batch = collectDirtyChecklistItems(itemStatesRef.current);
    if (batch.items.length === 0) {
      return true;
    }

    applyItemStates((current) => markChecklistItemsSaving(current, batch.itemIds));

    const flushPromise = (async () => {
      const result = await updateChecklistItemsBatch({
        checklistId: checklist.id,
        items: batch.items,
      });

      if (result.error) {
        applyItemStates((current) => reconcileChecklistBatchError(current, batch.itemRevisions));
        toast.error(result.error);
        return false;
      }

      applyItemStates((current) => reconcileChecklistBatchSuccess(current, batch.itemRevisions));

      if (result.checklistStatus && isMountedRef.current) {
        setLocalChecklistStatus(result.checklistStatus);
      }

      return true;
    })().finally(() => {
      flushPromiseRef.current = null;
    });

    flushPromiseRef.current = flushPromise;
    const success = await flushPromise;

    if (success && hasDirtyChecklistItems(itemStatesRef.current)) {
      return flushPendingChangesInternal();
    }

    return success;
  }, [applyItemStates, checklist.id]);

  useEffect(() => {
    flushPendingChangesRef.current = flushPendingChanges;
  }, [flushPendingChanges]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    flushTimerRef.current = setTimeout(() => {
      void flushPendingChanges();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flushPendingChanges]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        void flushPendingChanges();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingChanges]);

  function queueLocalItemChange(
    itemId: string,
    patch: Partial<{
      currentStock: string;
      isMissing: boolean;
      isChecked: boolean;
    }>
  ) {
    applyItemStates((current) => patchChecklistItemDraft(current, itemId, patch));
    scheduleFlush();
  }

  async function handleComplete() {
    const flushed = await flushPendingChanges();
    if (!flushed) {
      return;
    }

    const previousStatus = localChecklistStatus;
    const previousOrderGenerationStatus = localOrderGenerationStatus;
    const previousOrdersCreated = localOrdersCreated;
    const previousOrderGenerationError = localOrderGenerationError;

    setCompleting(true);
    setLocalChecklistStatus('completed');
    setLocalOrderGenerationStatus('pending');
    setLocalOrdersCreated(0);
    setLocalOrderGenerationError(null);

    const result = await completeChecklist({ checklistId: checklist.id });
    if (result.error) {
      toast.error(result.error);
      setLocalChecklistStatus(previousStatus);
      setLocalOrderGenerationStatus(previousOrderGenerationStatus);
      setLocalOrdersCreated(previousOrdersCreated);
      setLocalOrderGenerationError(previousOrderGenerationError);
    } else {
      toast.success(de.checklist.completionSuccess);
      if (result.orderGenerationStatus === 'pending') {
        toast.info(de.checklist.orderGenerationPending);
      }
      setDialogOpen(false);
      startSyncTransition(() => {
        router.refresh();
      });
    }
    setCompleting(false);
  }

  async function handleReopen() {
    const flushed = await flushPendingChanges();
    if (!flushed) {
      return;
    }

    const previousStatus = localChecklistStatus;
    const previousOrderGenerationStatus = localOrderGenerationStatus;
    const previousOrdersCreated = localOrdersCreated;
    const previousOrderGenerationError = localOrderGenerationError;

    setReopening(true);
    setLocalChecklistStatus('in_progress');
    setLocalOrderGenerationStatus('idle');
    setLocalOrdersCreated(0);
    setLocalOrderGenerationError(null);

    const result = await reopenChecklist({ checklistId: checklist.id });
    if (result.error) {
      toast.error(result.error);
      setLocalChecklistStatus(previousStatus);
      setLocalOrderGenerationStatus(previousOrderGenerationStatus);
      setLocalOrdersCreated(previousOrdersCreated);
      setLocalOrderGenerationError(previousOrderGenerationError);
    } else {
      toast.success(de.checklist.reopenSuccess);
      startSyncTransition(() => {
        router.refresh();
      });
    }
    setReopening(false);
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  const checkedCount = countCheckedChecklistItems(itemStates);
  const totalCount = items.length;
  const isCompleted = localChecklistStatus === 'completed';
  const isReadOnly = isCompleted;
  const hasSaveError = hasChecklistSaveError(itemStates);
  const isSavePending = isChecklistSavePending(itemStates);
  const saveStatusMessage = hasSaveError
    ? de.checklist.saveFailed
    : isSavePending
      ? de.checklist.savingInProgress
      : null;

  const headerText = checklist.week_start_date && checklist.week_end_date
    ? `${formatWeekRangeGerman(checklist.week_start_date, checklist.week_end_date)} - KW ${checklist.iso_week}`
    : `KW ${checklist.iso_week} / ${checklist.iso_year}`;

  const grouped = useMemo<GroupedItems[]>(() => {
    const locationMap = new Map<string, GroupedItems>();

    for (const item of items) {
      const loc = item.products.storage_locations;
      const cat = item.products.categories;

      if (!locationMap.has(loc.code)) {
        locationMap.set(loc.code, {
          locationName: loc.name,
          locationCode: loc.code,
          locationSortOrder: loc.sort_order,
          categories: [],
        });
      }

      const group = locationMap.get(loc.code)!;
      let catGroup = group.categories.find((entry) => entry.categoryName === cat.name);
      if (!catGroup) {
        catGroup = {
          categoryName: cat.name,
          categorySortOrder: cat.sort_order,
          items: [],
        };
        group.categories.push(catGroup);
      }
      catGroup.items.push(item);
    }

    const result = Array.from(locationMap.values());
    result.sort((a, b) => a.locationSortOrder - b.locationSortOrder);
    for (const location of result) {
      location.categories.sort((a, b) => a.categorySortOrder - b.categorySortOrder);
      for (const category of location.categories) {
        category.items.sort((a, b) => a.products.sort_order - b.products.sort_order);
      }
    }
    return result;
  }, [items]);

  const statusLabels: Record<string, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const statusBadgeClass: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  };

  function shouldShowItem(item: ChecklistItem) {
    if (!showMissingOnly) return true;
    return itemStates[item.id]?.isMissing === true;
  }

  const hiddenByFilter = showMissingOnly
    ? items.length - items.filter((item) => itemStates[item.id]?.isMissing === true).length
    : 0;

  return (
    <div className="space-y-3">
      <OrderGenerationStatusBanner
        status={localOrderGenerationStatus}
        ordersCreated={localOrdersCreated}
        error={localOrderGenerationError}
      />

      {/* Sticky toolbar */}
      <div className="sticky top-[5.35rem] z-40 -mx-1 px-1 pb-2" data-no-print>
        <div className="surface-panel px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-semibold tracking-tight sm:text-lg">{headerText}</h2>
              <Badge variant="outline" className={statusBadgeClass[localChecklistStatus]}>
                {statusLabels[localChecklistStatus]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saveStatusMessage && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${hasSaveError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
                >
                  {saveStatusMessage}
                </span>
              )}
              <Button
                variant={showMissingOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowMissingOnly((value) => !value)}
                aria-pressed={showMissingOnly}
                className={showMissingOnly ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : ''}
              >
                {showMissingOnly ? de.checklist.showAll : de.checklist.showMissingOnly}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                {de.checklist.print}
              </Button>
              {isCompleted && isAdmin && (
                <Button variant="outline" size="sm" onClick={handleReopen} disabled={reopening}>
                  {reopening ? de.common.loading : de.checklist.reopen}
                </Button>
              )}
              {!isCompleted && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        size="sm"
                        disabled={completing || checkedCount < totalCount}
                      />
                    }
                  >
                    {completing ? de.common.loading : de.checklist.complete}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{de.checklist.completeConfirmTitle}</DialogTitle>
                      <DialogDescription>
                        {de.checklist.completeConfirmDescription}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        {de.common.cancel}
                      </DialogClose>
                      <Button onClick={handleComplete} disabled={completing}>
                        {completing ? de.common.loading : de.checklist.completeConfirmButton}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">
              {de.checklist.progress
                .replace('{checked}', String(checkedCount))
                .replace('{total}', String(totalCount))}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="tabular-nums font-semibold text-foreground">{progressPercent}%</span>
            {showMissingOnly && hiddenByFilter > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                {de.checklist.filterActiveLabel.replace('{count}', String(hiddenByFilter))}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-white/80 shadow-[0_10px_30px_-24px_rgba(38,32,29,0.25)]">
        {grouped.map((location) => {
          const visibleCategories = location.categories
            .map((category) => ({
              ...category,
              items: category.items.filter(shouldShowItem),
            }))
            .filter((category) => category.items.length > 0);

          if (visibleCategories.length === 0) return null;

          let locationChecked = 0;
          let locationTotal = 0;
          for (const category of location.categories) {
            for (const item of category.items) {
              locationTotal++;
              if (itemStates[item.id]?.isChecked) locationChecked++;
            }
          }

          return (
            <section key={location.locationCode} className="border-b border-border/40 last:border-b-0">
              <header className="sticky top-[10.5rem] z-20 flex items-center gap-2 border-b border-border/60 bg-secondary/95 px-3 py-2 backdrop-blur">
                <Badge variant="secondary" className="font-mono text-[0.65rem]">
                  {location.locationCode}
                </Badge>
                <h3 className="flex-1 truncate text-sm font-semibold tracking-tight">
                  {location.locationName}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {locationChecked}/{locationTotal}
                </span>
              </header>

              {visibleCategories.map((category) => (
                <div key={category.categoryName}>
                  {category.categoryName !== 'Allgemein' && (
                    <h4 className="sticky top-[13.3rem] z-10 border-b border-border/30 bg-background/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                      {category.categoryName}
                    </h4>
                  )}
                  <div>
                    {category.items.map((item) => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        state={itemStates[item.id]}
                        isReadOnly={isReadOnly}
                        onStockChange={(value) => {
                          queueLocalItemChange(item.id, { currentStock: value });
                        }}
                        onStockBlur={() => {
                          void flushPendingChanges();
                        }}
                        onMissingToggle={() => {
                          queueLocalItemChange(item.id, {
                            isMissing: !itemStatesRef.current[item.id]?.isMissing,
                          });
                        }}
                        onCheckToggle={(checked) => {
                          queueLocalItemChange(item.id, { isChecked: checked });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
