// Update KYC DTO — allows resubmitting documents after rejection
import { z } from 'zod';

export const UpdateKycDto = z.object({
  businessName: z.string().min(2).max(200).optional(),
  siret: z.string().optional(),
  kycDocumentUrl: z.string().url().optional(),
});
export type UpdateKycInput = z.infer<typeof UpdateKycDto>;
