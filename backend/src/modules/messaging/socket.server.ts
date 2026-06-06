// Socket.io server — real-time messaging on /chat namespace with JWT auth
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { supabaseAdmin } from '../../config/supabase.config';
import { messagingService } from './messaging.service';
import { disputesService } from '../disputes/disputes.service';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';
import { env } from '../../config/env.config';

// Augment socket.data with typed fields
interface SocketData {
  userId: string;
  role: string;
}

type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

interface ClientToServerEvents {
  join_room: (bookingId: string) => void;
  send_message: (payload: { bookingId: string; content: string }) => void;
  typing: (payload: { bookingId: string; isTyping: boolean }) => void;
  message_read: (payload: { bookingId: string }) => void;
  // Dispute rooms
  join_dispute_room: (disputeId: string) => void;
  send_dispute_message: (payload: { disputeId: string; content: string }) => void;
}

interface ServerToClientEvents {
  receive_message: (message: unknown) => void;
  typing: (payload: { userId: string; isTyping: boolean }) => void;
  messages_read: (payload: { bookingId: string; readBy: string }) => void;
  error: (payload: { message: string }) => void;
  // Dispute events
  receive_dispute_message: (message: unknown) => void;
}

let io: SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function initSocketServer(httpServer: HttpServer): typeof io {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Optional Redis adapter for multi-instance deployments ─────────────────
  if (env.SOCKET_IO_REDIS_ENABLED && env.REDIS_URL) {
    const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter enabled (multi-instance mode)');
      })
      .catch((err) => {
        logger.warn('Socket.io Redis adapter failed to connect — falling back to in-memory', err);
      });
  } else {
    logger.info('Socket.io using in-memory adapter (single-instance mode)');
  }

  const chat = io.of('/chat');

  // ── JWT authentication middleware (Supabase) ──────────────────────────────
  chat.use(async (socket: ChatSocket, next) => {
    const token = socket.handshake.auth?.['token'] as string | undefined;
    if (!token) return next(new Error('Authentification requise'));
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return next(new Error('Token invalide ou expiré'));
      socket.data.userId = user.id;
      socket.data.role = (user.app_metadata?.role as string) ?? 'client';
      next();
    } catch {
      next(new Error('Token invalide ou expiré'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  chat.on('connection', (socket: ChatSocket) => {
    const userId = socket.data.userId;
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal room for push-style events (orders, notifications)
    socket.join(`user:${userId}`);

    // ── join_room ─────────────────────────────────────────────────────────
    socket.on('join_room', async (bookingId: string) => {
      try {
        const authorized = await messagingService.isAuthorized(bookingId, userId, socket.data.role);
        if (!authorized) {
          socket.emit('error', { message: 'Accès non autorisé à cette conversation' });
          return;
        }
        await socket.join(`booking:${bookingId}`);
        logger.debug(`Socket ${socket.id} joined room booking:${bookingId}`);
      } catch (err) {
        socket.emit('error', { message: 'Impossible de rejoindre la salle' });
        logger.error('join_room error', err);
      }
    });

    // ── send_message ──────────────────────────────────────────────────────
    socket.on('send_message', async ({ bookingId, content }) => {
      try {
        const trimmed = content?.trim();
        if (!trimmed || trimmed.length > 2000) {
          socket.emit('error', { message: 'Contenu du message invalide (max 2000 caractères)' });
          return;
        }

        // Verify the sender is in the room (has called join_room first)
        if (!socket.rooms.has(`booking:${bookingId}`)) {
          socket.emit('error', { message: 'Rejoignez d\'abord la salle de conversation' });
          return;
        }

        const message = await messagingService.saveMessage(bookingId, userId, trimmed);

        // Broadcast to all room members (including sender for echo)
        chat.to(`booking:${bookingId}`).emit('receive_message', message);

        // Push notification if receiver is offline in this room
        const receiverId = message.receiverId;
        const socketsInRoom = await chat.in(`booking:${bookingId}`).fetchSockets();
        const receiverIsOnline = socketsInRoom.some((s) => s.data.userId === receiverId);

        if (!receiverIsOnline) {
          notificationsService.notify({
            type: 'new_message',
            recipientId: receiverId,
            data: {
              bookingId,
              senderName: `${message.sender.firstName} ${message.sender.lastName}`,
              messagePreview: trimmed.slice(0, 80),
            },
          }).catch((err) => logger.warn('Push notification for offline user failed', err));
        }
      } catch (err) {
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
        logger.error('send_message error', err);
      }
    });

    // ── typing ────────────────────────────────────────────────────────────
    socket.on('typing', ({ bookingId, isTyping }) => {
      // Broadcast typing indicator to other room members only
      socket.to(`booking:${bookingId}`).emit('typing', { userId, isTyping });
    });

    // ── message_read ──────────────────────────────────────────────────────
    socket.on('message_read', async ({ bookingId }) => {
      try {
        await messagingService.markAsRead(bookingId, userId);
        // Notify other room members that this user read the messages
        socket.to(`booking:${bookingId}`).emit('messages_read', { bookingId, readBy: userId });
      } catch (err) {
        logger.error('message_read error', err);
      }
    });

    // ── join_dispute_room ─────────────────────────────────────────────────
    socket.on('join_dispute_room', async (disputeId: string) => {
      try {
        const ok = await disputesService.isAuthorizedForDispute(disputeId, userId, socket.data.role);
        if (!ok) {
          socket.emit('error', { message: 'Accès non autorisé à ce litige' });
          return;
        }
        await socket.join(`dispute:${disputeId}`);
        logger.debug(`Socket ${socket.id} joined room dispute:${disputeId}`);
      } catch (err) {
        socket.emit('error', { message: 'Impossible de rejoindre la salle du litige' });
        logger.error('join_dispute_room error', err);
      }
    });

    // ── send_dispute_message ──────────────────────────────────────────────
    socket.on('send_dispute_message', async ({ disputeId, content }) => {
      try {
        const trimmed = content?.trim();
        if (!trimmed || trimmed.length > 2000) {
          socket.emit('error', { message: 'Contenu du message invalide (max 2000 caractères)' });
          return;
        }

        if (!socket.rooms.has(`dispute:${disputeId}`)) {
          socket.emit('error', { message: 'Rejoignez d\'abord la salle du litige' });
          return;
        }

        const message = await disputesService.saveDisputeMessage(disputeId, userId, trimmed);
        chat.to(`dispute:${disputeId}`).emit('receive_dispute_message', message);

        // Push notification to the other party if offline
        const socketsInRoom = await chat.in(`dispute:${disputeId}`).fetchSockets();
        const otherPartyId = message.receiverId !== userId ? message.receiverId : message.senderId;
        const otherIsOnline = socketsInRoom.some((s) => s.data.userId === otherPartyId);

        if (!otherIsOnline) {
          notificationsService.notify({
            type: 'new_message',
            recipientId: otherPartyId,
            data: {
              disputeId,
              senderName: `${(message.sender as any).firstName} ${(message.sender as any).lastName}`,
              messagePreview: trimmed.slice(0, 80),
            },
          }).catch((err) => logger.warn('Push notification dispute message failed', err));
        }
      } catch (err) {
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
        logger.error('send_dispute_message error', err);
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  logger.info('Socket.io server initialized on /chat namespace');
  return io;
}

export function getSocketServer(): typeof io {
  return io;
}
