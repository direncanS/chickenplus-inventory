import { z } from 'zod';
import { DAYS_OF_WEEK } from '@/lib/constants';

export const createRoutineOrderSchema = z.object({
  supplierId: z.string().uuid(),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateRoutineOrderInput = z.infer<typeof createRoutineOrderSchema>;

export const updateRoutineOrderSchema = z.object({
  routineId: z.string().uuid(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateRoutineOrderInput = z.infer<typeof updateRoutineOrderSchema>;

export const addRoutineOrderItemSchema = z.object({
  routineOrderId: z.string().uuid(),
  productId: z.string().uuid(),
  defaultQuantity: z.number().positive('Menge muss größer als 0 sein'),
});

export type AddRoutineOrderItemInput = z.infer<typeof addRoutineOrderItemSchema>;

export const removeRoutineOrderItemSchema = z.object({
  itemId: z.string().uuid(),
});

export type RemoveRoutineOrderItemInput = z.infer<typeof removeRoutineOrderItemSchema>;

export const adjustRoutineInstanceItemSchema = z.object({
  itemId: z.string().uuid(),
  adjustedQuantity: z.number().positive('Menge muss größer als 0 sein').nullable().optional(),
  isIncluded: z.boolean().optional(),
});

export type AdjustRoutineInstanceItemInput = z.infer<typeof adjustRoutineInstanceItemSchema>;

export const generateRoutineInstancesSchema = z.object({
  isoYear: z.number().int(),
  isoWeek: z.number().int().min(1).max(53),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checklistId: z.string().uuid().nullable().optional(),
});

export type GenerateRoutineInstancesInput = z.infer<typeof generateRoutineInstancesSchema>;

export const confirmRoutineInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  checklistId: z.string().uuid(),
});

export type ConfirmRoutineInstanceInput = z.infer<typeof confirmRoutineInstanceSchema>;

export const skipRoutineInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  checklistId: z.string().uuid(),
});

export type SkipRoutineInstanceInput = z.infer<typeof skipRoutineInstanceSchema>;
