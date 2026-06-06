// DTOs for platform-level configuration (admin only)
import { z } from 'zod';

export const PlatformConfigDto = z.object({
  maintenanceMode: z.boolean().optional(),
  commissionOverride: z.number().min(0).max(100).optional(),
});
export type PlatformConfigInput = z.infer<typeof PlatformConfigDto>;
