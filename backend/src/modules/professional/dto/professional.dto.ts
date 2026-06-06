// Zod DTOs for professional endpoints
import { z } from 'zod';

export const SubmitKycDto = z.object({
  businessName: z.string().min(2).max(200),
  siret: z.string().optional(),
  kycDocumentUrl: z.string().url().optional(),
});
export type SubmitKycInput = z.infer<typeof SubmitKycDto>;

export const ConfirmTotpDto = z.object({
  token: z.string().length(6),
});
