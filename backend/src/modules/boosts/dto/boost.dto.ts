// Zod DTOs for boost endpoints
import { z } from 'zod';

export const CreateBoostDto = z.object({
  propertyId: z.string().cuid(),
  type: z.enum(['paid', 'free']),
});
export type CreateBoostInput = z.infer<typeof CreateBoostDto>;
