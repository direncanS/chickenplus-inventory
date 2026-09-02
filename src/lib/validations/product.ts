import { z } from 'zod';
import { UNIT_TYPES } from '@/lib/constants';

const nullablePositiveNumber = z
  .number()
  .min(0, 'Wert muss groesser oder gleich 0 sein')
  .nullable()
  .optional();

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1, 'Name ist erforderlich').max(200),
    storageLocationId: z.string().uuid(),
    categoryId: z.string().uuid(),
    unit: z.enum(UNIT_TYPES).nullable().optional(),
    minStock: nullablePositiveNumber,
    minStockMax: nullablePositiveNumber,
    sortOrder: z.number().int().min(0).max(10000),
    preferredSupplierId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.minStock == null ||
      value.minStockMax == null ||
      value.minStockMax >= value.minStock,
    {
      message: 'Maximalbestand muss groesser oder gleich Mindestbestand sein',
      path: ['minStockMax'],
    }
  );

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  productId: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const toggleProductActiveSchema = z.object({
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

export type ToggleProductActiveInput = z.infer<typeof toggleProductActiveSchema>;
