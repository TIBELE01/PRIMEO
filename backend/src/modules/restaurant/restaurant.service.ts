// Restaurant service — time slots, menu items, special menus, promotions, no-show
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function requireOwnership(propertyId: string, ownerId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true },
  });
  if (!property) throw new HttpError(404, 'Propriété introuvable');
  if (property.ownerId !== ownerId) throw new HttpError(403, 'Accès non autorisé');
}

// ── Time Slots (§8.3) ─────────────────────────────────────────────────────────

export const restaurantService = {
  // Time slots
  async getTimeSlots(propertyId: string) {
    return prisma.restaurantTimeSlot.findMany({
      where: { propertyId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  },

  async createTimeSlot(
    propertyId: string,
    ownerId: string,
    data: { dayOfWeek: number; startTime: string; endTime: string; maxCapacity: number; isBlocked?: boolean },
  ) {
    await requireOwnership(propertyId, ownerId);
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) throw new HttpError(400, 'dayOfWeek doit être entre 0 et 6');
    if (data.maxCapacity < 1) throw new HttpError(400, 'La capacité doit être au moins 1');
    return prisma.restaurantTimeSlot.create({
      data: { propertyId, ...data, isBlocked: data.isBlocked ?? false },
    });
  },

  async updateTimeSlot(
    propertyId: string,
    slotId: string,
    ownerId: string,
    data: { maxCapacity?: number; isBlocked?: boolean },
  ) {
    await requireOwnership(propertyId, ownerId);
    const slot = await prisma.restaurantTimeSlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.propertyId !== propertyId) throw new HttpError(404, 'Créneau introuvable');
    return prisma.restaurantTimeSlot.update({ where: { id: slotId }, data });
  },

  async deleteTimeSlot(propertyId: string, slotId: string, ownerId: string) {
    await requireOwnership(propertyId, ownerId);
    const slot = await prisma.restaurantTimeSlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.propertyId !== propertyId) throw new HttpError(404, 'Créneau introuvable');
    await prisma.restaurantTimeSlot.delete({ where: { id: slotId } });
  },

  // Menu items (§8.4)
  async getMenuItems(propertyId: string) {
    return prisma.restaurantMenuItem.findMany({
      where: { propertyId },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async createMenuItem(
    propertyId: string,
    ownerId: string,
    data: {
      section: string;
      name: string;
      description?: string;
      price: number;
      allergens?: string[];
      isAvailable?: boolean;
    },
  ) {
    await requireOwnership(propertyId, ownerId);
    if (!data.name?.trim()) throw new HttpError(400, 'Le nom est requis');
    if (data.price < 0) throw new HttpError(400, 'Le prix doit être positif');
    return prisma.restaurantMenuItem.create({
      data: {
        propertyId,
        section: data.section,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: Math.round(data.price),
        allergens: data.allergens ?? [],
        isAvailable: data.isAvailable ?? true,
      },
    });
  },

  async updateMenuItem(
    propertyId: string,
    itemId: string,
    ownerId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      allergens?: string[];
      isAvailable?: boolean;
      sortOrder?: number;
    },
  ) {
    await requireOwnership(propertyId, ownerId);
    const item = await prisma.restaurantMenuItem.findUnique({ where: { id: itemId } });
    if (!item || item.propertyId !== propertyId) throw new HttpError(404, 'Article introuvable');
    return prisma.restaurantMenuItem.update({
      where: { id: itemId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.price !== undefined ? { price: Math.round(data.price) } : {}),
        ...(data.allergens !== undefined ? { allergens: data.allergens } : {}),
        ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
  },

  async deleteMenuItem(propertyId: string, itemId: string, ownerId: string) {
    await requireOwnership(propertyId, ownerId);
    const item = await prisma.restaurantMenuItem.findUnique({ where: { id: itemId } });
    if (!item || item.propertyId !== propertyId) throw new HttpError(404, 'Article introuvable');
    await prisma.restaurantMenuItem.delete({ where: { id: itemId } });
  },

  // Special menus (§8.4)
  async getSpecialMenus(propertyId: string) {
    return prisma.restaurantSpecialMenu.findMany({
      where: { propertyId },
      orderBy: { date: 'asc' },
    });
  },

  async createSpecialMenu(
    propertyId: string,
    ownerId: string,
    data: { name: string; description?: string; date: string; pricePerPerson: number },
  ) {
    await requireOwnership(propertyId, ownerId);
    if (!data.name?.trim()) throw new HttpError(400, 'Le nom est requis');
    if (data.pricePerPerson < 0) throw new HttpError(400, 'Le prix doit être positif');
    return prisma.restaurantSpecialMenu.create({
      data: {
        propertyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        date: new Date(data.date),
        pricePerPerson: Math.round(data.pricePerPerson),
      },
    });
  },

  async deleteSpecialMenu(propertyId: string, menuId: string, ownerId: string) {
    await requireOwnership(propertyId, ownerId);
    const menu = await prisma.restaurantSpecialMenu.findUnique({ where: { id: menuId } });
    if (!menu || menu.propertyId !== propertyId) throw new HttpError(404, 'Menu spécial introuvable');
    await prisma.restaurantSpecialMenu.delete({ where: { id: menuId } });
  },

  // Promotions (§8.8)
  async getPromotions(propertyId: string) {
    return prisma.restaurantPromotion.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createPromotion(
    propertyId: string,
    ownerId: string,
    data: {
      title: string;
      description?: string;
      discountType: 'percent' | 'fixed';
      discountValue: number;
      validUntil?: string;
    },
  ) {
    await requireOwnership(propertyId, ownerId);
    if (!data.title?.trim()) throw new HttpError(400, 'Le titre est requis');
    if (data.discountValue <= 0) throw new HttpError(400, 'La valeur de réduction doit être positive');
    if (data.discountType === 'percent' && data.discountValue > 100) {
      throw new HttpError(400, 'Le pourcentage ne peut pas dépasser 100');
    }
    return prisma.restaurantPromotion.create({
      data: {
        propertyId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        discountType: data.discountType,
        discountValue: Math.round(data.discountValue),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        isActive: true,
      },
    });
  },

  async updatePromotion(
    propertyId: string,
    promoId: string,
    ownerId: string,
    data: { isActive?: boolean },
  ) {
    await requireOwnership(propertyId, ownerId);
    const promo = await prisma.restaurantPromotion.findUnique({ where: { id: promoId } });
    if (!promo || promo.propertyId !== propertyId) throw new HttpError(404, 'Promotion introuvable');
    return prisma.restaurantPromotion.update({ where: { id: promoId }, data });
  },

  async deletePromotion(propertyId: string, promoId: string, ownerId: string) {
    await requireOwnership(propertyId, ownerId);
    const promo = await prisma.restaurantPromotion.findUnique({ where: { id: promoId } });
    if (!promo || promo.propertyId !== propertyId) throw new HttpError(404, 'Promotion introuvable');
    await prisma.restaurantPromotion.delete({ where: { id: promoId } });
  },

  // No-show (§8.5)
  async markNoShow(bookingId: string, raterId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.property.ownerId !== raterId) {
      throw new HttpError(403, 'Seul le professionnel lié à cette réservation peut signaler un no-show');
    }
    if (booking.status !== 'confirmed') {
      throw new HttpError(400, 'Seules les réservations confirmées peuvent être marquées no-show');
    }
    if (booking.isNoShow) throw new HttpError(409, 'Cette réservation est déjà marquée no-show');

    return prisma.booking.update({
      where: { id: bookingId },
      data: { isNoShow: true, noShowAt: new Date() },
    });
  },
};
