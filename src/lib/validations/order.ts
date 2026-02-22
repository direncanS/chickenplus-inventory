import { z } from 'zod';

export const createOrderSchema = z.object({
  supplierId: z.string().uuid(),
  checklistId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive('Menge muss > 0 sein'),
      unit: z.string().min(1),
    })
  ).min(1, 'Mindestens eine Position ist erforderlich'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['ordered', 'cancelled']).optional(),
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
