// DTO for applying a referral code during registration
import { z } from 'zod';

export const ApplyReferralDto = z.object({
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/, 'Code de parrainage invalide'),
});
export type ApplyReferralInput = z.infer<typeof ApplyReferralDto>;
