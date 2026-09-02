'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit3, PackagePlus, RefreshCw, Search, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { de } from '@/i18n/de';
import { syncActiveChecklistProducts, toggleProductActive } from '@/app/(app)/products/actions';
import { ProductForm } from './product-form';

export interface ProductRow {
  id: string;
  name: string;
  storage_location_id: string;
  category_id: string;
  unit: string | null;
  min_stock: number | null;
  min_stock_max: number | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  storage_locations: {
    id: string;
    code: string;
    name: string;
    sort_order: number;
  };
  categories: {
    id: string;
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

export interface ProductManagerData {
  products: ProductRow[];
  storageLocations: Array<{
    id: string;
    code: string;
    name: string;
    sort_order: number;
  }>;
  categories: Array<{
    id: string;
    storage_location_id: string;
    name: string;
    sort_order: number;
  }>;
  suppliers: Array<{
    id: string;
    name: string;
    is_active: boolean;
  }>;
}

type StatusFilter = 'active' | 'inactive' | 'all';

function formatMinStock(product: ProductRow) {
  if (product.min_stock == null && product.min_stock_max == null) return de.products.noMinStock;
  if (product.min_stock_max != null) {
    return `${product.min_stock ?? 0}-${product.min_stock_max} ${product.unit ?? ''}`.trim();
  }
  return `${product.min_stock} ${product.unit ?? ''}`.trim();
}

function preferredSupplierName(product: ProductRow) {
  return (
    product.product_suppliers.find((item) => item.is_preferred && item.suppliers?.is_active)
      ?.suppliers?.name ?? de.products.noPreferredSupplierShort
  );
}

export function ProductManager({
  products,
  storageLocations,
  categories,
  suppliers,
}: ProductManagerData) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [storageFilter, setStorageFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && product.is_active) ||
        (statusFilter === 'inactive' && !product.is_active);
      const matchesStorage =
        storageFilter === 'all' || product.storage_location_id === storageFilter;
      const matchesSearch =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        product.categories.name.toLowerCase().includes(term) ||
        preferredSupplierName(product).toLowerCase().includes(term);

      return matchesStatus && matchesStorage && matchesSearch;
    });
  }, [products, search, statusFilter, storageFilter]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { title: string; code: string; items: ProductRow[] }>();
    for (const product of filteredProducts) {
      const key = product.storage_location_id;
      if (!groups.has(key)) {
        groups.set(key, {
          title: product.storage_locations.name,
          code: product.storage_locations.code,
          items: [],
        });
      }
      groups.get(key)?.items.push(product);
    }
    return Array.from(groups.values());
  }, [filteredProducts]);

  function handleNewProduct() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function handleEditProduct(product: ProductRow) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleSaved() {
    router.refresh();
  }

  function handleToggleProduct(product: ProductRow) {
    startTransition(async () => {
      const result = await toggleProductActive({
        productId: product.id,
        isActive: !product.is_active,
      });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(!product.is_active ? de.products.activateSuccess : de.products.deactivateSuccess);
      router.refresh();
    });
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncActiveChecklistProducts();
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(de.products.syncSuccess);
      router.refresh();
    });
  }

  const activeCount = products.filter((product) => product.is_active).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="space-y-6">
      <Card className="bg-card/92">
        <CardHeader>
          <CardTitle>{de.products.title}</CardTitle>
          <CardDescription>{de.products.description}</CardDescription>
          <CardAction className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleSync} disabled={isPending}>
              <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
              {de.products.syncChecklists}
            </Button>
            <Button onClick={handleNewProduct}>
              <PackagePlus className="h-4 w-4" />
              {de.products.addNew}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={de.products.searchPlaceholder}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['active', 'all', 'inactive'] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {de.products.statusFilters[status]}
                </Button>
              ))}
            </div>
            <select
              value={storageFilter}
              onChange={(event) => setStorageFilter(event.target.value)}
              className="h-10 rounded-2xl border border-input/80 bg-white/86 px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none focus:border-primary/40 focus:ring-3 focus:ring-primary/15"
            >
              <option value="all">{de.products.allStorageLocations}</option>
              {storageLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} · {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{products.length} {de.products.productsTotal}</Badge>
            <Badge variant="default">{activeCount} {de.products.active}</Badge>
            {inactiveCount > 0 && <Badge variant="outline">{inactiveCount} {de.products.inactive}</Badge>}
          </div>
        </CardContent>
      </Card>

      {groupedProducts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">{de.products.noProducts}</p>
            <p className="mt-2 text-sm text-muted-foreground">{de.products.noProductsDescription}</p>
          </CardContent>
        </Card>
      ) : (
        groupedProducts.map((group) => (
          <section key={group.code} className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-sm font-semibold">
                {group.code}
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight">{group.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {group.items.length} {de.products.productsTotal}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {group.items.map((product) => (
                <Card
                  key={product.id}
                  size="sm"
                  className={cn(
                    'transition-colors',
                    !product.is_active && 'border-dashed bg-muted/45 opacity-75'
                  )}
                >
                  <CardContent className="grid gap-4 py-1 md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{product.name}</h3>
                        <Badge variant={product.is_active ? 'default' : 'outline'}>
                          {product.is_active ? de.products.active : de.products.inactive}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.categories.name} · {de.products.sortOrder}: {product.sort_order}
                      </p>
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {de.products.minStock}
                      </p>
                      <p className="mt-1 font-medium">{formatMinStock(product)}</p>
                    </div>

                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {de.products.preferredSupplier}
                      </p>
                      <p className="mt-1 font-medium">{preferredSupplierName(product)}</p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                        <Edit3 className="h-4 w-4" />
                        {de.common.edit}
                      </Button>
                      <Button
                        variant={product.is_active ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleToggleProduct(product)}
                        disabled={isPending}
                      >
                        {product.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                        {product.is_active ? de.products.deactivate : de.products.activate}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <ProductForm
        key={editingProduct?.id ?? 'new-product'}
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        storageLocations={storageLocations}
        categories={categories}
        suppliers={suppliers}
        onSaved={handleSaved}
      />
    </div>
  );
}
