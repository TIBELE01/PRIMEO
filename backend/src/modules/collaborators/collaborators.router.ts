// Collaborators routes — co-manager management for Premium professionals (§7.11)
import { Router } from 'express';
import {
  inviteCollaborator,
  listCollaborators,
  updateCollaboratorRole,
  revokeCollaborator,
  myInvitations,
  acceptInvitation,
} from './collaborators.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { InviteCollaboratorDto, UpdateCollaboratorRoleDto, AcceptInvitationDto } from './dto/collaborator.dto';

export const collaboratorsRouter = Router();

collaboratorsRouter.use(authenticate);

// ── Owner endpoints (Premium professionals only) ───────────────────────────────
collaboratorsRouter.post(
  '/invite',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  validate(InviteCollaboratorDto),
  inviteCollaborator,
);

collaboratorsRouter.get(
  '/list',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  listCollaborators,
);

collaboratorsRouter.patch(
  '/:id/role',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  validate(UpdateCollaboratorRoleDto),
  updateCollaboratorRole,
);

collaboratorsRouter.delete(
  '/:id',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  revokeCollaborator,
);

// ── Guest (invitee) endpoints — any authenticated user ─────────────────────────
collaboratorsRouter.get('/my-invitations', myInvitations);

collaboratorsRouter.post(
  '/accept',
  validate(AcceptInvitationDto),
  acceptInvitation,
);
