// Genius Pay webhook callback payload type
import { z } from 'zod';

export const PaymentCallbackDto = z.object({
  event: z.enum(['payment.success', 'payment.failed', 'payment.refunded']),
  nonce: z.string().optional(),
  data: z.object({
    reference: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type PaymentCallbackInput = z.infer<typeof PaymentCallbackDto>;
