// Promos service — discount code validation and management
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';

export const promosService = {
  async validate(code: string) {
    const promo = await prisma.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new HttpError(404, 'Invalid or expired promo code');
    if (new Date() > promo.validUntil) throw new HttpError(400, 'Promo code has expired');
    if (promo.maxUses && promo.usesCount >= promo.maxUses) throw new HttpError(400, 'Limite d\'utilisation atteinte');
    return { valid: true, discountType: promo.discountType, discountValue: promo.discountValue, code: promo.code };
  },

  async create(input: unknown) {
    return prisma.promoCode.create({ data: input as never });
  },

  async list() {
    return prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  },
};
