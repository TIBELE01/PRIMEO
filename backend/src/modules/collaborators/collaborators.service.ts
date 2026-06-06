// Collaborators service — invite/list/update/revoke co-managers (§7.11, Premium only)
import * as crypto from 'crypto';
import { GuestRole } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { redisSet, redisGet, redisDel } from '../../common/utils/redis-client';
import { sendCollaboratorInviteEmail } from '../../common/utils/mailer';
import { logger } from '../../common/utils/logger';
import { InviteCollaboratorInput, UpdateCollaboratorRoleInput } from './dto/collaborator.dto';

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const INVITE_KEY = (token: string) => `collab_invite:${token}`;

interface InvitePayload {
  profileId: string;
  ownerId: string;
  invitedEmail: string;
  role: GuestRole;
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':  return 'administrateur';
    case 'editor': return 'éditeur';
    case 'reader': return 'lecteur';
    default:       return role;
  }
}

async function requirePremiumProfile(userId: string) {
  const [profile, sub] = await Promise.all([
    prisma.professionalProfile.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  if (!profile) throw new HttpError(404, 'Profil professionnel introuvable');
  // Multi-utilisateurs réservé au plan Entreprise
  const eligible = sub && sub.status === 'active' && sub.planType === 'entreprise';
  if (!eligible) {
    throw new HttpError(403, 'La gestion multi-utilisateurs est réservée aux comptes Entreprise actifs');
  }
  return profile;
}

export const collaboratorsService = {
  async invite(ownerId: string, input: InviteCollaboratorInput) {
    const profile = await requirePremiumProfile(ownerId);

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!owner) throw new HttpError(404, 'Utilisateur introuvable');
    if (owner.email.toLowerCase() === input.email.toLowerCase()) {
      throw new HttpError(400, 'Vous ne pouvez pas vous inviter vous-même');
    }

    const existingCount = await prisma.professionalGuest.count({ where: { profileId: profile.id } });
    if (existingCount >= 10) {
      throw new HttpError(400, 'Limite de 10 co-gérants atteinte');
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (invitedUser) {
      const existing = await prisma.professionalGuest.findUnique({
        where: { profileId_guestUserId: { profileId: profile.id, guestUserId: invitedUser.id } },
      });
      if (existing?.isActive) {
        throw new HttpError(409, 'Cet utilisateur est déjà un co-gérant actif');
      }
      if (existing) {
        await prisma.professionalGuest.update({
          where: { id: existing.id },
          data: { role: input.role as GuestRole, invitedAt: new Date() },
        });
      } else {
        await prisma.professionalGuest.create({
          data: {
            profileId: profile.id,
            guestUserId: invitedUser.id,
            role: input.role as GuestRole,
            isActive: false,
          },
        });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const payload: InvitePayload = {
      profileId: profile.id,
      ownerId,
      invitedEmail: input.email,
      role: input.role as GuestRole,
    };
    await redisSet(INVITE_KEY(token), JSON.stringify(payload), INVITE_TTL_SECONDS);

    const businessName = profile.businessName;
    await sendCollaboratorInviteEmail({
      to: [{ email: input.email }],
      inviterName: `${owner.firstName} ${owner.lastName}`,
      businessName,
      role: input.role,
      token,
      invitedUserExists: !!invitedUser,
    });

    logger.info('Collaborator invited', { ownerId, invitedEmail: input.email, role: input.role });
    return { message: 'Invitation envoyée avec succès' };
  },

  async list(ownerId: string) {
    const profile = await requirePremiumProfile(ownerId);

    return prisma.professionalGuest.findMany({
      where: { profileId: profile.id },
      include: {
        guestUser: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  },

  async updateRole(ownerId: string, guestId: string, input: UpdateCollaboratorRoleInput) {
    const profile = await requirePremiumProfile(ownerId);

    const guest = await prisma.professionalGuest.findUnique({ where: { id: guestId } });
    if (!guest || guest.profileId !== profile.id) {
      throw new HttpError(404, 'Co-gérant introuvable');
    }

    const updated = await prisma.professionalGuest.update({
      where: { id: guestId },
      data: { role: input.role as GuestRole },
      include: { guestUser: { select: { firstName: true, lastName: true, email: true } } },
    });

    logger.info('Collaborator role updated', { ownerId, guestId, role: input.role });
    return updated;
  },

  async revoke(ownerId: string, guestId: string) {
    const profile = await requirePremiumProfile(ownerId);

    const guest = await prisma.professionalGuest.findUnique({ where: { id: guestId } });
    if (!guest || guest.profileId !== profile.id) {
      throw new HttpError(404, 'Co-gérant introuvable');
    }

    await prisma.professionalGuest.delete({ where: { id: guestId } });
    logger.info('Collaborator revoked', { ownerId, guestId });
    return { message: 'Accès révoqué' };
  },

  async myInvitations(userId: string) {
    return prisma.professionalGuest.findMany({
      where: { guestUserId: userId, isActive: false },
      include: {
        profile: {
          select: {
            id: true,
            businessName: true,
            city: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  },

  async accept(userId: string, token: string) {
    const raw = await redisGet(INVITE_KEY(token));
    if (!raw) throw new HttpError(400, 'Invitation invalide ou expirée');

    const payload = JSON.parse(raw) as InvitePayload;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    if (user.email.toLowerCase() !== payload.invitedEmail.toLowerCase()) {
      throw new HttpError(403, 'Cette invitation a été envoyée à une autre adresse email');
    }

    const existing = await prisma.professionalGuest.findUnique({
      where: { profileId_guestUserId: { profileId: payload.profileId, guestUserId: userId } },
    });

    let guest;
    if (existing) {
      guest = await prisma.professionalGuest.update({
        where: { id: existing.id },
        data: { isActive: true, acceptedAt: new Date() },
      });
    } else {
      guest = await prisma.professionalGuest.create({
        data: {
          profileId: payload.profileId,
          guestUserId: userId,
          role: payload.role,
          isActive: true,
          acceptedAt: new Date(),
        },
      });
    }

    await redisDel(INVITE_KEY(token));

    // In-app notification to owner
    await prisma.notification.create({
      data: {
        userId: payload.ownerId,
        type: 'collaborator_accepted',
        title: 'Invitation acceptée',
        body: `${user.firstName} ${user.lastName} a rejoint votre espace en tant que ${roleLabel(payload.role)}.`,
        data: { guestId: guest.id, profileId: payload.profileId } as never,
      },
    });

    logger.info('Collaborator invitation accepted', { userId, profileId: payload.profileId });
    return { message: 'Invitation acceptée. Bienvenue dans l\'équipe !', guestId: guest.id };
  },
};
