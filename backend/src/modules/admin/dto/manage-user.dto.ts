// DTOs for admin user management actions
import { z } from 'zod';

export const BanUserDto = z.object({
  reason: z.string().min(5).max(500).optional(),
});
export type BanUserInput = z.infer<typeof BanUserDto>;

export const ManageUserQueryDto = z.object({
  role: z.enum(['client', 'professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(100).default(20),
});
export type ManageUserQuery = z.infer<typeof ManageUserQueryDto>;
