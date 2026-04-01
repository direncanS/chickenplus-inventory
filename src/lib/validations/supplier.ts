import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  contactName: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').max(200).nullable().optional().or(z.literal('')),
  address: z.string().max(500).nullable().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1, 'Name ist erforderlich').max(200).optional(),
  contactName: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').max(200).nullable().optional().or(z.literal('')),
  address: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const productSupplierSchema = z.object({
  productId: z.string().uuid(),
  supplierId: z.string().uuid(),
  isPreferred: z.boolean().default(false),
  unitPrice: z.number().min(0, 'Preis muss >= 0 sein').nullable().optional(),
});

export type ProductSupplierInput = z.infer<typeof productSupplierSchema>;
