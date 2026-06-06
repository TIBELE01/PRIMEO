// DTOs for admin property moderation
import { z } from 'zod';

export const UnpublishPropertyDto = z.object({
  reason: z.string().min(5).max(500),
});
export type UnpublishPropertyInput = z.infer<typeof UnpublishPropertyDto>;
