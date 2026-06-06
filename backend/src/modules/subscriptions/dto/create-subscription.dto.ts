// DTO for initial subscription creation (Essentiel is auto-created on KYC approval)
import { z } from 'zod';

export const CreateSubscriptionDto = z.object({
  plan: z.enum(['essentiel', 'prestige', 'premium']).default('essentiel'),
});
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionDto>;
