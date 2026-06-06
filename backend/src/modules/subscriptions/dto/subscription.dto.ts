// Zod DTOs for subscription endpoints
import { z } from 'zod';

export const UpgradePlanDto = z.object({
  // starter = rétrogradation (gratuit) ; business / entreprise = montées en gamme payantes
  plan: z.enum(['starter', 'business', 'entreprise']),
});
export type UpgradePlanInput = z.infer<typeof UpgradePlanDto>;
