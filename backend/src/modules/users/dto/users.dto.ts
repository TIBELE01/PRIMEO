// Zod DTOs for user profile endpoints
import { z } from 'zod';

export const UpdateProfileDto = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileDto>;

export const ChangePasswordDto = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(100),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordDto>;

export const Confirm2faDto = z.object({
  token: z.string().length(6, 'Le code TOTP doit contenir exactement 6 chiffres'),
});
