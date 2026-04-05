'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { de } from '@/i18n/de';
import { ChecklistItemRow } from './checklist-item-row';
import { completeChecklist, reopenChecklist } from '@/app/(app)/checklist/actions';
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
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Track local check state for progress
  const [localCheckedState, setLocalCheckedState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    items.forEach((item) => {
      state[item.id] = item.is_checked;
    });
    return state;
  });

  const checkedCount = Object.values(localCheckedState).filter(Boolean).length;
  const totalCount = items.length;
  const isCompleted = checklist.status === 'completed';
  const isReadOnly = isCompleted;

  // Header text: show date + KW if checklist_date exists, otherwise KW/year
  const headerText = checklist.checklist_date
    ? `${formatDateGerman(checklist.checklist_date)} - KW ${checklist.iso_week}`
    : `KW ${checklist.iso_week} / ${checklist.iso_year}`;

  // Group items by storage location → category
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
      let catGroup = group.categories.find((c) => c.categoryName === cat.name);
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

    // Sort
    const result = Array.from(locationMap.values());
    result.sort((a, b) => a.locationSortOrder - b.locationSortOrder);
    for (const loc of result) {
      loc.categories.sort((a, b) => a.categorySortOrder - b.categorySortOrder);
      for (const cat of loc.categories) {
        cat.items.sort((a, b) => a.products.sort_order - b.products.sort_order);
      }
    }
    return result;
  }, [items]);

  function handleCheckChange(itemId: string, checked: boolean) {
    setLocalCheckedState((prev) => ({ ...prev, [itemId]: checked }));
  }

  async function handleComplete() {
    setCompleting(true);
    const result = await completeChecklist({ checklistId: checklist.id });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.checklist.completionSuccess);
      if (result.ordersCreated && result.ordersCreated > 0) {
        toast.success(de.checklist.ordersAutoCreated);
      }
    }
    setCompleting(false);
    setDialogOpen(false);
  }

  async function handleReopen() {
    setReopening(true);
    const result = await reopenChecklist({ checklistId: checklist.id });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.checklist.reopenSuccess);
    }
    setReopening(false);
  }

  const statusLabels: Record<string, string> = {
    draft: de.checklist.draft,
    in_progress: de.checklist.inProgress,
    completed: de.checklist.completed,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {headerText}
          </h2>
          <Badge variant={isCompleted ? 'outline' : 'default'}>
            {statusLabels[checklist.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {de.checklist.progress
              .replace('{checked}', String(checkedCount))
              .replace('{total}', String(totalCount))}
          </span>
          {isCompleted && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={reopening}
            >
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

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{
            width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_40px_40px] sm:grid-cols-[1fr_100px_48px_48px] items-center gap-2 px-2 text-xs text-muted-foreground font-medium">
        <div>{de.checklist.product}</div>
        <div className="text-center">{de.checklist.stock}</div>
        <div className="text-center">{de.checklist.missing}</div>
        <div className="text-center">{de.checklist.checked}</div>
      </div>

      {/* Items grouped by location */}
      <Accordion multiple defaultValue={grouped.map((g) => g.locationCode)}>
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
                        isReadOnly={isReadOnly}
                        onCheckChange={handleCheckChange}
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
