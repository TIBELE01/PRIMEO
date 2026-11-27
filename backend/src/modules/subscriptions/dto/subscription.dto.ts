// Zod DTOs for subscription endpoints
import { z } from 'zod';

export const UpgradePlanDto = z.object({
  // starter = rétrogradation (gratuit) ; business / entreprise = montées en gamme payantes
  plan: z.enum(['starter', 'business', 'entreprise']),
  // Code promo facultatif (codes créés dans l'admin, mêmes règles que pour les réservations)
  promoCode: z.string().trim().max(50).optional(),
});
export type UpgradePlanInput = z.infer<typeof UpgradePlanDto>;
