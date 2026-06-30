'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { de } from '@/i18n/de';
import {
  getSupplierProducts,
  getAvailableProducts,
  setProductSupplier,
  removeProductSupplier,
} from '@/app/(app)/suppliers/actions';
import { toast } from 'sonner';
import { Star, X, Plus, Loader2 } from 'lucide-react';

interface AssignedProduct {
  mappingId: string;
  productId: string;
  productName: string;
  isActive: boolean;
  isPreferred: boolean;
}

interface AvailableProduct {
  id: string;
  name: string;
}

export function ProductSupplierMapping({ supplierId }: { supplierId: string }) {
  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [productsResult, availableResult] = await Promise.all([
      getSupplierProducts(supplierId),
      getAvailableProducts(supplierId),
    ]);
    if (productsResult.data) setAssignedProducts(productsResult.data);
    if (availableResult.data) setAvailableProducts(availableResult.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  async function handleAddProduct() {
    if (!selectedProductId) return;
    setAdding(true);
    const result = await setProductSupplier({
      productId: selectedProductId,
      supplierId,
      isPreferred: false,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.suppliers.assignSuccess);
      setSelectedProductId('');
      await loadData();
    }
    setAdding(false);
  }

  async function handleRemove(productId: string) {
    setActionInProgress(productId);
    const result = await removeProductSupplier(productId, supplierId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.suppliers.removeSuccess);
      await loadData();
    }
    setActionInProgress(null);
  }

  async function handleSetPreferred(productId: string) {
    setActionInProgress(productId);
    const result = await setProductSupplier({
      productId,
      supplierId,
      isPreferred: true,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.suppliers.preferredSuccess);
      await loadData();
    }
    setActionInProgress(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {de.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add product section */}
      <div className="flex items-center gap-2">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">{de.suppliers.selectProduct}</option>
          {availableProducts.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleAddProduct}
          disabled={!selectedProductId || adding}
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Assigned products list */}
      {assignedProducts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">{de.suppliers.noAssignedProducts}</p>
          <p className="text-xs text-muted-foreground">{de.suppliers.noAssignedProductsDescription}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {assignedProducts.map((product) => (
            <div
              key={product.productId}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{product.productName}</span>
                {product.isPreferred && (
                  <Badge variant="default" className="text-[10px] shrink-0">
                    <Star className="h-3 w-3 mr-0.5" />
                    {de.suppliers.preferred}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!product.isPreferred && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleSetPreferred(product.productId)}
                    disabled={actionInProgress === product.productId}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleRemove(product.productId)}
                  disabled={actionInProgress === product.productId}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
