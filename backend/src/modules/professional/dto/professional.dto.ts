// DTOs Zod pour les endpoints professionnels
import { z } from 'zod';

// Soumission KYC — informations légales. Les documents sont envoyés en multipart
// (champs fichiers : id_card, rccm_extract, tax_id_certificate, tourist_license, other)
// et ne sont donc pas validés ici mais dans le service.
export const SubmitKycDto = z.object({
  businessName: z.string().min(2).max(200),
  rccm: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  touristLicense: z.string().max(100).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});
export type SubmitKycInput = z.infer<typeof SubmitKycDto>;

export const ConfirmTotpDto = z.object({
  token: z.string().length(6),
});
