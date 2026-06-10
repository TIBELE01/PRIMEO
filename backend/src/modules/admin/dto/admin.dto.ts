// Zod DTOs for admin endpoints
import { z } from 'zod';

export const RejectKycDto = z.object({
  reason: z.string().min(10).max(500),
});

export const ResolveDisputeDto = z.object({
  resolution: z.enum(['resolved_no_refund', 'resolved_refund_partial', 'resolved_refund_full']),
  notes: z.string().min(10).max(1000),
});

export const RefundDisputeDto = z.object({
  amount: z.number().int().positive(),
  notes: z.string().min(5).max(500),
});

export const UserNotesDto = z.object({
  notes: z.string().max(2000),
});

export const SuspendUserDto = z.object({
  reason: z.string().min(5).max(500),
});

export const ChangeUserRoleDto = z.object({
  accountType: z.enum([
    'client',
    'professional_hebergement',
    'professional_hotel',
    'professional_immobilier',
    'restaurateur',
  ]),
});

export const RejectPropertyDto = z.object({
  reason: z.string().min(10).max(500),
});

export const RequestModificationsDto = z.object({
  feedback: z.string().min(10).max(1000),
});

export const SuspendPropertyDto = z.object({
  reason: z.string().min(5).max(500),
});

export const UpsertConfigDto = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export const CreatePromoCodeDto = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  discountType: z.enum(['percent', 'fixed_amount']),
  discountValue: z.number().int().positive(),
  minAmount: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  isActive: z.boolean().default(true),
});

export const UpdatePromoCodeDto = CreatePromoCodeDto.partial();

export const ChangeUserPlanDto = z.object({
  plan: z.enum(['starter', 'business', 'entreprise']),
});
export type ChangeUserPlanInput = z.infer<typeof ChangeUserPlanDto>;
