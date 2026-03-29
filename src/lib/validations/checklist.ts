import { z } from 'zod';

export const updateChecklistItemSchema = z.object({
  checklistItemId: z.string().uuid(),
  currentStock: z.string().max(100).nullable().optional(),
  isMissing: z.boolean().optional(),
  isChecked: z.boolean().optional(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export const updateChecklistItemsBatchSchema = z.object({
  checklistId: z.string().uuid(),
  items: z
    .array(
      z.object({
        checklistItemId: z.string().uuid(),
        currentStock: z.string().max(100).nullable(),
        isMissing: z.boolean(),
        isChecked: z.boolean(),
      })
    )
    .min(1),
});

export type UpdateChecklistItemsBatchInput = z.infer<typeof updateChecklistItemsBatchSchema>;

export const createChecklistSchema = z.object({
  checklistDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;

export const completeChecklistSchema = z.object({
  checklistId: z.string().uuid(),
});

export type CompleteChecklistInput = z.infer<typeof completeChecklistSchema>;

export const reopenChecklistSchema = z.object({
  checklistId: z.string().uuid(),
});

export type ReopenChecklistInput = z.infer<typeof reopenChecklistSchema>;
