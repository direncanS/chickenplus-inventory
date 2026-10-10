'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  matchesChecklistFilter,
  type ChecklistFilterMode,
} from '@/lib/utils/checklist-filters';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { useStockKeyboard } from '@/lib/hooks/use-stock-keyboard';

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
    complement_of_id?: string | null;
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

/**
 * Order a category's items by sort_order, but keep each complement (e.g. a lid)
 * directly after its base product regardless of the complement's own sort_order.
 */
function orderCategoryItems(items: ChecklistItem[]): ChecklistItem[] {
  const bySortOrder = [...items].sort((a, b) => a.products.sort_order - b.products.sort_order);
  const presentIds = new Set(items.map((i) => i.product_id));

  const complementsByBase = new Map<string, ChecklistItem[]>();
  for (const item of bySortOrder) {
    const baseId = item.products.complement_of_id;
    if (baseId && presentIds.has(baseId)) {
      const list = complementsByBase.get(baseId) ?? [];
      list.push(item);
      complementsByBase.set(baseId, list);
    }
  }

  const ordered: ChecklistItem[] = [];
  for (const item of bySortOrder) {
    const baseId = item.products.complement_of_id;
    // Complements are emitted right after their base, so skip them here.
    if (baseId && presentIds.has(baseId)) continue;
    ordered.push(item);
    const complements = complementsByBase.get(item.product_id);
    if (complements) ordered.push(...complements);
  }
  return ordered;
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
  const isOnline = useOnlineStatus();
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<ChecklistFilterMode>('all');
  const [search, setSearch] = useState('');
  const [locationCode, setLocationCode] = useState('all');
  const [entryMode, setEntryMode] = useState<'list' | 'single'>('list');
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [bulkItemIds, setBulkItemIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stockInputs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusId = useRef<string | null>(null);
  const keyboard = useStockKeyboard(containerRef);
  const refreshKeyboard = keyboard.refresh;
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
    isMountedRef.current = true;
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

    if (!isOnline) {
      return !hasDirtyChecklistItems(itemStatesRef.current);
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
  }, [applyItemStates, checklist.id, isOnline]);

  useEffect(() => {
    flushPendingChangesRef.current = flushPendingChanges;
  }, [flushPendingChanges]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    if (!isOnline) {
      flushTimerRef.current = null;
      return;
    }

    flushTimerRef.current = setTimeout(() => {
      void flushPendingChanges();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flushPendingChanges, isOnline]);

  useEffect(() => {
    if (isOnline && hasDirtyChecklistItems(itemStatesRef.current)) {
      void flushPendingChanges();
    }
  }, [flushPendingChanges, isOnline]);

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

  function queueVisibleItemsChecked() {
    const visibleItemIds = bulkItemIds;

    if (visibleItemIds.length === 0) {
      return;
    }

    applyItemStates((current) => {
      let next = current;
      for (const itemId of visibleItemIds) {
        next = patchChecklistItemDraft(next, itemId, { isChecked: true });
      }
      return next;
    });
    scheduleFlush();
    setBulkItemIds([]);
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
    setLocalOrderGenerationStatus('idle');
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
      setDialogOpen(false);
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
    }
    setReopening(false);
  }

  const checkedCount = countCheckedChecklistItems(itemStates);
  const totalCount = items.length;
  const isCompleted = localChecklistStatus === 'completed';
  const isReadOnly = isCompleted;
  const hasSaveError = hasChecklistSaveError(itemStates);
  const isSavePending = isChecklistSavePending(itemStates);
  const hasUnsavedChanges = hasDirtyChecklistItems(itemStates);
  const saveStatusMessage = hasSaveError
    ? de.checklist.saveFailed
    : !isOnline && hasUnsavedChanges
      ? de.checklist.offlineChangesPending
      : !isOnline
        ? de.checklist.offline
        : isSavePending
          ? de.checklist.savingInProgress
          : 'Gespeichert';

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
        category.items = orderCategoryItems(category.items);
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
  const missingCount = items.filter((item) => itemStates[item.id]?.isMissing === true).length;
  const uncheckedCount = totalCount - checkedCount;

  const statusBadgeClass: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  };

  function shouldShowItem(item: ChecklistItem) {
    return (locationCode === 'all' || item.products.storage_locations.code === locationCode) &&
      item.product_name.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')) &&
      matchesChecklistFilter(
        {
          isMissing: itemStates[item.id]?.isMissing === true,
          isChecked: itemStates[item.id]?.isChecked === true,
        },
        filterMode
      );
  }

  const visibleItems = grouped.flatMap((location) =>
    location.categories.flatMap((category) => category.items.filter(shouldShowItem))
  );
  const hiddenByFilter = totalCount - visibleItems.length;
  const focusedItem = visibleItems.find((item) => item.id === focusedItemId) ?? visibleItems[0];
  const navigationId = entryMode === 'single' ? focusedItem?.id : keyboard.activeId ?? focusedItem?.id;
  const navigationIndex = visibleItems.findIndex((item) => item.id === navigationId);

  function navigateStock(direction: number, focus = true, fromId = navigationId) {
    if (focus) void flushPendingChanges();
    const index = visibleItems.findIndex((item) => item.id === fromId);
    const next = visibleItems[index + direction];
    if (!next) {
      if (direction > 0 && focus) stockInputs.current.get(fromId ?? '')?.blur();
      return;
    }
    if (entryMode === 'single') {
      pendingFocusId.current = focus ? next.id : null;
      setFocusedItemId(next.id);
    } else if (focus) {
      stockInputs.current.get(next.id)?.focus({ preventScroll: keyboard.open });
    }
  }

  useEffect(() => {
    const id = pendingFocusId.current;
    if (!id) return;
    pendingFocusId.current = null;
    stockInputs.current.get(id)?.focus({ preventScroll: true });
    refreshKeyboard();
  }, [focusedItemId, refreshKeyboard]);

  const visibleUncheckedCount = items
    .filter((item) => shouldShowItem(item))
    .filter((item) => !itemStates[item.id]?.isChecked).length;

  function renderItemRow(item: ChecklistItem, key = item.id) {
    return (
      <ChecklistItemRow
        key={key}
        item={item}
        state={itemStates[item.id]}
        isReadOnly={isReadOnly}
        inputRef={(node) => {
          if (node) stockInputs.current.set(item.id, node);
          else stockInputs.current.delete(item.id);
        }}
        onStockNext={() => navigateStock(1, true, item.id)}
        onStockChange={(value) => queueLocalItemChange(item.id, { currentStock: value })}
        onStockBlur={() => { void flushPendingChanges(); }}
        onMissingToggle={() => queueLocalItemChange(item.id, { isMissing: !itemStatesRef.current[item.id]?.isMissing })}
        onCheckToggle={(checked) => queueLocalItemChange(item.id, { isChecked: checked })}
      />
    );
  }

  return (
    <div ref={containerRef} className="space-y-3" style={{ paddingBottom: keyboard.bottomInset || undefined }}>
      <OrderGenerationStatusBanner
        status={localOrderGenerationStatus}
        ordersCreated={localOrdersCreated}
        error={localOrderGenerationError}
      />

      {!isOnline && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[0_10px_30px_-26px_rgba(146,64,14,0.35)]"
          data-no-print
        >
          <div className="font-semibold">{de.checklist.offlineChangesPending}</div>
          <div className="mt-0.5 text-amber-800">{de.checklist.offlineDescription}</div>
        </div>
      )}

      {/* Keep the controls in document flow so they cannot obscure mobile fields. */}
      <div className="-mx-1 px-1 pb-2" data-no-print>
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
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    hasSaveError
                      ? 'bg-destructive/10 text-destructive'
                      : !isOnline
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {saveStatusMessage}
                </span>
              )}
              <div className="grid w-full min-w-0 grid-cols-3 rounded-2xl border border-border/70 bg-white/75 p-1 sm:w-auto">
                {(['all', 'missing', 'unchecked'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={filterMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterMode(mode)}
                    aria-pressed={filterMode === mode}
                    className="h-11 min-w-0 whitespace-normal rounded-xl px-2 text-center text-xs"
                  >
                    {mode === 'all' && de.checklist.showAll}
                    {mode === 'missing' && `${de.checklist.showMissingOnly} (${missingCount})`}
                    {mode === 'unchecked' && `${de.checklist.showUncheckedOnly} (${uncheckedCount})`}
                  </Button>
                ))}
              </div>
              <details className="relative">
                <summary className="flex min-h-11 cursor-pointer items-center rounded-xl border border-border px-3 text-xs font-medium">Weitere Aktionen</summary>
                <div className="absolute left-0 top-full z-40 mt-2 flex w-64 flex-col gap-2 rounded-2xl border bg-card p-3 shadow-xl sm:left-auto sm:right-0">
              {!isReadOnly && visibleUncheckedCount > 0 && (
                <Button variant="outline" size="sm" className="h-11" onClick={() => setBulkItemIds(
                  visibleItems.filter((item) => !itemStatesRef.current[item.id]?.isChecked).map((item) => item.id)
                )}>
                  {de.checklist.markVisibleChecked}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                nativeButton={false}
                render={<a href={`/api/export/${checklist.id}`} download />}
              >
                {de.dashboard.exportExcel}
              </Button>
              {isCompleted && isAdmin && (
                <Button variant="outline" size="sm" className="h-11" onClick={handleReopen} disabled={reopening}>
                  {reopening ? de.common.loading : de.checklist.reopen}
                </Button>
              )}
                </div>
              </details>
              {!isCompleted && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        size="sm"
                        className="h-11"
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

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Input
              type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Produkt suchen …" aria-label="Produkt suchen" className="h-12 text-base"
            />
            <select
              aria-label="Lagerort" value={locationCode} onChange={(event) => setLocationCode(event.target.value)}
              className="h-12 min-w-0 rounded-2xl border border-input bg-card px-3 text-base"
            >
              <option value="all">Alle Lagerorte</option>
              {grouped.map((location) => <option key={location.locationCode} value={location.locationCode}>{location.locationName}</option>)}
            </select>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{visibleItems.length} Produkte</span>
            <div className="flex gap-1" aria-label="Ansicht">
              <Button variant={entryMode === 'list' ? 'default' : 'outline'} className="h-11" size="sm" aria-pressed={entryMode === 'list'} onClick={() => setEntryMode('list')}>Liste</Button>
              <Button variant={entryMode === 'single' ? 'default' : 'outline'} className="h-11" size="sm" aria-pressed={entryMode === 'single'} onClick={() => setEntryMode('single')}>Einzeln</Button>
            </div>
          </div>
          {hasSaveError && <Button variant="outline" className="mt-2 h-11" onClick={() => void flushPendingChanges()}>Erneut speichern</Button>}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
            {hiddenByFilter > 0 && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                {de.checklist.filterActiveLabel.replace('{count}', String(hiddenByFilter))}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-white/80 shadow-[0_10px_30px_-24px_rgba(38,32,29,0.25)]">
        <div
          className="hidden grid-cols-[minmax(0,1fr)_minmax(132px,160px)_88px_44px] items-center gap-3 border-b border-border/60 bg-background/95 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid"
          data-no-print
        >
          <span>{de.checklist.product}</span>
          <span className="whitespace-normal text-center text-[9px] font-semibold normal-case leading-[1.1] tracking-[0.01em]">
            {de.checklist.currentStockShort}
          </span>
          <span className="text-center" title={de.checklist.missing}>{de.checklist.missing}</span>
          <span className="text-center" title={de.checklist.checked}>{de.checklist.checked}</span>
        </div>
        {entryMode === 'single' && focusedItem && (
          <section>
            <div className="border-b bg-secondary/95 px-3 py-2 text-sm font-semibold">{focusedItem.products.storage_locations.name}</div>
            {renderItemRow(focusedItem, 'single-item')}
          </section>
        )}
        {entryMode === 'list' && grouped.map((location) => {
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
              <header className="flex items-center gap-2 border-b border-border/60 bg-secondary/95 px-3 py-2">
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
                  <div>
                    {category.items.map((item) => renderItemRow(item))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      {visibleItems.length === 0 && (
        <div className="surface-subtle p-5 text-center text-sm">
          Keine Produkte gefunden.
          <Button variant="outline" className="ml-2 h-11" onClick={() => { setSearch(''); setLocationCode('all'); setFilterMode('all'); }}>Filter zurücksetzen</Button>
        </div>
      )}
      {entryMode === 'single' && visibleItems.length > 0 && (
        <div className="flex items-center justify-between gap-2" data-no-print>
          <Button variant="outline" className="h-12" disabled={navigationIndex <= 0} onClick={() => navigateStock(-1, false)}>Zurück</Button>
          <span className="text-xs tabular-nums">{navigationIndex + 1} / {visibleItems.length}</span>
          <Button variant="outline" className="h-12" disabled={navigationIndex >= visibleItems.length - 1} onClick={() => navigateStock(1, false)}>Weiter</Button>
        </div>
      )}
      {keyboard.open && (
        <div
          className="fixed inset-x-0 z-[60] flex h-14 items-center justify-between gap-2 border-t bg-card px-3 shadow-lg md:hidden"
          style={{ top: keyboard.top }} data-no-print role="toolbar" aria-label="Bestandseingabe"
          onPointerDown={(event) => event.preventDefault()}
        >
          <Button variant="outline" className="h-11" disabled={navigationIndex <= 0} onClick={() => navigateStock(-1)}>Zurück</Button>
          <span className="min-w-0 flex-1 text-center text-xs" role="status">{saveStatusMessage}</span>
          <Button variant="outline" className="h-11" disabled={navigationIndex >= visibleItems.length - 1} onClick={() => navigateStock(1)}>Weiter</Button>
          <Button className="h-11" onClick={() => { stockInputs.current.get(navigationId ?? '')?.blur(); void flushPendingChanges(); }}>Fertig</Button>
        </div>
      )}
      <Dialog open={bulkItemIds.length > 0} onOpenChange={(open) => { if (!open) setBulkItemIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkItemIds.length} Produkte als geprüft markieren?</DialogTitle>
            <DialogDescription>Dies gilt für die Produkte der aktuellen Suche und Lagerortauswahl, auch außerhalb des Bildschirms.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{de.common.cancel}</DialogClose>
            <Button onClick={queueVisibleItemsChecked}>Als geprüft markieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
