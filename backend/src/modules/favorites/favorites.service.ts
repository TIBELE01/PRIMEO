// Favorites service — saved property management
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { serializeProperty } from '../properties/properties.service';

export const favoritesService = {
  async listForUser(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        property: { include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Normalise property output so cards reading images/mainImageUrl render thumbnails.
    return favorites.map((f) => ({
      ...f,
      property: f.property ? serializeProperty(f.property as unknown as Record<string, unknown>) : f.property,
    }));
  },

  async add(userId: string, propertyId: string) {
    try {
      return await prisma.favorite.create({ data: { userId, propertyId } });
    } catch {
      throw new HttpError(409, 'Property already in favorites');
    }
  },

  async remove(userId: string, propertyId: string) {
    const fav = await prisma.favorite.findUnique({ where: { userId_propertyId: { userId, propertyId } } });
    if (!fav) throw new HttpError(404, 'Favorite not found');
    await prisma.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
  },

  // ── Favorite Lists ──────────────────────────────────────────────────────────

  async listLists(userId: string) {
    return prisma.favoriteList.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createList(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) throw new HttpError(400, 'Nom de liste invalide (1-100 caractères)');
    const count = await prisma.favoriteList.count({ where: { userId } });
    if (count >= 20) throw new HttpError(400, 'Vous avez atteint la limite de 20 listes');
    return prisma.favoriteList.create({ data: { userId, name: trimmed } });
  },

  async deleteList(listId: string, userId: string) {
    const list = await prisma.favoriteList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new HttpError(404, 'Liste introuvable');
    await prisma.favoriteList.delete({ where: { id: listId } });
    return { removed: true };
  },

  async addItemToList(listId: string, propertyId: string, userId: string) {
    const list = await prisma.favoriteList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new HttpError(404, 'Liste introuvable');
    try {
      return await prisma.favoriteListItem.create({ data: { listId, propertyId } });
    } catch {
      throw new HttpError(409, 'Propriété déjà dans cette liste');
    }
  },

  async removeItemFromList(listId: string, propertyId: string, userId: string) {
    const list = await prisma.favoriteList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new HttpError(404, 'Liste introuvable');
    const item = await prisma.favoriteListItem.findUnique({ where: { listId_propertyId: { listId, propertyId } } });
    if (!item) throw new HttpError(404, 'Propriété absente de cette liste');
    await prisma.favoriteListItem.delete({ where: { listId_propertyId: { listId, propertyId } } });
    return { removed: true };
  },

  async listItemsInList(listId: string, userId: string) {
    const list = await prisma.favoriteList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new HttpError(404, 'Liste introuvable');
    return prisma.favoriteListItem.findMany({
      where: { listId },
      select: { propertyId: true, addedAt: true },
      orderBy: { addedAt: 'desc' },
    });
  },

  async bulkSyncList(listId: string, propertyIds: string[], userId: string) {
    // Used for migration: replace all items in a list with a given array of propertyIds.
    const list = await prisma.favoriteList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new HttpError(404, 'Liste introuvable');
    await prisma.favoriteListItem.deleteMany({ where: { listId } });
    if (propertyIds.length > 0) {
      await prisma.favoriteListItem.createMany({
        data: propertyIds.map((propertyId) => ({ listId, propertyId })),
        skipDuplicates: true,
      });
    }
    return { synced: propertyIds.length };
  },
};
