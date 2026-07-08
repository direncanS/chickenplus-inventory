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
import { formatDateGerman } from '@/lib/utils/date';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

  const headerText = checklist.checklist_date
    ? `${formatDateGerman(checklist.checklist_date)} - KW ${checklist.iso_week}`
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

  return (
    <div className="space-y-4">
      <OrderGenerationStatusBanner
        status={localOrderGenerationStatus}
        ordersCreated={localOrdersCreated}
        error={localOrderGenerationError}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{headerText}</h2>
          <Badge variant={isCompleted ? 'outline' : 'default'}>
            {statusLabels[localChecklistStatus]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {saveStatusMessage && (
            <span
              className={`text-xs ${hasSaveError ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {saveStatusMessage}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {de.checklist.progress
              .replace('{checked}', String(checkedCount))
              .replace('{total}', String(totalCount))}
          </span>
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

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{
            width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-[1fr_80px_40px_40px] sm:grid-cols-[1fr_100px_48px_48px] items-center gap-2 px-2 text-xs text-muted-foreground font-medium">
        <div>{de.checklist.product}</div>
        <div className="text-center">{de.checklist.stock}</div>
        <div className="text-center">{de.checklist.missing}</div>
        <div className="text-center">{de.checklist.checked}</div>
      </div>

      <Accordion multiple defaultValue={grouped.map((group) => group.locationCode)}>
        {grouped.map((location) => (
          <AccordionItem key={location.locationCode} value={location.locationCode}>
            <AccordionTrigger className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {location.locationCode}
                </Badge>
                {location.locationName}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {location.categories.map((category) => (
                <div key={category.categoryName} className="mb-4">
                  {category.categoryName !== 'Allgemein' && (
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                      {category.categoryName}
                    </h4>
                  )}
                  <div className="space-y-1">
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
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
