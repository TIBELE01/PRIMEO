// Bookings service — availability check, Genius Pay initiation, status transitions
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { TokenPayload } from '../../common/middleware/jwt-auth.middleware';
import { CreateBookingInput, CancelBookingInput, ListBookingsQueryInput } from './dto/booking.dto';
import { availabilityService } from './services/availability.service';
import { pricingService } from './services/pricing.service';
import { cancellationService } from './services/cancellation.service';
import { geniusPayService } from '../payments/services/genius-pay.service';
import {
  processSuccessfulPayment,
  processFailedPayment,
  ensureBookingInvoice,
} from '../webhooks/handlers/genius-pay.handler';
import { env } from '../../config/env.config';
import { logger } from '../../common/utils/logger';
import { notificationsService } from '../notifications/notifications.service';
import { messagingService } from '../messaging/messaging.service';
import { referralsService } from '../referrals/referrals.service';
import { walletService } from '../wallets/wallets.service';

export const bookingsService = {
  async create(clientId: string, input: CreateBookingInput) {
    let client = await prisma.user.findUnique({ where: { id: clientId } });
    if (!client) throw new HttpError(404, 'Utilisateur introuvable');

    // Mettre à jour le profil avec les coordonnées confirmées dans le tunnel de réservation.
    // L'email du compte n'est pas modifié ici (identité/auth) — il sert uniquement de contact.
    const profileUpdate: Record<string, string> = {};
    if (input.contactFirstName && input.contactFirstName !== client.firstName) {
      profileUpdate.firstName = input.contactFirstName;
    }
    if (input.contactLastName && input.contactLastName !== client.lastName) {
      profileUpdate.lastName = input.contactLastName;
    }
    if (input.contactPhone && input.contactPhone !== client.phone) {
      profileUpdate.phone = input.contactPhone;
    }
    if (Object.keys(profileUpdate).length > 0) {
      client = await prisma.user.update({ where: { id: clientId }, data: profileUpdate });
    }

    // Email de contact pour le paiement et la facture (l'email du compte par défaut)
    const contactEmail = input.contactEmail ?? client.email;

    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.status !== 'active') {
      throw new HttpError(400, 'Cette propriété n\'est pas disponible à la réservation');
    }

    // ── Aiguillage par secteur ──────────────────────────────────────────────
    const isRealEstate = property.propertyType.startsWith('immobilier');
    // Les restaurants : réservation de table gratuite (date + heure + couverts),
    // confirmée immédiatement, sans paiement et sans blocage du calendrier.
    const isRestaurant = property.propertyType === 'restaurant';

    // ── Immobilier : créer une demande d'intérêt (sans paiement) ──────────
    if (isRealEstate) {
      return bookingsService._createInterestBooking(clientId, client, property, input);
    }

    if (property.capacity && input.guests > property.capacity) {
      const unit = isRestaurant ? 'couverts' : 'personnes';
      throw new HttpError(400, `La capacité maximale de cette propriété est ${property.capacity} ${unit}`);
    }

    // Le téléphone est requis par Genius Pay pour les paiements en ligne (sauf restaurant : gratuit)
    const needsOnlinePayment = !isRestaurant && input.paymentOption !== 'zero_online';
    if (needsOnlinePayment && !client.phone) {
      throw new HttpError(400, 'Un numéro de téléphone est requis pour le paiement en ligne.');
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isRestaurant) {
      // Vérifier la capacité du créneau (somme des couverts déjà réservés ce jour-là)
      await availabilityService.checkRestaurantCapacity(input.propertyId, startDate, input.guests, property.capacity);
    } else {
      // Hébergements / hôtels : pas de chevauchement de dates
      await availabilityService.checkDatesAvailable(input.propertyId, startDate, endDate);
    }

    // Use client wallet balance if they have credits (source de vérité : table wallets)
    const currentWalletBalance = await walletService.getBalance(clientId);
    const walletCredit = currentWalletBalance > 0 ? currentWalletBalance : 0;

    // Restaurant : réservation de table gratuite → tarification nulle, paiement ignoré.
    // Sinon : tarification standard selon l'option de paiement choisie.
    const pricing = isRestaurant
      ? { totalAmount: 0, onlinePaidAmount: 0, commissionAmount: 0, remainingCashAmount: 0, walletDeduction: 0, validatedPromoCodeId: null as string | null }
      : await pricingService.compute({
          propertyId: input.propertyId,
          startDate,
          endDate,
          paymentOption: input.paymentOption,
          promoCode: input.promoCode,
          walletCredit,
        });

    // Option de paiement effective : un restaurant est toujours « zéro en ligne » (gratuit)
    const effectivePaymentOption = isRestaurant ? 'zero_online' : input.paymentOption;

    // Pour un restaurant, l'heure choisie est consignée dans les demandes spéciales
    const specialRequests = isRestaurant && input.reservationTime
      ? `Réservation de table à ${input.reservationTime}${input.specialRequests ? ` — ${input.specialRequests}` : ''}`
      : input.specialRequests;

    // Determine initial status — confirmé immédiatement pour cash intégral et restaurant
    const initialStatus = effectivePaymentOption === 'zero_online' ? 'confirmed' : 'pending_payment';

    const booking = await prisma.$transaction(async (tx) => {
      // Deduct wallet balance if used (table wallets + walletBalance, atomique)
      if (pricing.walletDeduction > 0) {
        await walletService.debit(clientId, pricing.walletDeduction, tx);
      }

      // Increment promo code uses
      if (pricing.validatedPromoCodeId) {
        await tx.promoCode.update({
          where: { id: pricing.validatedPromoCodeId },
          data: { usesCount: { increment: 1 } },
        });
      }

      const created = await tx.booking.create({
        data: {
          clientId,
          propertyId: input.propertyId,
          startDate,
          endDate,
          guests: input.guests,
          totalAmount: pricing.totalAmount,
          onlinePaidAmount: 0, // updated after successful payment
          paymentOption: effectivePaymentOption,
          commissionAmount: pricing.commissionAmount,
          remainingCashAmount: pricing.remainingCashAmount,
          status: initialStatus,
          specialRequests,
          ...(initialStatus === 'confirmed' ? { confirmedAt: new Date() } : {}),
        },
      });

      // Pour zero_online avec un montant à régler en cash : créer la transaction cash.
      // (Restaurant gratuit : totalAmount = 0 → aucune transaction.)
      if (effectivePaymentOption === 'zero_online' && pricing.totalAmount > 0) {
        await tx.transaction.create({
          data: {
            userId: clientId,
            bookingId: created.id,
            type: 'client_payment',
            amount: pricing.totalAmount,
            fee: pricing.commissionAmount,
            netAmount: pricing.totalAmount - pricing.commissionAmount,
            status: 'success',
            completedAt: new Date(),
            notes: 'Paiement intégral en cash — confirmé à la création',
          },
        });
      }

      return created;
    });

    // Réservation confirmée à la création (restaurant ou cash intégral) :
    // notifier le responsable et le client, pré-générer la facture, et ouvrir la discussion.
    if (initialStatus === 'confirmed') {
      void bookingsService._notifyBookingCreatedConfirmed(booking.id, property, client, startDate, endDate, {
        totalAmount: booking.totalAmount,
        amountPaid: booking.onlinePaidAmount,
        balanceDue: booking.remainingCashAmount,
        guests: booking.guests,
        reservationTime: input.reservationTime,
        mode: isRestaurant ? 'table' : 'stay',
      }).catch(
        (err) => logger.warn(`Notification réservation confirmée échouée pour ${booking.id}`, err),
      );
      void ensureBookingInvoice(booking.id).catch(
        (err) => logger.warn(`Pré-génération facture échouée pour ${booking.id}`, err),
      );
      // Message automatique d'ouverture de la discussion
      const autoMsg = isRestaurant
        ? `Bonjour, j'ai réservé ${input.guests} couvert${input.guests > 1 ? 's' : ''} pour le ${startDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long' })}${input.reservationTime ? ` à ${input.reservationTime}` : ''}. À bientôt !`
        : `Bonjour, j'ai effectué une réservation pour votre propriété du ${startDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })} au ${endDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })}. N'hésitez pas à me contacter si vous avez des questions.`;
      void messagingService.saveMessage(booking.id, clientId, autoMsg).catch(
        (err) => logger.warn(`Message automatique échoué pour ${booking.id}`, err),
      );
    }

    // Initiate Genius Pay outside the DB transaction (external call)
    if (effectivePaymentOption !== 'zero_online' && pricing.onlinePaidAmount > 0) {
      try {
        const returnUrl = `${env.FRONTEND_URL ?? 'https://app.primeo.ci'}/bookings/${booking.id}/payment-status`;
        const payment = await geniusPayService.initiatePayment({
          amount: pricing.onlinePaidAmount,
          bookingId: booking.id,
          customerEmail: contactEmail,
          customerPhone: client.phone ?? undefined,
          customerName: `${client.firstName} ${client.lastName}`.trim(),
          returnUrl,
        });

        // Persist the pending transaction
        await prisma.transaction.create({
          data: {
            userId: clientId,
            bookingId: booking.id,
            type: 'client_payment',
            amount: pricing.onlinePaidAmount,
            fee: pricing.commissionAmount,
            netAmount: pricing.onlinePaidAmount - pricing.commissionAmount,
            status: 'initiated',
            geniusPayTransactionId: payment.reference,
            checkoutUrl: payment.checkoutUrl,
            notes: `Option: ${input.paymentOption}`,
          },
        });

        return {
          booking,
          pricing,
          payment: { checkoutUrl: payment.checkoutUrl, reference: payment.reference },
        };
      } catch (payErr: unknown) {
        // Annuler la réservation pour éviter les orphelins
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'cancelled_by_client', cancelledAt: new Date(), cancellationReason: 'Échec initiation paiement' },
        });

        // Extraire le message d'erreur réel pour aider au débogage
        let detail = 'Veuillez réessayer.';
        if (payErr instanceof Error) {
          detail = payErr.message;
        }
        // Erreur Axios : récupérer la réponse Genius Pay
        const axiosErr = payErr as { response?: { data?: { message?: string; error?: string }; status?: number } };
        if (axiosErr?.response?.data) {
          detail = axiosErr.response.data.message ?? axiosErr.response.data.error ?? JSON.stringify(axiosErr.response.data);
        }

        throw new HttpError(502, `Échec du paiement Genius Pay : ${detail}`);
      }
    }

    return { booking, pricing };
  },

  async getById(id: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        property: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            media: { where: { isPrimary: true }, take: 1 },
          },
        },
        transactions: { orderBy: { initiatedAt: 'desc' }, take: 5 },
      },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    const isClient = booking.clientId === userId;
    const isOwner = booking.property.ownerId === userId;
    const isAdmin = requester?.accountType === 'admin';

    if (!isClient && !isOwner && !isAdmin) throw new HttpError(403, 'Accès non autorisé');

    // Hide street unless booking is active/complete
    const showStreet = booking.status === 'confirmed' || booking.status === 'completed';
    if (!showStreet) {
      (booking.property as { street?: string | null }).street = null;
    }

    return booking;
  },

  // Réconcilie l'état du paiement avec Genius Pay (utilisé par le sondage côté client).
  // Robuste même si le webhook serveur-à-serveur n'arrive pas. Idempotent.
  async syncPaymentStatus(id: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const isClient = booking.clientId === userId;
    const isOwner = booking.property.ownerId === userId;
    if (!isClient && !isOwner) throw new HttpError(403, 'Accès non autorisé');

    // États déjà terminaux : renvoyer directement
    if (booking.status !== 'pending_payment') {
      return {
        bookingStatus: booking.status,
        paymentStatus:
          booking.status === 'confirmed' || booking.status === 'completed' ? 'success' : 'failed',
        invoiceUrl: booking.invoiceUrl ?? null,
      };
    }

    // Trouver la dernière transaction de paiement en ligne avec une référence Genius Pay
    const tx = await prisma.transaction.findFirst({
      where: {
        bookingId: id,
        type: 'client_payment',
        geniusPayTransactionId: { not: null },
      },
      orderBy: { initiatedAt: 'desc' },
    });

    if (!tx || !tx.geniusPayTransactionId) {
      return { bookingStatus: booking.status, paymentStatus: 'pending', invoiceUrl: null };
    }

    // Interroger Genius Pay pour le statut réel
    let remoteStatus = 'pending';
    let remoteAmount = tx.amount;
    try {
      const result = await geniusPayService.getPaymentStatus(tx.geniusPayTransactionId);
      remoteStatus = (result.status || 'pending').toLowerCase();
      if (result.amount > 0) remoteAmount = result.amount;
    } catch (err) {
      logger.warn(`Sync statut paiement: échec interrogation Genius Pay pour ${id}`, err);
      return { bookingStatus: booking.status, paymentStatus: 'pending', invoiceUrl: null };
    }

    const SUCCESS = ['success', 'successful', 'completed', 'paid', 'accepted', 'approved'];
    const FAILED = ['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'declined', 'expired'];

    if (SUCCESS.includes(remoteStatus)) {
      await processSuccessfulPayment(tx, remoteAmount);
      const updated = await prisma.booking.findUnique({
        where: { id },
        select: { status: true, invoiceUrl: true },
      });
      return {
        bookingStatus: updated?.status ?? 'confirmed',
        paymentStatus: 'success',
        invoiceUrl: updated?.invoiceUrl ?? null,
      };
    }

    if (FAILED.includes(remoteStatus)) {
      await processFailedPayment(tx);
      const updated = await prisma.booking.findUnique({ where: { id }, select: { status: true } });
      return {
        bookingStatus: updated?.status ?? 'cancelled_by_client',
        paymentStatus: 'failed',
        invoiceUrl: null,
      };
    }

    return { bookingStatus: booking.status, paymentStatus: 'pending', invoiceUrl: null };
  },

  // Renvoie l'URL de la facture PDF (générée à la demande si absente)
  async getInvoice(id: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });
    const isClient = booking.clientId === userId;
    const isOwner = booking.property.ownerId === userId;
    const isAdmin = requester?.accountType === 'admin';
    if (!isClient && !isOwner && !isAdmin) throw new HttpError(403, 'Accès non autorisé');

    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      throw new HttpError(400, 'La facture est disponible une fois la réservation confirmée');
    }

    const invoiceUrl = booking.invoiceUrl ?? (await ensureBookingInvoice(id));
    if (!invoiceUrl) throw new HttpError(500, 'Impossible de générer la facture pour le moment');

    return { invoiceUrl };
  },

  async listForUser(userId: string, query: ListBookingsQueryInput) {
    const { status, page, limit } = query;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });

    const isProfessional =
      user?.accountType === 'professional_hebergement' ||
      user?.accountType === 'professional_hotel' ||
      user?.accountType === 'professional_immobilier' ||
      user?.accountType === 'restaurateur';

    const where = isProfessional
      ? {
          property: { ownerId: userId },
          ...(status ? { status } : {}),
        }
      : {
          clientId: userId,
          ...(status ? { status } : {}),
        };

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              propertyType: true,
              media: { where: { isPrimary: true }, take: 1 },
            },
          },
          client: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async cancel(id: string, user: TokenPayload, input: CancelBookingInput) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true, title: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const isClient = booking.clientId === user.sub;
    const isOwner = booking.property.ownerId === user.sub;
    const isAdmin = user.role === 'admin';

    if (!isClient && !isOwner && !isAdmin) throw new HttpError(403, 'Accès non autorisé');
    const cancellableStatuses = ['confirmed', 'pending_payment', 'interest_expressed'];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new HttpError(400, 'Cette réservation ne peut pas être annulée');
    }

    const cancelledBy = isClient ? 'client' : isOwner ? 'professional' : 'admin';
    const newStatus = isClient ? 'cancelled_by_client' : 'cancelled_by_professional';

    const { refundAmount } = cancellationService.computeRefund(booking);

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: newStatus,
          cancelledAt: new Date(),
          cancellationReason: input.reason,
          cancelledBy,
        },
      });

      if (refundAmount > 0 && booking.onlinePaidAmount > 0) {
        // Mark existing payment transaction as refunded
        await tx.transaction.updateMany({
          where: { bookingId: id, type: 'client_payment', status: 'success' },
          data: { status: 'refunded' },
        });

        // Create refund transaction record
        await tx.transaction.create({
          data: {
            userId: booking.clientId,
            bookingId: id,
            type: 'refund',
            amount: refundAmount,
            fee: 0,
            netAmount: refundAmount,
            status: 'initiated',
            notes: `Remboursement annulation (${refundAmount === booking.onlinePaidAmount ? '100%' : '50%'})`,
          },
        });

        // Credit wallet for immediate refund (Genius Pay refund handled via webhook)
        await walletService.credit(booking.clientId, refundAmount, tx);
      }
    });

    // Notifier les DEUX parties de l'annulation (in-app + email + push — non bloquant)
    const cancelData = {
      bookingId: id,
      propertyTitle: booking.property.title,
      startDate: booking.startDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' }),
      cancelledBy,
    };
    void Promise.allSettled([
      notificationsService.notify({ type: 'booking_cancelled', recipientId: booking.clientId, data: cancelData }),
      notificationsService.notify({ type: 'booking_cancelled', recipientId: booking.property.ownerId, data: cancelData }),
    ]).catch(() => { /* best-effort */ });

    return { message: 'Réservation annulée', refundAmount };
  },

  async confirm(id: string, professionalId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.property.ownerId !== professionalId) throw new HttpError(403, 'Accès non autorisé');
    if (booking.status !== 'pending_payment') {
      throw new HttpError(400, 'Seules les réservations en attente de paiement peuvent être confirmées');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'confirmed', confirmedAt: new Date() },
    });

    // Filleul client : récompense de parrainage à la première réservation confirmée
    await referralsService.triggerReward(booking.clientId).catch((err) =>
      logger.warn(`Referral reward trigger failed on confirm for client ${booking.clientId}`, err),
    );

    return updated;
  },

  async complete(id: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    const isOwner = booking.property.ownerId === userId;
    const isAdmin = requester?.accountType === 'admin';

    if (!isOwner && !isAdmin) throw new HttpError(403, 'Accès non autorisé');
    if (booking.status !== 'confirmed') {
      throw new HttpError(400, 'Seules les réservations confirmées peuvent être marquées comme terminées');
    }

    await prisma.booking.update({ where: { id }, data: { status: 'completed' } });
    await referralsService.triggerReward(booking.clientId).catch((err) =>
      logger.warn(`Referral reward trigger failed on complete for client ${booking.clientId}`, err),
    );

    return { message: 'Réservation terminée' };
  },

  async markCashReceived(id: string, professionalId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.property.ownerId !== professionalId) throw new HttpError(403, 'Accès non autorisé');
    if (booking.status !== 'confirmed') {
      throw new HttpError(400, 'La réservation doit être confirmée pour enregistrer un paiement cash');
    }
    if (booking.remainingCashAmount <= 0) {
      throw new HttpError(400, 'Aucun paiement cash attendu pour cette réservation');
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId: booking.clientId,
          bookingId: id,
          type: 'client_payment',
          amount: booking.remainingCashAmount,
          fee: 0,
          netAmount: booking.remainingCashAmount,
          status: 'success',
          completedAt: new Date(),
          notes: 'Paiement cash reçu par le professionnel',
        },
      });

      await tx.booking.update({
        where: { id },
        data: {
          status: 'completed',
          remainingCashAmount: 0,
        },
      });
    });

    await referralsService.triggerReward(booking.clientId).catch((err) =>
      logger.warn(`Referral reward trigger failed on cash-received for client ${booking.clientId}`, err),
    );

    return { message: 'Paiement cash enregistré, réservation terminée' };
  },

  // Notifie le responsable (nouvelle réservation) et le client (confirmation)
  // lorsqu'une réservation est confirmée dès sa création (restaurant ou cash intégral).
  async _notifyBookingCreatedConfirmed(
    bookingId: string,
    property: { ownerId: string; title: string },
    client: { id: string; firstName: string; lastName: string },
    startDate: Date,
    endDate: Date,
    extra?: {
      totalAmount?: number;
      amountPaid?: number;
      balanceDue?: number;
      guests?: number;
      reservationTime?: string;
      mode?: 'stay' | 'table' | 'interest';
    },
  ) {
    const fmt = (d: Date) => d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' });
    // On ne transmet les montants que lorsqu'ils sont significatifs (> 0) afin
    // que le template n'affiche pas de lignes « 0 FCFA » inutiles.
    const money = (n?: number) => (typeof n === 'number' && n > 0 ? n : undefined);
    const data = {
      bookingId,
      propertyTitle: property.title,
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      senderName: `${client.firstName} ${client.lastName}`.trim(),
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      ...(extra?.guests ? { guests: extra.guests } : {}),
      ...(money(extra?.totalAmount) !== undefined ? { totalAmount: extra!.totalAmount } : {}),
      ...(money(extra?.amountPaid) !== undefined ? { amountPaid: extra!.amountPaid } : {}),
      ...(money(extra?.balanceDue) !== undefined ? { balanceDue: extra!.balanceDue } : {}),
      ...(extra?.reservationTime ? { reservationTime: extra.reservationTime } : {}),
      ...(extra?.mode === 'table' ? { mode: 'table' } : {}),
    };
    await Promise.allSettled([
      notificationsService.notify({ type: 'new_booking', recipientId: property.ownerId, data }),
      notificationsService.notify({ type: 'booking_confirmed', recipientId: client.id, data }),
    ]);
  },

  // Crée une réservation de type « intérêt immobilier » (sans paiement, statut interest_expressed).
  // Ouvre automatiquement la messagerie avec le message du client (ou un message par défaut).
  async _createInterestBooking(
    clientId: string,
    client: { id: string; firstName: string; lastName: string; phone?: string | null; email: string },
    property: { id: string; ownerId: string; title: string; propertyType: string },
    input: CreateBookingInput,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const booking = await prisma.booking.create({
      data: {
        clientId,
        propertyId: property.id,
        startDate: today,
        endDate: tomorrow,
        guests: input.guests ?? 1,
        totalAmount: 0,
        onlinePaidAmount: 0,
        paymentOption: 'zero_online',
        commissionAmount: 0,
        remainingCashAmount: 0,
        status: 'interest_expressed',
        confirmedAt: new Date(),
        specialRequests: input.interestMessage ?? null,
      },
    });

    // Message initial dans la discussion (message du client ou message par défaut)
    const autoMsg = input.interestMessage?.trim()
      || 'Bonjour, je suis intéressé(e) par votre bien. Pourriez-vous me contacter ?';
    void messagingService.saveMessage(booking.id, clientId, autoMsg).catch(
      (err) => logger.warn(`Message automatique intérêt échoué pour ${booking.id}`, err),
    );

    // Notifications
    void bookingsService._notifyInterestCreated(booking.id, property, client).catch(
      (err) => logger.warn(`Notification intérêt échouée pour ${booking.id}`, err),
    );

    return { booking, pricing: { totalAmount: 0, onlinePaidAmount: 0, commissionAmount: 0, remainingCashAmount: 0 } };
  },

  async _notifyInterestCreated(
    bookingId: string,
    property: { ownerId: string; title: string },
    client: { id: string; firstName: string; lastName: string; phone?: string | null; email: string },
  ) {
    const senderName = `${client.firstName} ${client.lastName}`.trim();
    const data = { bookingId, propertyTitle: property.title, senderName, isInterest: true };
    await Promise.allSettled([
      notificationsService.notify({ type: 'interest_booking_received', recipientId: property.ownerId, data }),
      notificationsService.notify({ type: 'interest_submitted', recipientId: client.id, data }),
    ]);
  },
};
