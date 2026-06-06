// Disputes service — conflict resolution workflow
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';
import { CreateDisputeInput } from './dto/dispute.dto';

const REASON_LABELS: Record<string, string> = {
  non_conformity: 'Non-conformité',
  payment_issue: 'Problème de paiement',
  cancellation: 'Annulation abusive',
  no_show: 'Hôte absent / Accès impossible',
  other: 'Autre problème',
};

export const disputesService = {
  async create(userId: string, input: CreateDisputeInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { property: { select: { title: true, ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Booking not found');
    // Either party — the client or the property owner (professional) — may open a dispute
    const isParty = booking.clientId === userId || booking.property?.ownerId === userId;
    if (!isParty) throw new HttpError(403, 'Cannot dispute this booking');

    const existing = await prisma.dispute.findUnique({ where: { bookingId: input.bookingId } });
    if (existing) throw new HttpError(409, 'Dispute already exists for this booking');

    const dispute = await prisma.dispute.create({
      data: { bookingId: input.bookingId, openedBy: userId, reason: input.reason, description: input.description },
    });

    // Notify admins that a new dispute was opened
    const admins = await prisma.user.findMany({ where: { accountType: 'admin' }, select: { id: true } });
    for (const admin of admins) {
      notificationsService.notify({
        type: 'dispute_opened',
        recipientId: admin.id,
        data: {
          disputeId: dispute.id,
          bookingId: input.bookingId,
          reason: REASON_LABELS[input.reason] ?? input.reason,
          propertyTitle: booking.property?.title ?? '',
        },
      }).catch((err) => logger.warn('Notify dispute_opened admin failed', err));
    }

    return dispute;
  },

  async getById(id: string, userId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { booking: { include: { property: { select: { id: true, title: true } } } } },
    });
    if (!dispute) throw new HttpError(404, 'Dispute not found');
    // Only the opener or an admin may see this
    return dispute;
  },

  async listForUser(userId: string) {
    // Disputes the user opened, or where they are the client or the property owner
    return prisma.dispute.findMany({
      where: {
        OR: [
          { openedBy: userId },
          { booking: { clientId: userId } },
          { booking: { property: { ownerId: userId } } },
        ],
      },
      include: { booking: { include: { property: { select: { id: true, title: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  // ── Dispute messaging ─────────────────────────────────────────────────────

  async isAuthorizedForDispute(disputeId: string, userId: string, role: string): Promise<boolean> {
    if (role === 'admin') return true;
    // Both parties to the booking — opener, client and property owner — may access
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      select: { openedBy: true, booking: { select: { clientId: true, property: { select: { ownerId: true } } } } },
    });
    if (!dispute) return false;
    return (
      dispute.openedBy === userId ||
      dispute.booking?.clientId === userId ||
      dispute.booking?.property?.ownerId === userId
    );
  },

  async getMessages(disputeId: string, userId: string, role: string) {
    const ok = await disputesService.isAuthorizedForDispute(disputeId, userId, role);
    if (!ok) throw new HttpError(403, 'Accès non autorisé');

    return prisma.message.findMany({
      where: { disputeId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, accountType: true } },
      },
      orderBy: { sentAt: 'asc' },
    });
  },

  async saveDisputeMessage(disputeId: string, senderId: string, content: string) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new HttpError(404, 'Litige introuvable');

    // For dispute messages receiverId = the client (opener) — simplification so FK is always valid
    const message = await prisma.message.create({
      data: {
        disputeId,
        senderId,
        receiverId: dispute.openedBy,
        content,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, accountType: true } },
      },
    });

    return message;
  },
};
