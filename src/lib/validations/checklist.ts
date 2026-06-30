import { z } from 'zod';

export const updateChecklistItemSchema = z.object({
  checklistItemId: z.string().uuid(),
  currentStock: z.number().min(0, 'Bestand muss >= 0 sein').nullable(),
  missingAmountFinal: z.number().min(0, 'Fehlt muss >= 0 sein').nullable().optional(),
  isMissingOverridden: z.boolean().optional(),
  isChecked: z.boolean().optional(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export const completeChecklistSchema = z.object({
  checklistId: z.string().uuid(),
});

export type CompleteChecklistInput = z.infer<typeof completeChecklistSchema>;

export const reopenChecklistSchema = z.object({
  checklistId: z.string().uuid(),
});

export type ReopenChecklistInput = z.infer<typeof reopenChecklistSchema>;
