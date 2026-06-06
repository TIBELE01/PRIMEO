// Pricing calculator — total, commission, promo discount, wallet deduction
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';
import type { PlanType } from '@prisma/client';

const COMMISSION_RATES: Record<PlanType, number> = {
  starter: 0,
  business: 0,
  entreprise: 0,
};

export interface PriceBreakdown {
  nights: number;
  pricePerUnit: number;
  basePrice: number;
  promoDiscount: number;
  walletDeduction: number;
  totalAmount: number;
  commissionAmount: number;
  onlinePaidAmount: number;
  remainingCashAmount: number;
}

export const pricingService = {
  async compute(params: {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    paymentOption: 'full_online' | 'ten_percent_online' | 'zero_online';
    promoCode?: string;
    walletCredit?: number; // FCFA to deduct from client wallet (caller decides max)
  }): Promise<PriceBreakdown & { validatedPromoCodeId?: string }> {
    const property = await prisma.property.findUnique({
      where: { id: params.propertyId },
      include: {
        owner: { select: { subscription: { select: { planType: true, commissionRate: true } } } },
      },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.status !== 'active') throw new HttpError(400, 'Cette propriété n\'est pas disponible à la réservation');

    // Valider l'option de paiement — si paymentOptions vide/null, toutes les options sont acceptées
    const allowedOptions = Array.isArray(property.paymentOptions) ? property.paymentOptions : [];
    if (allowedOptions.length > 0 && !allowedOptions.includes(params.paymentOption)) {
      throw new HttpError(400, `Cette propriété n'accepte pas l'option de paiement "${params.paymentOption}"`);
    }

    const nights = Math.round(
      (params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights <= 0) throw new HttpError(400, 'Les dates de séjour sont invalides');

    const pricePerUnit = property.pricePerNight ?? property.pricePerMonth ?? property.priceSale ?? 0;
    if (!pricePerUnit) throw new HttpError(400, 'Aucun tarif défini pour cette propriété');

    const basePrice = pricePerUnit * nights;

    // Promo code
    let promoDiscount = 0;
    let validatedPromoCodeId: string | undefined;
    if (params.promoCode) {
      const promo = await prisma.promoCode.findUnique({ where: { code: params.promoCode } });
      if (!promo || !promo.isActive) throw new HttpError(400, 'Code promo invalide ou inactif');
      const now = new Date();
      if (now < promo.validFrom || now > promo.validUntil) {
        throw new HttpError(400, 'Ce code promo a expiré ou n\'est pas encore actif');
      }
      if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
        throw new HttpError(400, 'Ce code promo a atteint sa limite d\'utilisation');
      }
      if (promo.minAmount !== null && basePrice < promo.minAmount) {
        throw new HttpError(400, `Ce code promo nécessite un montant minimum de ${promo.minAmount} FCFA`);
      }
      promoDiscount =
        promo.discountType === 'percent'
          ? Math.floor((basePrice * promo.discountValue) / 100)
          : promo.discountValue;
      promoDiscount = Math.min(promoDiscount, basePrice);
      validatedPromoCodeId = promo.id;
    }

    const afterPromo = basePrice - promoDiscount;

    // Wallet deduction — never exceed remaining amount
    const walletDeduction = Math.min(params.walletCredit ?? 0, afterPromo);
    const totalAmount = afterPromo - walletDeduction;

    // Commission toujours 0 % — tous les plans sont sans commission
    const plan = property.owner?.subscription?.planType;
    const commissionRate = plan ? (COMMISSION_RATES[plan] ?? 0) : 0;
    const commissionAmount = Math.floor((totalAmount * commissionRate) / 100);

    // Online paid amount by payment option
    let onlinePaidAmount: number;
    if (params.paymentOption === 'full_online') {
      onlinePaidAmount = totalAmount;
    } else if (params.paymentOption === 'ten_percent_online') {
      onlinePaidAmount = Math.ceil(totalAmount * 0.1);
    } else {
      onlinePaidAmount = 0;
    }
    const remainingCashAmount = totalAmount - onlinePaidAmount;

    return {
      nights,
      pricePerUnit,
      basePrice,
      promoDiscount,
      walletDeduction,
      totalAmount,
      commissionAmount,
      onlinePaidAmount,
      remainingCashAmount,
      validatedPromoCodeId,
    };
  },
};
