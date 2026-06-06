// DTO for marking booking messages as read
import { z } from 'zod';

export const MarkReadDto = z.object({
  bookingId: z.string().cuid(),
});
export type MarkReadInput = z.infer<typeof MarkReadDto>;
