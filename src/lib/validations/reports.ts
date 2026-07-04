import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const reportDateRangeSchema = z.object({
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'startDate must be before or equal to endDate' }
);

export type ReportDateRangeInput = z.infer<typeof reportDateRangeSchema>;
