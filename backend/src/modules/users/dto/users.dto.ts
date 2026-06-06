// Zod DTOs for user profile endpoints
import { z } from 'zod';

export const UpdateProfileDto = z.object({
  firstName:   z.string().min(2).max(50).optional(),
  lastName:    z.string().min(2).max(50).optional(),
  phone:       z.string().optional(),
  birthDate:   z.string().datetime().optional().nullable(),
  gender:      z.enum(['male', 'female', 'other']).optional().nullable(),
  avatarUrl:   z.string().url().optional().nullable(),
  // Champs professionnels (ignorés pour les clients)
  businessName:   z.string().max(150).optional(),
  rccm:           z.string().max(100).optional().nullable(),
  taxId:          z.string().max(100).optional().nullable(),
  touristLicense: z.string().max(100).optional().nullable(),
  description:    z.string().max(1000).optional().nullable(),
  website:        z.string().url().optional().nullable(),
  street:         z.string().max(200).optional().nullable(),
  city:           z.string().max(100).optional().nullable(),
}).strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileDto>;

export const ChangePasswordDto = z.object({
  currentPassword: z.string(),
  newPassword:     z.string().min(8).max(100),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordDto>;

export const DeactivateDto = z.object({
  duration: z.enum(['1_week', '1_month', 'indefinite']).default('indefinite'),
  reason:   z.string().max(500).optional(),
});
export type DeactivateInput = z.infer<typeof DeactivateDto>;

export const Confirm2faDto = z.object({
  token: z.string().length(6, 'Le code TOTP doit contenir exactement 6 chiffres'),
});

export const DeleteAccountDto = z.object({
  password: z.string(),
  reason:   z.string().max(500).optional(),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountDto>;
