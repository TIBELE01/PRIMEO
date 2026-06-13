// Messaging service — message persistence, access control, conversation listing
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

// Réponses rapides génériques — affichées aux clients (non éditables).
const GENERIC_CLIENT_TEMPLATES = [
  { label: 'Heures d\'arrivée ?', content: 'Bonjour, quelles sont les heures d\'arrivée et de départ ?' },
  { label: 'Toujours dispo ?', content: 'Bonjour, ce logement est-il toujours disponible pour mes dates ?' },
  { label: 'Demander la facture', content: 'Bonjour, puis-je avoir une facture pour ma réservation ?' },
  { label: 'Comment s\'y rendre ?', content: 'Bonjour, pouvez-vous m\'indiquer comment me rendre sur place ?' },
  { label: 'Merci', content: 'Merci beaucoup pour votre réponse !' },
];

// Modèles par défaut proposés au pro tant qu'il n'a rien créé.
const DEFAULT_PRO_TEMPLATES = [
  { label: 'Bienvenue', content: 'Bonjour et merci pour votre réservation ! Je reste à votre disposition pour toute question.' },
  { label: 'Check-in', content: 'Bonjour, l\'arrivée se fait à partir de 14h et le départ avant 11h. Souhaitez-vous un autre horaire ?' },
  { label: 'Itinéraire', content: 'Voici les instructions pour vous rendre sur place : ' },
  { label: 'Facture envoyée', content: 'Votre facture est disponible dans l\'application, rubrique « Mes réservations ».' },
  { label: 'Bon séjour', content: 'Tout est prêt pour votre arrivée. Excellent séjour à vous !' },
];

const isPro = (role: string) =>
  ['professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'].includes(role);

export const messagingService = {
  // ── Réponses rapides ─────────────────────────────────────────────────────────

  async listTemplates(userId: string, role: string) {
    if (!isPro(role)) {
      return GENERIC_CLIENT_TEMPLATES.map((t, i) => ({ id: `generic-${i}`, ...t, editable: false }));
    }
    const custom = await prisma.messageTemplate.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
    if (custom.length > 0) {
      return custom.map((t) => ({ id: t.id, label: t.label, content: t.content, editable: true }));
    }
    // Aucun modèle perso → suggestions par défaut (non persistées)
    return DEFAULT_PRO_TEMPLATES.map((t, i) => ({ id: `default-${i}`, ...t, editable: false }));
  },

  async createTemplate(userId: string, role: string, input: { label: string; content: string }) {
    if (!isPro(role)) throw new HttpError(403, 'Réservé aux comptes professionnels');
    const label = input.label?.trim();
    const content = input.content?.trim();
    if (!label || !content) throw new HttpError(400, 'Libellé et message requis');
    const count = await prisma.messageTemplate.count({ where: { userId } });
    if (count >= 30) throw new HttpError(400, 'Limite de 30 modèles atteinte');
    return prisma.messageTemplate.create({ data: { userId, label, content, sortOrder: count } });
  },

  async updateTemplate(userId: string, id: string, input: { label?: string; content?: string; sortOrder?: number }) {
    const tpl = await prisma.messageTemplate.findFirst({ where: { id, userId } });
    if (!tpl) throw new HttpError(404, 'Modèle introuvable');
    return prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.content !== undefined ? { content: input.content.trim() } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
  },

  async deleteTemplate(userId: string, id: string) {
    const tpl = await prisma.messageTemplate.findFirst({ where: { id, userId } });
    if (!tpl) throw new HttpError(404, 'Modèle introuvable');
    await prisma.messageTemplate.delete({ where: { id } });
    return { removed: true };
  },

  // Returns true if userId is allowed to participate in the booking conversation
  async isAuthorized(bookingId: string, userId: string, role: string): Promise<boolean> {
    if (role === 'admin') return true;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, property: { select: { ownerId: true } } },
    });
    if (!booking) return false;
    return booking.clientId === userId || booking.property.ownerId === userId;
  },

  async getConversation(
    bookingId: string,
    userId: string,
    role: string,
    page = 1,
    limit = 50,
  ) {
    const authorized = await messagingService.isAuthorized(bookingId, userId, role);
    if (!authorized) throw new HttpError(403, 'Accès non autorisé à cette conversation');

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { bookingId },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { sentAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { bookingId } }),
    ]);

    return { messages, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async listConversations(userId: string, role: string) {
    // Find all bookings where user is client or professional
    const bookingFilter =
      role === 'admin'
        ? {}
        : {
            OR: [
              { clientId: userId },
              { property: { ownerId: userId } },
            ],
          };

    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingFilter,
        messages: { some: {} }, // only bookings with at least one message
      },
      select: {
        id: true,
        client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { id: true, content: true, sentAt: true, senderId: true, isRead: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Attach unread count per conversation
    const withUnread = await Promise.all(
      bookings.map(async (b) => {
        const unreadCount = await prisma.message.count({
          where: { bookingId: b.id, receiverId: userId, isRead: false },
        });
        return { ...b, lastMessage: b.messages[0] ?? null, unreadCount };
      }),
    );

    return withUnread;
  },

  async markAsRead(bookingId: string, userId: string) {
    const result = await prisma.message.updateMany({
      where: { bookingId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  },

  async saveMessage(bookingId: string, senderId: string, content: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const receiverId =
      senderId === booking.clientId ? booking.property.ownerId : booking.clientId;

    return prisma.message.create({
      data: { bookingId, senderId, receiverId, content },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  },
};
