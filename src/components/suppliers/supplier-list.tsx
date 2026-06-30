'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { de } from '@/i18n/de';
import { SupplierForm } from './supplier-form';
import { ProductSupplierMapping } from './product-supplier-mapping';
import { updateSupplier } from '@/app/(app)/suppliers/actions';
import { toast } from 'sonner';
import { Plus, Phone, Mail, MapPin, User, ChevronDown, ChevronUp, Package } from 'lucide-react';

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

      <div className="grid gap-3">
        {suppliers.map((supplier) => {
          const isExpanded = expandedSupplier === supplier.id;
          return (
            <Card key={supplier.id} className={!supplier.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{supplier.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                      {supplier.is_active ? de.suppliers.active : de.suppliers.inactive}
                    </Badge>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingSupplier(supplier); setShowForm(true); }}
                        >
                          {de.common.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(supplier)}
                        >
                          {supplier.is_active ? de.suppliers.deactivate : de.suppliers.activate}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {supplier.contact_name}
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
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
                      className="flex items-center gap-2 text-sm font-medium w-full text-left"
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
              </CardContent>
            </Card>
          );
        })}
        {suppliers.length === 0 && (
          <div className="text-center py-8">
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
