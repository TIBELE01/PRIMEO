// Messaging service — message persistence, access control, conversation listing
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

export const messagingService = {
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
