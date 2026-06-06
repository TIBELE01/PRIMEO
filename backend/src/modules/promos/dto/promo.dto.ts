// Zod DTOs for promo endpoints
import { z } from 'zod';

export const ValidatePromoDto = z.object({
  code: z.string().min(3).max(50),
});

export const CreatePromoDto = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().optional(),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});
