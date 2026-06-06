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
};
