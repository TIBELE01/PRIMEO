// Zod DTOs for collaborator management endpoints (§7.11)
import { z } from 'zod';

export const InviteCollaboratorDto = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'editor', 'reader']),
});
export type InviteCollaboratorInput = z.infer<typeof InviteCollaboratorDto>;

export const UpdateCollaboratorRoleDto = z.object({
  role: z.enum(['admin', 'editor', 'reader']),
});
export type UpdateCollaboratorRoleInput = z.infer<typeof UpdateCollaboratorRoleDto>;

export const AcceptInvitationDto = z.object({
  token: z.string().min(64).max(64),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationDto>;
