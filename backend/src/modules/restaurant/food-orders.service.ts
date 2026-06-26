// Food orders service — commandes de nourriture (restaurant)
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { getSocketServer } from '../messaging/socket.server';
import { sendPushNotification } from '../../common/utils/push';
import { sendEmail } from '../../common/utils/mailer';
import { logger } from '../../common/utils/logger';
import { FoodOrderStatus, FoodOrderDeliveryType } from '@prisma/client';

const VALID_TRANSITIONS: Record<string, FoodOrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['delivered'],
};

const STATUS_MESSAGES: Record<string, { fr: string; en: string }> = {
  confirmed: { fr: '✅ Commande confirmée !',    en: '✅ Order confirmed!' },
  preparing: { fr: '👨‍🍳 En cours de préparation', en: '👨‍🍳 Being prepared...' },
  ready:     { fr: '🎉 Commande prête !',          en: '🎉 Your order is ready!' },
  delivered: { fr: '📦 Commande livrée',           en: '📦 Order delivered' },
  cancelled: { fr: '❌ Commande annulée',           en: '❌ Order cancelled' },
};

export const foodOrdersService = {

  // ── Client : passer une commande ──────────────────────────────────────────

  async createOrder(
    clientId: string,
    data: {
      propertyId: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
      deliveryType: FoodOrderDeliveryType;
      deliveryAddress?: string;
      specialInstructions?: string;
    },
  ) {
    if (!data.items || data.items.length === 0) {
      throw new HttpError(400, 'La commande doit contenir au moins un article');
    }

    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      select: {
        id: true, ownerId: true, propertyType: true, status: true, title: true,
        owner: { select: { id: true, onesignalPlayerId: true, firstName: true, email: true } },
      },
    });
    if (!property) throw new HttpError(404, 'Restaurant introuvable');
    if (property.propertyType !== 'restaurant') throw new HttpError(400, 'Cette propriété n\'est pas un restaurant');
    if (property.status !== 'active') throw new HttpError(400, 'Ce restaurant n\'est pas disponible actuellement');
    if (data.deliveryType === 'delivery' && !data.deliveryAddress?.trim()) {
      throw new HttpError(400, 'L\'adresse de livraison est requise pour une commande en livraison');
    }

    const menuItemIds = [...new Set(data.items.map(i => i.menuItemId))];
    const menuItems = await prisma.restaurantMenuItem.findMany({
      // status:'approved' → on ne peut commander qu'un plat validé par l'admin
      where: { id: { in: menuItemIds }, propertyId: data.propertyId, status: 'approved' },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new HttpError(400, 'Certains articles sont introuvables, non validés ou n\'appartiennent pas à ce restaurant');
    }
    const unavailable = menuItems.filter(m => !m.isAvailable);
    if (unavailable.length > 0) {
      throw new HttpError(400, `Article(s) non disponible(s) : ${unavailable.map(m => m.name).join(', ')}`);
    }

    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    let totalAmount = 0;
    const orderItems = data.items.map(item => {
      if (item.quantity < 1) throw new HttpError(400, 'La quantité doit être au moins 1');
      const menuItem = menuMap.get(item.menuItemId)!;
      const unitPrice  = menuItem.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      return { menuItemId: item.menuItemId, quantity: item.quantity, unitPrice, totalPrice, notes: item.notes?.trim() || null };
    });

    const order = await prisma.foodOrder.create({
      data: {
        propertyId: data.propertyId,
        clientId,
        totalAmount,
        specialInstructions: data.specialInstructions?.trim() || null,
        deliveryType: data.deliveryType,
        deliveryAddress: data.deliveryAddress?.trim() || null,
        items: { create: orderItems },
      },
      include: {
        items: { include: { menuItem: { select: { name: true, section: true, photoUrl: true } } } },
        client: { select: { firstName: true, lastName: true, phone: true, email: true } },
        property: { select: { title: true } },
      },
    });

    // Notify restaurant via socket (restaurant owner personal room)
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/chat').to(`user:${property.ownerId}`).emit('order:new' as any, order);
      }
    } catch (e) { logger.warn('Socket emit order:new failed', e); }

    // Push notification to restaurant owner
    if (property.owner.onesignalPlayerId) {
      sendPushNotification({
        playerIds: [property.owner.onesignalPlayerId],
        headings: { fr: '🍽️ Nouvelle commande !', en: '🍽️ New order!' },
        contents: {
          fr: `Commande de ${order.client.firstName} — ${totalAmount.toLocaleString()} FCFA`,
          en: `Order from ${order.client.firstName} — ${totalAmount.toLocaleString()} FCFA`,
        },
        data: { type: 'new_food_order', orderId: order.id, propertyId: data.propertyId },
        priority: 10,
      }).catch(e => logger.warn('Push notification new_food_order failed', e));
    }

    // Notification in-app (pro) — apparaît dans la liste des notifications
    prisma.notification.create({
      data: {
        userId: property.ownerId,
        type: 'new_food_order',
        title: 'Nouvelle commande',
        body: `${order.client.firstName} a passé une commande (${totalAmount.toLocaleString('fr-CI')} FCFA).`,
        data: { type: 'new_food_order', orderId: order.id, propertyId: data.propertyId } as never,
      },
    }).catch(e => logger.warn('In-app notification new_food_order failed', e));

    // Emails de confirmation (pro + client) — best effort
    const itemsLines = order.items.map(it => `${it.quantity}× ${it.menuItem.name}`).join(', ');
    if (property.owner.email) {
      sendEmail({
        to: [{ email: property.owner.email, name: property.owner.firstName }],
        subject: `🍽️ Nouvelle commande — ${property.title}`,
        htmlContent: `<p>Bonjour ${property.owner.firstName},</p><p>Nouvelle commande de <strong>${order.client.firstName} ${order.client.lastName}</strong> : ${itemsLines}.</p><p>Total : <strong>${totalAmount.toLocaleString('fr-CI')} FCFA</strong> — ${data.deliveryType === 'delivery' ? 'Livraison' : 'Sur place / à emporter'}.</p><p>Retrouvez-la dans votre tableau de bord, onglet « Commandes ».</p>`,
      }).catch(e => logger.warn('Email new_food_order (pro) failed', e));
    }
    if (order.client.email) {
      sendEmail({
        to: [{ email: order.client.email, name: order.client.firstName }],
        subject: `Confirmation de commande — ${property.title}`,
        htmlContent: `<p>Bonjour ${order.client.firstName},</p><p>Votre commande chez <strong>${property.title}</strong> a bien été transmise : ${itemsLines}.</p><p>Total : <strong>${totalAmount.toLocaleString('fr-CI')} FCFA</strong>.</p><p>Le restaurant la prépare. Merci !</p>`,
      }).catch(e => logger.warn('Email new_food_order (client) failed', e));
    }

    return order;
  },

  // ── Client : mes commandes ────────────────────────────────────────────────

  async getClientOrders(clientId: string, params: { status?: string; propertyId?: string } = {}) {
    return prisma.foodOrder.findMany({
      where: {
        clientId,
        ...(params.status   ? { status:     params.status     as FoodOrderStatus }     : {}),
        ...(params.propertyId ? { propertyId: params.propertyId } : {}),
      },
      include: {
        items:    { include: { menuItem: { select: { name: true, section: true, photoUrl: true } } } },
        property: { select: { title: true, id: true } },
      },
      orderBy: { orderedAt: 'desc' },
    });
  },

  // ── Commun : détail d'une commande ────────────────────────────────────────

  async getOrderById(orderId: string, userId: string) {
    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: {
        items:    { include: { menuItem: true } },
        client:   { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
        property: { select: { title: true, ownerId: true, id: true } },
      },
    });
    if (!order) throw new HttpError(404, 'Commande introuvable');
    if (order.clientId !== userId && order.property.ownerId !== userId) {
      throw new HttpError(403, 'Accès refusé');
    }
    return order;
  },

  // ── Client : annuler une commande ─────────────────────────────────────────

  async cancelOrder(orderId: string, clientId: string, reason?: string) {
    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: { property: { select: { ownerId: true } } },
    });
    if (!order) throw new HttpError(404, 'Commande introuvable');
    if (order.clientId !== clientId) throw new HttpError(403, 'Accès refusé');
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new HttpError(400, 'Seules les commandes en attente ou confirmées peuvent être annulées par le client');
    }

    const updated = await prisma.foodOrder.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason?.trim() || null },
    });

    try {
      const io = getSocketServer();
      if (io) io.of('/chat').to(`user:${order.property.ownerId}`).emit('order:status' as any, { orderId, status: 'cancelled' });
    } catch (e) { logger.warn('Socket emit order:status failed', e); }

    return updated;
  },

  // ── Restaurant : liste des commandes ──────────────────────────────────────

  async getRestaurantOrders(
    ownerId: string,
    propertyId: string,
    params: { status?: string } = {},
  ) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });
    if (!property) throw new HttpError(404, 'Restaurant introuvable');
    if (property.ownerId !== ownerId) throw new HttpError(403, 'Accès refusé');

    return prisma.foodOrder.findMany({
      where: {
        propertyId,
        ...(params.status ? { status: params.status as FoodOrderStatus } : {}),
      },
      include: {
        items:  { include: { menuItem: { select: { name: true, section: true, photoUrl: true } } } },
        client: { select: { firstName: true, lastName: true, phone: true, avatarUrl: true } },
      },
      orderBy: { orderedAt: 'desc' },
    });
  },

  // ── Restaurant : mettre à jour le statut d'une commande ──────────────────

  async updateOrderStatus(
    orderId: string,
    ownerId: string,
    status: FoodOrderStatus,
    estimatedMinutes?: number,
  ) {
    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: {
        property: { select: { ownerId: true } },
        client:   { select: { onesignalPlayerId: true, firstName: true } },
      },
    });
    if (!order) throw new HttpError(404, 'Commande introuvable');
    if (order.property.ownerId !== ownerId) throw new HttpError(403, 'Accès refusé');

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new HttpError(400, `Transition invalide : ${order.status} → ${status}`);
    }

    const timestamps: Record<string, Date | null> = {};
    if (status === 'confirmed') timestamps.confirmedAt = new Date();
    if (status === 'ready')     timestamps.readyAt     = new Date();
    if (status === 'delivered') timestamps.deliveredAt = new Date();
    if (status === 'cancelled') timestamps.cancelledAt = new Date();

    const updated = await prisma.foodOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...timestamps,
        ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
      },
    });

    // Socket notification to client
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/chat').to(`user:${order.clientId}`).emit('order:status' as any, {
          orderId, status, estimatedMinutes,
        });
      }
    } catch (e) { logger.warn('Socket emit order:status failed', e); }

    // Push notification to client
    const msg = STATUS_MESSAGES[status];
    if (msg && order.client.onesignalPlayerId) {
      sendPushNotification({
        playerIds: [order.client.onesignalPlayerId],
        headings: { fr: msg.fr, en: msg.en },
        contents: {
          fr: `Commande #${orderId.slice(-6).toUpperCase()} — ${order.property ? '' : ''}`,
          en: `Order #${orderId.slice(-6).toUpperCase()}`,
        },
        data: { type: 'food_order_status', orderId, status },
        priority: 10,
      }).catch(e => logger.warn('Push food_order_status failed', e));
    }

    return updated;
  },
};
