'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { de } from '@/i18n/de';
import { SupplierForm } from './supplier-form';
import { ProductSupplierMapping } from './product-supplier-mapping';
import { updateSupplier } from '@/app/(app)/suppliers/actions';
import { toast } from 'sonner';
import { Plus, ChevronDown, ChevronUp, Package } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
}

export function SupplierList({ suppliers, isAdmin }: { suppliers: Supplier[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  async function handleToggleActive(supplier: Supplier) {
    const result = await updateSupplier({
      supplierId: supplier.id,
      isActive: !supplier.is_active,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(de.suppliers.updateSuccess);
    }
  }

  function toggleExpanded(supplierId: string) {
    setExpandedSupplier((prev) => (prev === supplierId ? null : supplierId));
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingSupplier(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {de.suppliers.addNew}
          </Button>
        </div>
      )}

      {(showForm || editingSupplier) && isAdmin && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={() => { setShowForm(false); setEditingSupplier(null); }}
        />
      )}

      <div className="divide-y divide-border border-y border-border">
        {suppliers.map((supplier) => {
          const isExpanded = expandedSupplier === supplier.id;
          return (
            <article key={supplier.id} className={`py-5 ${!supplier.is_active ? 'opacity-60' : ''}`}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="break-words font-heading text-2xl font-normal">{supplier.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {supplier.contact_name ?? 'Kein Ansprechpartner'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {supplier.is_active ? de.suppliers.active : de.suppliers.inactive}
                    </Badge>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 sm:min-h-8"
                          onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}
                        >
                          {de.common.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 sm:min-h-8"
                          onClick={() => handleToggleActive(supplier)}
                        >
                          {supplier.is_active ? de.suppliers.deactivate : de.suppliers.activate}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 text-sm text-muted-foreground sm:grid-cols-2 sm:divide-x sm:divide-border">
                  {supplier.contact_name && (
                    <div className="flex min-w-0 items-center gap-2 border-b border-border py-2 break-all sm:px-3 sm:first:pl-0">
                      {supplier.contact_name}
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex min-w-0 items-center gap-2 border-b border-border py-2 break-all sm:px-3">
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex min-w-0 items-center gap-2 border-b border-border py-2 break-all sm:px-3">
                      {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex min-w-0 items-center gap-2 border-b border-border py-2 break-all sm:px-3">
                      {supplier.address}
                    </div>
                  )}
                </div>

                {/* Product mapping section - admin only */}
                {isAdmin && supplier.is_active && (
                  <>
                    <Separator className="my-3" />
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-border bg-card px-3 py-3 text-left text-sm font-medium"
                      onClick={() => toggleExpanded(supplier.id)}
                    >
                      <Package className="h-4 w-4" />
                      {de.suppliers.assignedProducts}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-2">
                        <ProductSupplierMapping supplierId={supplier.id} />
                      </div>
                    )}
                  </>
                )}
            </article>
          );
        })}
        {suppliers.length === 0 && (
          <div className="surface-subtle py-10 text-center">
            <p className="font-medium mb-1">{de.suppliers.noSuppliers}</p>
            <p className="text-sm text-muted-foreground mb-3">{de.suppliers.noSuppliersDescription}</p>
            {isAdmin && (
              <Button onClick={() => { setEditingSupplier(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {de.suppliers.addNew}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
