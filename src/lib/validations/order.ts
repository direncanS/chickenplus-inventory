import { z } from 'zod';

export const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  checklistId: z.string().uuid(),
  initialStatus: z.enum(['draft', 'ordered']).optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive('Menge muss > 0 sein'),
      unit: z.string().min(1),
      isOrdered: z.boolean().optional(),
      orderedQuantity: z.number().int('Bestellmenge muss eine ganze Zahl sein').positive('Bestellmenge muss > 0 sein').nullable().optional(),
    })
  ).min(1, 'Mindestens eine Position ist erforderlich'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderedItemDetailsSchema = z
  .object({
    orderItemId: z.string().uuid(),
    isOrdered: z.boolean(),
    orderedQuantity: z.number().int('Bestellmenge muss eine ganze Zahl sein').positive('Bestellmenge muss > 0 sein').nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.isOrdered && value.orderedQuantity != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bestellmenge nur fuer bestellte Positionen erlaubt',
        path: ['orderedQuantity'],
      });
    }
  });

export const updateOrderItemsSchema = z.object({
  orderId: z.string().uuid(),
  orderedItems: z.array(orderedItemDetailsSchema).min(1, 'Mindestens eine Positionsaenderung ist erforderlich'),
});

export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;

export const suggestionOrderItemSchema = z
  .object({
    checklistItemId: z.string().uuid(),
    isOrdered: z.boolean(),
    orderedQuantity: z.number().int('Bestellmenge muss eine ganze Zahl sein').positive('Bestellmenge muss > 0 sein').nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.isOrdered && value.orderedQuantity != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bestellmenge nur fuer bestellte Positionen erlaubt',
        path: ['orderedQuantity'],
      });
    }
  });

export const finalizeSuggestionGroupSchema = z.object({
  checklistId: z.string().uuid(),
  supplierId: z.string().uuid().nullable(),
  supplierName: z.string().min(1).max(120),
  items: z.array(suggestionOrderItemSchema).min(1, 'Mindestens eine Position ist erforderlich'),
});

export type FinalizeSuggestionGroupInput = z.infer<typeof finalizeSuggestionGroupSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['ordered', 'cancelled']).optional(),
  orderedItems: z.array(orderedItemDetailsSchema).optional(),
  itemDeliveries: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        isDelivered: z.boolean(),
      })
    )
    .optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
