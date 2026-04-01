'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { de } from '@/i18n/de';
import { createSupplier, updateSupplier } from '@/app/(app)/suppliers/actions';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
}

export function SupplierForm({
  supplier,
  onClose,
}: {
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const isEditing = supplier !== null;
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactName, setContactName] = useState(supplier?.contact_name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isEditing) {
      const result = await updateSupplier({
        supplierId: supplier.id,
        name,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(de.suppliers.updateSuccess);
        onClose();
      }
    } else {
      const result = await createSupplier({
        name,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(de.suppliers.createSuccess);
        onClose();
      }
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isEditing ? `${de.common.edit}: ${supplier.name}` : de.suppliers.addNew}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="supplier-name">{de.suppliers.name} *</Label>
            <Input
              id="supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contact-name">{de.suppliers.contactName}</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">{de.suppliers.phone}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">{de.suppliers.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">{de.suppliers.address}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {de.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? de.common.loading : de.common.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
