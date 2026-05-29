'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setProductSupplier } from '@/app/(app)/suppliers/actions';
import { cn } from '@/lib/utils';
import { de } from '@/i18n/de';

export interface SupplierMappingHealthProduct {
  id: string;
  name: string;
  is_active: boolean;
  storage_locations: {
    code: string;
    name: string;
    sort_order: number;
  };
  categories: {
    name: string;
    sort_order: number;
  };
  product_suppliers: Array<{
    supplier_id: string;
    is_preferred: boolean;
    suppliers: {
      id: string;
      name: string;
      is_active: boolean;
    } | null;
  }>;
}

interface SupplierMappingHealthProps {
  products: SupplierMappingHealthProduct[];
  suppliers: Array<{
    id: string;
    name: string;
    is_active: boolean;
  }>;
  isAdmin: boolean;
}

type IssueType = 'missing' | 'inactive' | 'duplicate';

export interface MappingIssue {
  type: IssueType;
  product: SupplierMappingHealthProduct;
  preferredSuppliers: SupplierMappingHealthProduct['product_suppliers'];
}

export function getSupplierMappingIssues(products: SupplierMappingHealthProduct[]) {
  const issues: MappingIssue[] = [];

  for (const product of products) {
    if (!product.is_active) continue;

    const preferredSuppliers = product.product_suppliers.filter((mapping) => mapping.is_preferred);
    const activePreferred = preferredSuppliers.filter((mapping) => mapping.suppliers?.is_active);

    if (preferredSuppliers.length > 1) {
      issues.push({ type: 'duplicate', product, preferredSuppliers });
      continue;
    }

    if (preferredSuppliers.length === 0 || activePreferred.length === 0) {
      issues.push({
        type: preferredSuppliers.length === 0 ? 'missing' : 'inactive',
        product,
        preferredSuppliers,
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.product.storage_locations.sort_order - b.product.storage_locations.sort_order ||
      a.product.categories.sort_order - b.product.categories.sort_order ||
      a.product.name.localeCompare(b.product.name, 'de')
  );
}

const issueTone: Record<IssueType, string> = {
  missing: 'border-amber-200 bg-amber-50/70 text-amber-900',
  inactive: 'border-rose-200 bg-rose-50/70 text-rose-900',
  duplicate: 'border-blue-200 bg-blue-50/70 text-blue-900',
};

export function SupplierMappingHealth({
  products,
  suppliers,
  isAdmin,
}: SupplierMappingHealthProps) {
  const router = useRouter();
  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const issues = useMemo(() => getSupplierMappingIssues(products), [products]);
  const activeSuppliers = suppliers.filter((supplier) => supplier.is_active);

  const missingCount = issues.filter((issue) => issue.type === 'missing').length;
  const inactiveCount = issues.filter((issue) => issue.type === 'inactive').length;
  const duplicateCount = issues.filter((issue) => issue.type === 'duplicate').length;

  function handleSave(issue: MappingIssue) {
    const supplierId = selectedSuppliers[issue.product.id];
    if (!supplierId) return;

    setSavingProductId(issue.product.id);
    startTransition(async () => {
      const result = await setProductSupplier({
        productId: issue.product.id,
        supplierId,
        isPreferred: true,
      });

      setSavingProductId(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(de.suppliers.mappingFixed);
      router.refresh();
    });
  }

  if (!isAdmin) return null;

  if (issues.length === 0) {
    return (
      <Card className="border-emerald-200/70 bg-emerald-50/55">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-950">
            <ShieldCheck className="h-5 w-5" />
            {de.suppliers.mappingHealthTitle}
          </CardTitle>
          <CardDescription className="text-emerald-800">
            {de.suppliers.mappingHealthOk}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/35">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          {de.suppliers.mappingHealthTitle}
        </CardTitle>
        <CardDescription>{de.suppliers.mappingHealthDescription}</CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant="outline" className="bg-white/80">
            {missingCount} {de.suppliers.mappingMissing}
          </Badge>
          <Badge variant="outline" className="bg-white/80">
            {inactiveCount} {de.suppliers.mappingInactive}
          </Badge>
          <Badge variant="outline" className="bg-white/80">
            {duplicateCount} {de.suppliers.mappingDuplicate}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.map((issue) => {
          const currentPreferredNames = issue.preferredSuppliers
            .map((mapping) => mapping.suppliers?.name)
            .filter(Boolean)
            .join(', ');

          return (
            <div
              key={`${issue.product.id}-${issue.type}`}
              className={cn(
                'grid gap-3 rounded-3xl border p-3 md:grid-cols-[1fr_16rem_auto] md:items-center',
                issueTone[issue.type]
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{issue.product.name}</p>
                  <Badge variant="outline" className="bg-white/75">
                    {issue.product.storage_locations.code} · {issue.product.categories.name}
                  </Badge>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  {issue.type === 'missing' && de.suppliers.mappingMissingDescription}
                  {issue.type === 'inactive' &&
                    de.suppliers.mappingInactiveDescription.replace('{supplier}', currentPreferredNames)}
                  {issue.type === 'duplicate' &&
                    de.suppliers.mappingDuplicateDescription.replace('{suppliers}', currentPreferredNames)}
                </p>
              </div>

              <Select
                value={selectedSuppliers[issue.product.id] ?? ''}
                onValueChange={(value) =>
                  value &&
                  setSelectedSuppliers((current) => ({
                    ...current,
                    [issue.product.id]: value,
                  }))
                }
              >
                <SelectTrigger className="bg-white/90">
                  <SelectValue placeholder={de.suppliers.selectPreferredSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(issue)}
                disabled={!selectedSuppliers[issue.product.id] || isPending || savingProductId === issue.product.id}
                className="bg-white/90"
              >
                {savingProductId === issue.product.id ? (
                  <CheckCircle2 className="h-4 w-4 animate-pulse" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {de.suppliers.fixMapping}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
