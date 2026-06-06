// DTO for applying a referral code during registration
import { z } from 'zod';

export const ApplyReferralDto = z.object({
  referralCode: z.string().regex(/^REF-[A-Z0-9]{8}$/, 'Invalid referral code format'),
});
export type ApplyReferralInput = z.infer<typeof ApplyReferralDto>;
