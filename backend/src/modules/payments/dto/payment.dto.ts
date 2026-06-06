// Zod DTOs for payment endpoints
import { z } from 'zod';

export const InitiatePaymentDto = z.object({
  bookingId: z.string().cuid(),
});
export type InitiatePaymentInput = z.infer<typeof InitiatePaymentDto>;
