// Zod DTOs — validation de toutes les entrées du module auth
import { z } from 'zod';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const IVORIAN_PHONE_REGEX = /^\+2250[0-9]{9}$/;

export const RegisterDto = z.object({
  firstName: z.string().min(2).max(50).trim(),
  lastName: z.string().min(2).max(50).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(IVORIAN_PHONE_REGEX, 'Numéro ivoirien requis (+2250XXXXXXXXX)'),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(PASSWORD_REGEX, 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  accountType: z.enum([
    'client',
    'professional_hebergement',
    'professional_hotel',
    'professional_immobilier',
    'restaurateur',
  ]),
  referralCode:    z.string().optional(),
  businessName:    z.string().optional(),
  businessAddress: z.string().optional(),
  rccm:            z.string().optional(),
  taxNumber:       z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterDto>;

export const VerifyPhoneDto = z.object({
  phone: z.string().regex(IVORIAN_PHONE_REGEX, 'Numéro ivoirien requis'),
  otp: z.string().length(6),
});
export type VerifyPhoneInput = z.infer<typeof VerifyPhoneDto>;

export const ResendOtpDto = z.object({
  phone: z.string().regex(IVORIAN_PHONE_REGEX, 'Numéro ivoirien requis'),
});

export const LoginDto = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginDto>;

export const VerifyTotpDto = z.object({
  userId: z.string().min(1),
  token: z.string().length(6),
});
export type VerifyTotpInput = z.infer<typeof VerifyTotpDto>;

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1),
});

// Connexion/inscription Google (clients uniquement) — tokens de session Supabase
// obtenus côté client après l'OAuth (fragment de l'URL de redirection).
export const GoogleAuthDto = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type GoogleAuthInput = z.infer<typeof GoogleAuthDto>;

export const ForgotPasswordDto = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const ResetPasswordDto = z.object({
  recoveryToken: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(PASSWORD_REGEX, 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
