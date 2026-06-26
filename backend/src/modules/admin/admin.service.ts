// Admin service — platform oversight and moderation
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { subscriptionsService } from '../subscriptions/subscriptions.service';
import { notificationsService } from '../notifications/notifications.service';
import { referralsService } from '../referrals/referrals.service';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { sendEmail, sendTestEmail } from '../../common/utils/mailer';
import { env } from '../../config/env.config';
import { logger } from '../../common/utils/logger';
import { supabaseAdmin } from '../../config/supabase.config';
import { syncSupabaseRole } from '../../common/utils/role-sync';
import { getMaintenanceState, invalidateMaintenanceCache } from '../../common/middleware/maintenance.middleware';
import { sendPushBroadcast } from '../../common/utils/push';
import { AccountType } from '@prisma/client';

// ─── helpers ──────────────────────────────────────────────────────────────────

export async function createAudit(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  ipAddress?: string;
  metadata?: { old?: Record<string, unknown>; new?: Record<string, unknown> };
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.adminId,
        action:     params.action,
        targetType: params.targetType,
        targetId:   params.targetId,
        description: params.description,
        ipAddress:  params.ipAddress,
        ...(params.metadata ? { metadata: params.metadata as any } : {}),
      },
    });
  } catch (err) {
    // Audit non bloquant — ne pas faire échouer l'action principale
    logger.warn('Audit log non créé (erreur non bloquante)', err);
  }
}

// Mappe un PropertyType DB vers un secteur frontend
function toSector(propertyType: string): string {
  if (['residence', 'hotel'].includes(propertyType)) return 'hebergement';
  if (['immobilier_location', 'immobilier_terrain', 'immobilier_achat'].includes(propertyType)) return 'immobilier';
  return propertyType;
}

// ─── service ──────────────────────────────────────────────────────────────────

export const adminService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalProperties,
      pendingProperties,
      activeProperties,
      pendingKyc,
      totalBookings,
      openDisputes,
      newUsersThisWeek,
      revenueRows,
      topProperties,
      avgCommission,
      bookingsByStatus,
      bookingsTrend,
      revenueTrend,
      bookingsByCity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'pending' } }),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.professionalProfile.count({ where: { verificationStatus: 'pending' } }),
      prisma.booking.count(),
      prisma.dispute.count({ where: { status: 'open' } }),

      // 7-day user evolution (new users per day)
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE("createdAt") AS day, COUNT(*)::int AS count
        FROM users
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,

      // Revenue by source this month
      prisma.$queryRaw<Array<{ type: string; total: bigint }>>`
        SELECT type, SUM(amount)::bigint AS total
        FROM transactions
        WHERE status = 'success'
          AND "completedAt" >= DATE_TRUNC('month', NOW())
        GROUP BY type
      `,

      // Top 10 properties by bookings count
      prisma.property.findMany({
        orderBy: { bookingsCount: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          city: true,
          propertyType: true,
          bookingsCount: true,
          rating: true,
          viewsCount: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // Average commission rate across active subscriptions
      prisma.$queryRaw<Array<{ avg: string | null }>>`
        SELECT AVG("commissionRate")::text AS avg
        FROM subscriptions
        WHERE status = 'active'
      `,

      // Bookings grouped by status
      prisma.booking.groupBy({ by: ['status'], _count: { id: true } }),

      // Bookings trend — last 6 months by month
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM bookings
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,

      // Revenue trend — last 6 months by month
      prisma.$queryRaw<Array<{ month: string; amount: bigint }>>`
        SELECT TO_CHAR("completedAt", 'YYYY-MM') AS month, SUM(amount)::bigint AS amount
        FROM transactions
        WHERE status = 'success'
          AND "completedAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("completedAt", 'YYYY-MM')
        ORDER BY month ASC
      `,

      // Top 10 booking cities
      prisma.$queryRaw<Array<{ city: string; count: bigint; revenue: bigint }>>`
        SELECT p.city, COUNT(b.id)::bigint AS count, COALESCE(SUM(b."totalAmount"), 0)::bigint AS revenue
        FROM bookings b
        JOIN properties p ON b."propertyId" = p.id
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY p.city
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    const totalRevenue = revenueRows.reduce((acc, r) => acc + Number(r.total), 0);
    const revenueBySource = revenueRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = Number(r.total);
      return acc;
    }, {});

    return {
      totalUsers,
      totalProperties,
      pendingProperties,
      activeProperties,
      pendingKyc,
      totalBookings,
      openDisputes,
      newUsersEvolution: newUsersThisWeek.map((r) => ({ day: r.day, count: Number(r.count) })),
      totalRevenue,
      revenueBySource,
      topProperties,
      avgCommissionRate: parseFloat(avgCommission[0]?.avg ?? '0') || 0,
      bookingsByStatus: bookingsByStatus.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = r._count.id;
        return acc;
      }, {}),
      bookingsTrend: bookingsTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
      revenueTrend: revenueTrend.map((r) => ({ month: r.month, amount: Number(r.amount) })),
      bookingsByCity: bookingsByCity.map((r) => ({
        city: r.city,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
    };
  },

  // ── Advanced admin analytics ────────────────────────────────────────────────

  async getAdvancedStats() {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const [
      bookingsByType,
      conversionByType,
      topPartners,
      referralStats,
      pendingReferrals,
    ] = await Promise.all([

      // Bookings count and revenue grouped by property type
      prisma.$queryRaw<Array<{ property_type: string; count: bigint; revenue: bigint }>>`
        SELECT p."propertyType" AS property_type,
               COUNT(b.id)::bigint AS count,
               COALESCE(SUM(b."totalAmount"), 0)::bigint AS revenue
        FROM bookings b
        JOIN properties p ON b."propertyId" = p.id
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY p."propertyType"
        ORDER BY count DESC
      `,

      // Conversion rate (bookings / views) per property type
      prisma.$queryRaw<Array<{ property_type: string; avg_conversion: number }>>`
        SELECT "propertyType" AS property_type,
               CASE WHEN SUM("viewsCount") = 0 THEN 0
                    ELSE ROUND((SUM("bookingsCount")::numeric / NULLIF(SUM("viewsCount"), 0)) * 100, 2)
               END AS avg_conversion
        FROM properties
        WHERE status = 'active'
        GROUP BY "propertyType"
        ORDER BY avg_conversion DESC
      `,

      // Top 10 professional partners by revenue (last 6 months)
      prisma.$queryRaw<Array<{ owner_id: string; first_name: string; last_name: string; total_revenue: bigint; booking_count: bigint }>>`
        SELECT u.id AS owner_id,
               u."firstName" AS first_name,
               u."lastName" AS last_name,
               COALESCE(SUM(b."totalAmount"), 0)::bigint AS total_revenue,
               COUNT(b.id)::bigint AS booking_count
        FROM users u
        JOIN properties p ON p."ownerId" = u.id
        JOIN bookings b ON b."propertyId" = p.id
        WHERE b.status IN ('confirmed', 'completed')
          AND b."createdAt" >= ${sixMonthsAgo}
        GROUP BY u.id, u."firstName", u."lastName"
        ORDER BY total_revenue DESC
        LIMIT 10
      `,

      // Global referral program stats
      prisma.referral.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { rewardAmount: true },
      }),

      // Count of pending rewards qualifying for distribution (has a completed booking)
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(r.id)::bigint AS count
        FROM referrals r
        WHERE r.status = 'pending'
          AND r."refereeId" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM bookings b
            WHERE b."clientId" = r."refereeId"
              AND b.status = 'completed'
          )
      `.then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    const referralSummary = referralStats.reduce<Record<string, { count: number; totalAmount: number }>>(
      (acc, r) => {
        acc[r.status] = { count: r._count.id, totalAmount: r._sum.rewardAmount ?? 0 };
        return acc;
      },
      {},
    );

    return {
      bookingsByPropertyType: bookingsByType.map((r) => ({
        propertyType: r.property_type,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
      conversionByPropertyType: conversionByType.map((r) => ({
        propertyType: r.property_type,
        conversionRate: Number(r.avg_conversion),
      })),
      topPartners: topPartners.map((r) => ({
        ownerId: r.owner_id,
        name: `${r.first_name} ${r.last_name}`.trim(),
        totalRevenue: Number(r.total_revenue),
        bookingCount: Number(r.booking_count),
      })),
      referralProgram: {
        ...referralSummary,
        pendingQualifyingForReward: pendingReferrals,
      },
    };
  },

  // ── User management ────────────────────────────────────────────────────────

  async listUsers(query: {
    role?: string;
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page ?? '1');
    const limit = Math.min(parseInt(query.limit ?? '20'), 100);
    const where: Record<string, unknown> = {};

    if (query.role) where['accountType'] = query.role;
    if (query.status) where['status'] = query.status;
    if (query.search) {
      where['OR'] = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [rawData, total] = await Promise.all([
      prisma.user.findMany({
        where: where as never,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          accountType: true,
          status: true,
          walletBalance: true,
          createdAt: true,
          professionalProfile: { select: { verificationStatus: true } },
          subscription: { select: { planType: true, status: true } },
        },
      }),
      prisma.user.count({ where: where as never }),
    ]);

    // Mapper les champs Prisma vers le format attendu par les clients (web admin + mobile)
    const data = rawData.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone ?? null,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      role: u.accountType,         // web admin reads 'role'
      accountType: u.accountType,  // mobile reads 'accountType'
      status: u.status,
      kycVerified: u.professionalProfile?.verificationStatus === 'approved', // web admin (boolean)
      kycStatus: u.professionalProfile?.verificationStatus ?? null,           // mobile (string)
      walletBalance: u.walletBalance,
      createdAt: u.createdAt,
      lastLoginAt: null,
    }));

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        professionalProfile: { include: { documents: true } },
        subscription: true,
      },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    return user;
  },

  async suspendUser(id: string, adminId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (user.status === 'banned') throw new HttpError(400, 'L\'utilisateur est banni, pas suspendu');

    await prisma.user.update({ where: { id }, data: { status: 'suspended' } });

    await createAudit({
      adminId,
      action: 'admin.user.suspend',
      targetType: 'user',
      targetId: id,
      description: `Suspension de l'utilisateur ${id} — raison : ${reason}`,
      metadata: { old: { status: user.status }, new: { status: 'suspended', reason } },
    });

    notificationsService.notify({
      type: 'account_suspended',
      recipientId: id,
      data: { reason },
    }).catch((err) => logger.warn('notify suspend failed', err));
  },

  async reactivateUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (user.status === 'banned') throw new HttpError(400, 'Impossible de réactiver un utilisateur banni');

    await prisma.user.update({ where: { id }, data: { status: 'active' } });

    await createAudit({
      adminId,
      action: 'admin.user.reactivate',
      targetType: 'user',
      targetId: id,
      description: `Réactivation du compte de l'utilisateur ${id}`,
      metadata: { old: { status: user.status }, new: { status: 'active' } },
    });
  },

  async banUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    await prisma.user.update({ where: { id }, data: { status: 'banned' } });

    await createAudit({
      adminId,
      action: 'admin.user.ban',
      targetType: 'user',
      targetId: id,
      description: `Bannissement de l'utilisateur ${id}`,
      metadata: { old: { status: user.status }, new: { status: 'banned' } },
    });
  },

  async updateUserNotes(id: string, adminId: string, notes: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    await prisma.user.update({ where: { id }, data: { adminNotes: notes } });

    await createAudit({
      adminId,
      action: 'admin.user.notes_updated',
      targetType: 'user',
      targetId: id,
      description: `Mise à jour des notes internes pour l'utilisateur ${id}`,
    });
  },

  /**
   * Change le type de compte d'un utilisateur en synchronisant les deux sources
   * de vérité : Supabase (app_metadata.role, lu par le JWT) PUIS Prisma
   * (users.accountType). L'ordre garantit qu'en cas d'échec Supabase, la base
   * n'est pas modifiée — le middleware refuserait sinon tous les JWT (403).
   */
  async updateUserRole(id: string, adminId: string, accountType: AccountType) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (user.accountType === 'admin') throw new HttpError(403, 'Impossible de modifier le rôle d\'un administrateur');
    if (user.accountType === accountType) return;

    try {
      await syncSupabaseRole(id, accountType);
    } catch (err) {
      logger.error('updateUserRole: échec synchronisation Supabase', { userId: id, error: (err as Error).message });
      throw new HttpError(500, 'Erreur lors de la synchronisation du rôle avec Supabase');
    }

    await prisma.user.update({ where: { id }, data: { accountType } });

    // Un compte qui devient professionnel doit passer par le KYC
    if (accountType !== 'client') {
      const profile = await prisma.professionalProfile.findUnique({ where: { userId: id } });
      if (!profile) {
        const businessName = `${user.firstName} ${user.lastName}`.trim() || 'Professionnel';
        await prisma.professionalProfile.create({
          data: { userId: id, businessName, verificationStatus: 'pending' },
        }).catch((err) => logger.warn('updateUserRole: création ProfessionalProfile échouée', err));
      }
    }

    await createAudit({
      adminId,
      action: 'admin.user.role_updated',
      targetType: 'user',
      targetId: id,
      description: `Changement de type de compte pour l'utilisateur ${id}`,
      metadata: { old: { accountType: user.accountType }, new: { accountType } },
    });
  },

  async getKycDocuments(userId: string) {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      include: { documents: true },
    });
    if (!profile) throw new HttpError(404, 'Profil professionnel introuvable');
    return profile;
  },

  async forcePasswordReset(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const redirectTo = `${env.FRONTEND_URL ?? env.PUBLIC_URL}/reset-password`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logger.error('forcePasswordReset: erreur génération lien Supabase', { userId, error: linkError?.message });
      throw new HttpError(500, 'Erreur lors de la génération du lien de réinitialisation');
    }

    await sendEmail({
      to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
      subject: 'Réinitialisation de votre mot de passe',
      htmlContent: `<p>Bonjour ${user.firstName},</p>
<p>Un administrateur a demandé la réinitialisation de votre mot de passe.</p>
<p><a href="${linkData.properties.action_link}">Cliquez ici pour définir un nouveau mot de passe</a></p>
<p>Ce lien expire dans 1 heure.</p>`,
    });

    await createAudit({
      adminId,
      action: 'admin.user.force_password_reset',
      targetType: 'user',
      targetId: userId,
      description: `Réinitialisation forcée du mot de passe pour l'utilisateur ${userId}`,
    });
  },

  async approveKyc(userId: string, adminId: string) {
    const profile = await prisma.professionalProfile.findUnique({ where: { userId } });

    if (profile) {
      await prisma.professionalProfile.update({
        where: { userId },
        data: { verificationStatus: 'approved', verifiedAt: new Date(), verifiedBy: adminId },
      });
    } else {
      // Le profil n'a pas encore été créé (le pro n'a pas encore soumis d'annonce) —
      // on le crée directement en statut approuvé.
      const owner = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const businessName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Professionnel';
      await prisma.professionalProfile.create({
        data: { userId, businessName, verificationStatus: 'approved', verifiedAt: new Date(), verifiedBy: adminId },
      });
    }

    // Activer le compte — sans cela le professionnel resterait bloqué sur PendingValidation
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });

    await subscriptionsService.createInitial(userId);

    await createAudit({
      adminId,
      action: 'admin.kyc.approve',
      targetType: 'user',
      targetId: userId,
      description: `KYC approuvé pour l'utilisateur ${userId}`,
      metadata: {
        old: { verificationStatus: profile?.verificationStatus ?? 'none' },
        new: { verificationStatus: 'approved' },
      },
    });

    // Filleul professionnel : récompense de parrainage à la validation du KYC
    referralsService.triggerReward(userId).catch((err) =>
      logger.warn(`Referral reward trigger failed on KYC approval for pro ${userId}`, err),
    );

    // Notification in-app + email via Brevo template kycApproved
    notificationsService.notify({
      type: 'kyc_approved',
      recipientId: userId,
      data: {},
    }).catch((err) => logger.warn('notify kyc approved failed', err));
  },

  async rejectKyc(userId: string, adminId: string, reason: string) {
    const profile = await prisma.professionalProfile.findUnique({ where: { userId }, select: { verificationStatus: true } });

    await prisma.professionalProfile.update({
      where: { userId },
      data: { verificationStatus: 'rejected', verifiedAt: new Date(), verifiedBy: adminId, verificationNotes: reason },
    });

    await createAudit({
      adminId,
      action: 'admin.kyc.reject',
      targetType: 'user',
      targetId: userId,
      description: `KYC rejeté pour l'utilisateur ${userId} — raison : ${reason}`,
      metadata: {
        old: { verificationStatus: profile?.verificationStatus ?? 'none' },
        new: { verificationStatus: 'rejected', reason },
      },
    });

    notificationsService.notify({
      type: 'kyc_rejected',
      recipientId: userId,
      data: { reason },
    }).catch((err) => logger.warn('notify kyc rejected failed', err));
  },

  async revoke2fa(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !sbUser) throw new HttpError(404, 'Utilisateur Supabase introuvable');
    if (!sbUser.user_metadata?.twoFactorEnabled) throw new HttpError(400, 'Le 2FA n\'est pas activé sur ce compte');

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...sbUser.user_metadata, twoFactorEnabled: false, twoFactorSecret: null },
    });

    await createAudit({
      adminId,
      action: 'admin.revoke_2fa',
      targetType: 'user',
      targetId: userId,
      description: `2FA révoqué pour l'utilisateur ${userId}`,
    });
  },

  // ── Liste complète des propriétés ─────────────────────────────────────────

  async listAllProperties(query: {
    status?: string;
    sector?: string;
    search?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page ?? '1');
    const pageLimit = Math.min(parseInt(query.limit ?? '20'), 100);
    const where: Record<string, unknown> = {};

    if (query.status) where['status'] = query.status === 'pending_review' ? 'pending' : query.status;
    if (query.sector) {
      // Mapper les secteurs frontend vers les valeurs PropertyType de la DB
      if (query.sector === 'hebergement') {
        where['propertyType'] = { in: ['residence', 'hotel'] };
      } else if (query.sector === 'immobilier') {
        where['propertyType'] = { in: ['immobilier_location', 'immobilier_terrain', 'immobilier_achat'] };
      } else {
        where['propertyType'] = query.sector;
      }
    }
    if (query.search) {
      where['OR'] = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { owner: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { owner: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [rawData, total] = await Promise.all([
      prisma.property.findMany({
        where: where as never,
        skip: (page - 1) * pageLimit,
        take: pageLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true, firstName: true, lastName: true, email: true,
              professionalProfile: { select: { verificationStatus: true } },
            },
          },
          media: { where: { isPrimary: true }, take: 1 },
        },
      }),
      prisma.property.count({ where: where as never }),
    ]);

    // Mapper vers le format AdminProperty attendu par le frontend
    const data = rawData.map((p) => {
      const pAny = p as never as Record<string, unknown>;
      return {
        id: p.id,
        title: p.title,
        type: p.propertyType,
        sector: toSector(p.propertyType),
        status: p.status === 'pending' ? 'pending_review' : p.status,
        city: p.city,
        country: (pAny['country'] as string) ?? '',
        ownerId: p.ownerId,
        ownerName: p.owner
          ? `${p.owner.firstName ?? ''} ${p.owner.lastName ?? ''}`.trim()
          : '—',
        ownerEmail: p.owner?.email ?? null,
        ownerKycStatus: (() => {
          const s = p.owner?.professionalProfile?.verificationStatus;
          if (s === 'approved') return 'verified';
          if (s === 'rejected') return 'rejected';
          if (s === 'pending') return 'pending';
          return undefined;
        })(),
        description: (pAny['description'] as string) ?? null,
        pricePerNight: p.pricePerNight ?? 0,
        rating: (pAny['rating'] as number) ?? 0,
        reviewCount: (pAny['reviewsCount'] as number) ?? 0,
        isBoosted: (pAny['isBoosted'] as boolean) ?? false,
        hasVirtualTour: (pAny['hasVirtualTour'] as boolean) ?? false,
        mainImageUrl: ((p.media[0] as Record<string, unknown> | undefined)?.['url'] as string) ?? null,
        submittedAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return { data, total, page, limit: pageLimit, pages: Math.ceil(total / pageLimit) };
  },

  async getPropertyDetail(id: string) {
    const p = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            professionalProfile: { select: { verificationStatus: true, documents: true } },
            subscription: { select: { planType: true, status: true } },
          },
        },
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        bookings: {
          orderBy: { createdAt: 'desc' },
          select: { totalAmount: true },
        },
      },
    });
    if (!p) throw new HttpError(404, 'Propriété introuvable');

    const pAny = p as never as Record<string, unknown>;
    const totalRevenue = p.bookings.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

    // Mapper vers PropertyDetail attendu par le frontend
    return {
      id: p.id,
      title: p.title,
      type: p.propertyType,
      sector: toSector(p.propertyType),
      status: p.status === 'pending' ? 'pending_review' : p.status,
      city: p.city,
      country: (pAny['country'] as string) ?? '',
      ownerId: p.ownerId,
      ownerName: p.owner
        ? `${p.owner.firstName ?? ''} ${p.owner.lastName ?? ''}`.trim()
        : '—',
      pricePerNight: p.pricePerNight ?? 0,
      rating: (pAny['rating'] as number) ?? 0,
      reviewCount: (pAny['reviewsCount'] as number) ?? 0,
      isBoosted: (pAny['isBoosted'] as boolean) ?? false,
      hasVirtualTour: (pAny['hasVirtualTour'] as boolean) ?? false,
      mainImageUrl: (p.media.find(m => (m as Record<string, unknown>)['isPrimary']) as Record<string, unknown> | undefined)?.['url']
        ?? (p.media[0] as Record<string, unknown> | undefined)?.['url']
        ?? null,
      submittedAt: p.createdAt,
      updatedAt: p.updatedAt,
      rejectionReason: (pAny['rejectionReason'] as string) ?? null,
      // Champs étendus PropertyDetail
      description: p.description ?? '',
      amenities: (p.amenities as string[] | null) ?? [],
      images: p.media.map(m => ((m as Record<string, unknown>)['url'] as string)).filter(Boolean),
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      rules: (p.rules as string[] | null) ?? [],
      bookingsCount: p.bookings.length,
      totalRevenue,
      // Infos propriétaire
      ownerEmail: p.owner?.email,
      ownerPhone: p.owner?.phone ?? undefined,
      ownerKycStatus: (() => {
        const status = p.owner?.professionalProfile?.verificationStatus;
        if (status === 'approved') return 'verified';
        if (status === 'rejected') return 'rejected';
        if (status === 'pending') return 'pending';
        return 'none';
      })(),
      ownerSubscriptionPlan: p.owner?.subscription?.planType ?? undefined,
      ownerLegalDocs: (p.owner?.professionalProfile?.documents ?? []).map((doc: Record<string, unknown>) => ({
        id: doc['id'],
        type: doc['type'],
        fileUrl: doc['fileUrl'],
        status: doc['status'],
        uploadedAt: doc['createdAt'] ?? doc['uploadedAt'],
      })),
    };
  },

  async reactivateProperty(propertyId: string, adminId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    await prisma.property.update({ where: { id: propertyId }, data: { status: 'active' } });

    await createAudit({
      adminId,
      action: 'admin.property.reactivate',
      targetType: 'property',
      targetId: propertyId,
      description: `Réactivation de l'annonce ${propertyId}`,
    });

    notificationsService.notify({
      type: 'property_approved',
      recipientId: property.ownerId,
      data: { propertyId, propertyTitle: property.title },
    }).catch((err) => logger.warn('notify property reactivated failed', err));
  },

  // ── Property moderation ────────────────────────────────────────────────────

  async listPendingProperties(query: { page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where: { status: 'pending' },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        },
      }),
      prisma.property.count({ where: { status: 'pending' } }),
    ]);
    const serialized = data.map((p) => {
      const media = p.media ?? [];
      const primary = media.find((m) => m.isPrimary) ?? media[0];
      return { ...p, images: media, mainImageUrl: primary?.url ?? null };
    });
    return { data: serialized, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async approveProperty(propertyId: string, adminId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.status !== 'pending') throw new HttpError(400, 'La propriété n\'est pas en attente d\'approbation');

    await prisma.property.update({ where: { id: propertyId }, data: { status: 'active' } });

    await createAudit({
      adminId,
      action: 'admin.property.approve',
      targetType: 'property',
      targetId: propertyId,
      description: `Approbation de l'annonce ${propertyId}`,
      metadata: { old: { status: property.status }, new: { status: 'active' } },
    });

    notificationsService.notify({
      type: 'property_approved',
      recipientId: property.ownerId,
      data: { propertyId, propertyTitle: property.title },
    }).catch((err) => logger.warn('notify property approved failed', err));
  },

  async rejectProperty(propertyId: string, adminId: string, reason: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    await prisma.property.update({ where: { id: propertyId }, data: { status: 'rejected' } });

    await createAudit({
      adminId,
      action: 'admin.property.reject',
      targetType: 'property',
      targetId: propertyId,
      description: `Rejet de l'annonce ${propertyId} — raison : ${reason}`,
      metadata: { old: { status: property.status }, new: { status: 'rejected', reason } },
    });

    notificationsService.notify({
      type: 'property_rejected',
      recipientId: property.ownerId,
      data: { propertyId, propertyTitle: property.title, reason },
    }).catch((err) => logger.warn('notify property rejected failed', err));
  },

  // ── Modération des plats (menus restaurant) ──────────────────────────────────
  async listPendingMenuItems(query: { page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const where = { status: 'pending' as const };
    const [data, total] = await Promise.all([
      prisma.restaurantMenuItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          property: {
            select: {
              id: true, title: true, ownerId: true,
              owner: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      prisma.restaurantMenuItem.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async approveMenuItem(itemId: string, adminId: string) {
    const item = await prisma.restaurantMenuItem.findUnique({
      where: { id: itemId },
      include: { property: { select: { ownerId: true, title: true } } },
    });
    if (!item) throw new HttpError(404, 'Plat introuvable');
    if (item.status === 'approved') throw new HttpError(400, 'Le plat est déjà validé');

    await prisma.restaurantMenuItem.update({
      where: { id: itemId },
      data: { status: 'approved', rejectionReason: null },
    });

    await createAudit({
      adminId,
      action: 'admin.menu.approve',
      targetType: 'menu_item',
      targetId: itemId,
      description: `Validation du plat « ${item.name} »`,
      metadata: { old: { status: item.status }, new: { status: 'approved' } },
    });

    notificationsService.notify({
      type: 'menu_approved',
      recipientId: item.property.ownerId,
      data: { menuItemName: item.name, propertyTitle: item.property.title },
    }).catch((err) => logger.warn('notify menu approved failed', err));
  },

  async rejectMenuItem(itemId: string, adminId: string, reason: string) {
    const item = await prisma.restaurantMenuItem.findUnique({
      where: { id: itemId },
      include: { property: { select: { ownerId: true, title: true } } },
    });
    if (!item) throw new HttpError(404, 'Plat introuvable');

    await prisma.restaurantMenuItem.update({
      where: { id: itemId },
      data: { status: 'rejected', rejectionReason: reason || null },
    });

    await createAudit({
      adminId,
      action: 'admin.menu.reject',
      targetType: 'menu_item',
      targetId: itemId,
      description: `Rejet du plat « ${item.name} » — raison : ${reason}`,
      metadata: { old: { status: item.status }, new: { status: 'rejected', reason } },
    });

    notificationsService.notify({
      type: 'menu_rejected',
      recipientId: item.property.ownerId,
      data: { menuItemName: item.name, propertyTitle: item.property.title, reason },
    }).catch((err) => logger.warn('notify menu rejected failed', err));
  },

  async requestPropertyModifications(propertyId: string, adminId: string, feedback: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    // Revert to draft so the owner can update and resubmit
    await prisma.property.update({ where: { id: propertyId }, data: { status: 'draft' } });

    await createAudit({
      adminId,
      action: 'admin.property.request_modifications',
      targetType: 'property',
      targetId: propertyId,
      description: `Demande de modifications pour l'annonce ${propertyId} — feedback : ${feedback}`,
    });

    notificationsService.notify({
      type: 'property_modifications_requested',
      recipientId: property.ownerId,
      data: { propertyId, propertyTitle: property.title, feedback },
    }).catch((err) => logger.warn('notify property modifications failed', err));
  },

  async suspendProperty(propertyId: string, adminId: string, reason: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    await prisma.property.update({ where: { id: propertyId }, data: { status: 'suspended' } });

    await createAudit({
      adminId,
      action: 'admin.property.suspend',
      targetType: 'property',
      targetId: propertyId,
      description: `Suspension de l'annonce ${propertyId} — raison : ${reason}`,
      metadata: { old: { status: property.status }, new: { status: 'suspended', reason } },
    });

    notificationsService.notify({
      type: 'property_suspended',
      recipientId: property.ownerId,
      data: { propertyId, propertyTitle: property.title, reason },
    }).catch((err) => logger.warn('notify property suspended failed', err));
  },

  async deleteProperty(propertyId: string, adminId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    await prisma.property.delete({ where: { id: propertyId } });

    await createAudit({
      adminId,
      action: 'admin.property.delete',
      targetType: 'property',
      targetId: propertyId,
      description: `Suppression définitive de l'annonce ${propertyId}`,
    });
  },

  // ── Bookings ───────────────────────────────────────────────────────────────

  async listBookings(query: { status?: string; page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const where = query.status ? { status: query.status as never } : {};
    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, firstName: true, lastName: true, email: true } },
          property: { select: { id: true, title: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getBookingById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        property: {
          select: {
            id: true, title: true, city: true, propertyType: true,
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        transactions: { orderBy: { initiatedAt: 'desc' }, take: 5 },
      },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    return booking;
  },

  // ── Disputes ───────────────────────────────────────────────────────────────

  async listDisputes(query: { status?: string; page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const where = query.status ? { status: query.status as never } : {};

    const [data, total] = await Promise.all([
      prisma.dispute.findMany({
        where: where as never,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          booking: {
            include: {
              client: { select: { id: true, firstName: true, lastName: true, email: true } },
              property: {
                select: {
                  id: true,
                  title: true,
                  ownerId: true,
                  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
              },
            },
          },
          opener: { select: { id: true, firstName: true, lastName: true } },
          messages: {
            orderBy: { sentAt: 'asc' },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where: where as never }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getDisputeById(id: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            client: { select: { id: true, firstName: true, lastName: true, email: true } },
            property: {
              select: {
                id: true, title: true, ownerId: true,
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        opener: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { sentAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!dispute) throw new HttpError(404, 'Litige introuvable');
    return dispute;
  },

  async resolveDispute(id: string, adminId: string, input: {
    resolution: 'resolved_no_refund' | 'resolved_refund_partial' | 'resolved_refund_full';
    notes: string;
  }) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            client: true,
            property: { include: { owner: true } },
            transactions: { where: { type: 'client_payment', status: 'success' } },
          },
        },
      },
    });
    if (!dispute) throw new HttpError(404, 'Litige introuvable');
    if (dispute.status !== 'open') throw new HttpError(400, 'Ce litige est déjà résolu');

    await prisma.dispute.update({
      where: { id },
      data: {
        status: input.resolution,
        adminNotes: input.notes,
        resolvedAt: new Date(),
      },
    });

    await createAudit({
      adminId,
      action: 'admin.dispute.resolve',
      targetType: 'dispute',
      targetId: id,
      description: `Résolution du litige ${id} — statut : ${input.resolution}`,
      metadata: {
        old: { status: 'open' },
        new: { status: input.resolution, notes: input.notes },
      },
    });

    // Notify both parties
    const clientId = dispute.booking.client.id;
    const professionalId = dispute.booking.property.ownerId;

    notificationsService.notify({
      type: 'dispute_resolved',
      recipientId: clientId,
      data: { disputeId: id, resolution: input.resolution },
    }).catch((err) => logger.warn('notify dispute resolved (client) failed', err));

    notificationsService.notify({
      type: 'dispute_resolved',
      recipientId: professionalId,
      data: { disputeId: id, resolution: input.resolution },
    }).catch((err) => logger.warn('notify dispute resolved (professional) failed', err));
  },

  async refundDispute(id: string, adminId: string, input: { amount: number; notes: string }) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            client: true,
            property: { include: { owner: true } },
            transactions: {
              where: { type: 'client_payment', status: 'success' },
              orderBy: { initiatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!dispute) throw new HttpError(404, 'Litige introuvable');
    if (dispute.status !== 'open') throw new HttpError(400, 'Ce litige est déjà résolu');

    const booking = dispute.booking;
    const successTx = booking.transactions[0];
    if (!successTx?.geniusPayTransactionId) {
      throw new HttpError(400, 'Aucune transaction Genius Pay trouvée pour ce remboursement');
    }

    // Determine resolution type from amount vs booking total
    const isFullRefund = input.amount >= booking.totalAmount;
    const resolution = isFullRefund ? 'resolved_refund_full' : 'resolved_refund_partial';

    // Initiate refund via Genius Pay
    let refundRef: string;
    try {
      const refundResult = await geniusPayService.refundPayment({
        originalReference: successTx.geniusPayTransactionId,
        amount: input.amount,
        reason: input.notes,
      });
      refundRef = refundResult.reference;
    } catch (err) {
      logger.error('Genius Pay refund failed', err);
      throw new HttpError(502, 'Le remboursement via Genius Pay a échoué');
    }

    // Record refund transaction
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: booking.client.id,
          type: 'refund',
          amount: input.amount,
          netAmount: input.amount,
          status: 'success',
          bookingId: booking.id,
          geniusPayTransactionId: refundRef,
          notes: input.notes,
          completedAt: new Date(),
        },
      }),
      prisma.dispute.update({
        where: { id },
        data: {
          status: resolution,
          refundAmount: input.amount,
          adminNotes: input.notes,
          resolvedAt: new Date(),
        },
      }),
    ]);

    await createAudit({
      adminId,
      action: 'admin.dispute.refund',
      targetType: 'dispute',
      targetId: id,
      description: `Remboursement de ${input.amount} FCFA pour le litige ${id} (${resolution})`,
      metadata: {
        old: { status: 'open' },
        new: { status: resolution, refundAmount: input.amount, notes: input.notes },
      },
    });

    // Notify client and professional
    const clientId = booking.client.id;
    const professionalId = booking.property.ownerId;

    notificationsService.notify({
      type: 'dispute_resolved',
      recipientId: clientId,
      data: { disputeId: id, resolution, refundAmount: input.amount },
    }).catch((err) => logger.warn('notify refund client failed', err));

    notificationsService.notify({
      type: 'dispute_resolved',
      recipientId: professionalId,
      data: { disputeId: id, resolution, refundAmount: input.amount },
    }).catch((err) => logger.warn('notify refund professional failed', err));
  },

  // ── Gestion manuelle des abonnements ──────────────────────────────────────

  async changeUserPlan(userId: string, adminId: string, plan: string, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const { getPlanDetails } = await import('../../common/constants/subscription-plans');
    const planDef = getPlanDetails(plan);
    if (!planDef) throw new HttpError(400, `Formule inconnue : ${plan}`);

    const { Decimal } = await import('@prisma/client/runtime/library');
    const { getPublicationLimit } = await import('../../common/constants/subscription-plans');
    const pubLimit = getPublicationLimit(plan, user.accountType ?? '');

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const oldPlan = sub?.planType ?? 'starter';

    if (!sub) {
      // Crée l'abonnement s'il n'existe pas encore
      await prisma.subscription.create({
        data: {
          userId,
          planType:                plan as never,
          status:                  'active',
          nextBillingDate:         new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          monthlyPrice:            planDef.monthlyPrice,
          includedPropertiesLimit: pubLimit,
          commissionRate:          new Decimal(planDef.commissionRate),
          boostsFreeMonthly:       planDef.freeBoostsPerMonth,
          features:                [] as never,
        },
      });
    } else {
      // Utiliser updatePlanBenefits pour recalcul cohérent de tous les avantages
      const { updatePlanBenefits } = await import('../subscriptions/subscriptions.service');
      await updatePlanBenefits(userId, plan, 'admin_force');

      await createAudit({
        adminId,
        action:      'admin.subscription.change',
        targetType:  'subscription',
        targetId:    userId,
        description: `Changement de formule admin : ${oldPlan} → ${plan} pour l'utilisateur ${userId}`,
        ipAddress,
        metadata: { old: { plan: oldPlan }, new: { plan } },
      });
    }

    logger.info(`Admin ${adminId} : formule de ${userId} changée en ${plan}`);
  },

  // Retourne l'historique des changements de formule pour un utilisateur
  async getSubscriptionHistory(userId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const transactions = sub
      ? await prisma.transaction.findMany({
          where: { subscriptionId: sub.id, type: 'subscription_payment' },
          orderBy: { initiatedAt: 'desc' },
          take: 50,
          select: {
            id: true, amount: true, status: true, notes: true,
            initiatedAt: true, completedAt: true, geniusPayTransactionId: true,
          },
        })
      : [];

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { targetType: 'subscription', targetId: userId },
          { action: { contains: 'subscription' }, targetId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, action: true, description: true,
        createdAt: true, metadata: true,
      },
    });

    return { subscription: sub, transactions, auditLogs };
  },

  // Recalcul forcé des avantages (utile en cas d'incohérence)
  async forceRecalculateBenefits(userId: string, adminId: string): Promise<{ suspendedProperties: Array<{ id: string; title: string }> }> {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement trouvé pour cet utilisateur');

    const { updatePlanBenefits } = await import('../subscriptions/subscriptions.service');
    const result = await updatePlanBenefits(userId, sub.planType, 'admin_force');

    await createAudit({
      adminId,
      action: 'admin.subscription.recalculate',
      targetType: 'subscription',
      targetId: userId,
      description: `Recalcul forcé des avantages pour ${userId} (plan=${sub.planType})`,
    });

    logger.info(`Admin ${adminId}: recalcul avantages de ${userId}`);
    return result;
  },

  // Professionnels avec des paiements échoués récents
  async getPaymentFailures(page = 1, limit = 20) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Abonnements avec ≥1 échec dans les 7 derniers jours
    const subs = await prisma.subscription.findMany({
      where: {
        transactions: {
          some: {
            type: 'subscription_payment',
            status: 'failed',
            initiatedAt: { gte: sevenDaysAgo },
          },
        },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        transactions: {
          where: { type: 'subscription_payment', initiatedAt: { gte: sevenDaysAgo } },
          orderBy: { initiatedAt: 'desc' },
          take: 10,
          select: { status: true, initiatedAt: true, amount: true, notes: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    const total = await prisma.subscription.count({
      where: {
        transactions: {
          some: {
            type: 'subscription_payment',
            status: 'failed',
            initiatedAt: { gte: sevenDaysAgo },
          },
        },
      },
    });

    const items = subs.map((s) => {
      const failed = s.transactions.filter((t) => t.status === 'failed').length;
      const lastAttempt = s.transactions[0]?.initiatedAt ?? null;
      return {
        userId: s.userId,
        user: s.user,
        planType: s.planType,
        status: s.status,
        monthlyPrice: s.monthlyPrice,
        nextBillingDate: s.nextBillingDate,
        failedAttempts: failed,
        lastAttemptAt: lastAttempt,
        daysUntilSuspension: Math.max(0, 7 - failed),
      };
    });

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // ── Platform config ────────────────────────────────────────────────────────

  async getAllConfig() {
    const rows = await prisma.platformConfig.findMany({ orderBy: { key: 'asc' } });
    return rows.reduce<Record<string, unknown>>((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});
  },

  async upsertConfig(key: string, value: unknown, adminId: string) {
    await prisma.platformConfig.upsert({
      where: { key },
      update: { value: value as never, updatedBy: adminId },
      create: { key, value: value as never, updatedBy: adminId },
    });

    // Recharge immédiatement le cache lu par le code métier (abonnements, boosts,
    // délai de grâce, features) pour que la modification prenne effet sans redémarrage.
    const { reloadPlatformSettings } = await import('../../common/settings/platform-settings');
    await reloadPlatformSettings();

    await createAudit({
      adminId,
      action: 'admin.config.update',
      targetType: 'platform_config',
      targetId: key,
      description: `Configuration mise à jour : ${key}`,
    });
  },

  // ── Audit logs ─────────────────────────────────────────────────────────────

  async listAuditLogs(query: {
    userId?: string;
    action?: string;
    targetType?: string;
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    format?: string;
  }) {
    const page = parseInt(query.page ?? '1');
    const limit = Math.min(parseInt(query.limit ?? '50'), 200);
    const where: Record<string, unknown> = {};

    if (query.userId) where['userId'] = query.userId;
    if (query.action) where['action'] = { contains: query.action };
    if (query.targetType) where['targetType'] = query.targetType;

    if (query.from || query.to) {
      where['createdAt'] = {};
      if (query.from) (where['createdAt'] as Record<string, unknown>)['gte'] = new Date(query.from);
      if (query.to) (where['createdAt'] as Record<string, unknown>)['lte'] = new Date(query.to);
    }

    const logs = await prisma.auditLog.findMany({
      where: where as never,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (query.format === 'csv') {
      const header = 'id,userId,userEmail,action,targetType,targetId,description,ipAddress,createdAt';
      const rows = logs.map((l) => [
        l.id,
        l.userId ?? '',
        l.user?.email ?? '',
        l.action,
        l.targetType ?? '',
        l.targetId ?? '',
        `"${(l.description ?? '').replace(/"/g, '""')}"`,
        l.ipAddress ?? '',
        l.createdAt.toISOString(),
      ].join(','));
      return { csv: [header, ...rows].join('\n') };
    }

    const total = await prisma.auditLog.count({ where: where as never });
    return { data: logs, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // ── Mode maintenance ────────────────────────────────────────────────────────

  async getMaintenance() {
    return getMaintenanceState(true);
  },

  async setMaintenance(
    input: { enabled: boolean; message?: string; estimatedEnd?: string; notifyUsers?: boolean },
    adminId: string,
    ipAddress?: string,
  ) {
    const previous = await getMaintenanceState(true);

    const value = {
      enabled: input.enabled,
      message: input.message ?? null,
      estimatedEnd: input.estimatedEnd ?? null,
    };

    await prisma.platformConfig.upsert({
      where: { key: 'maintenance_mode' },
      update: { value, updatedBy: adminId },
      create: { key: 'maintenance_mode', value, updatedBy: adminId },
    });
    invalidateMaintenanceCache();

    await createAudit({
      adminId,
      action: input.enabled ? 'maintenance.enable' : 'maintenance.disable',
      targetType: 'platform',
      targetId: 'maintenance_mode',
      description: input.enabled
        ? `Mode maintenance ACTIVÉ${input.estimatedEnd ? ` (retour estimé : ${input.estimatedEnd})` : ''}`
        : 'Mode maintenance désactivé',
      ipAddress,
      metadata: { old: previous as unknown as Record<string, unknown>, new: value },
    });

    // Prévenir les utilisateurs en amont (push à tous les appareils abonnés)
    if (input.notifyUsers) {
      const eta = input.estimatedEnd
        ? ` Retour estimé : ${new Date(input.estimatedEnd).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}.`
        : '';
      const contents = input.enabled
        ? { fr: `${input.message ?? 'Une maintenance est planifiée sur Primeo.'}${eta}`, en: `Primeo will undergo maintenance.${eta}` }
        : { fr: 'Primeo est de nouveau disponible. Merci de votre patience !', en: 'Primeo is back online. Thank you for your patience!' };
      sendPushBroadcast({
        headings: { fr: input.enabled ? 'Maintenance planifiée' : 'Maintenance terminée', en: input.enabled ? 'Scheduled maintenance' : 'Maintenance complete' },
        contents,
        data: { type: 'maintenance', enabled: input.enabled },
      }).catch((err) => logger.warn('Broadcast maintenance non envoyé', { error: (err as Error).message }));
    }

    return getMaintenanceState(true);
  },

  // ── Promo codes ────────────────────────────────────────────────────────────

  async listPromoCodes(query: { active?: string; page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const where: Record<string, unknown> = {};
    if (query.active !== undefined) where['isActive'] = query.active === 'true';

    const [data, total] = await Promise.all([
      prisma.promoCode.findMany({
        where: where as never,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.promoCode.count({ where: where as never }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async createPromoCode(input: {
    code: string;
    discountType: 'percent' | 'fixed_amount';
    discountValue: number;
    minAmount?: number;
    maxUses?: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
  }, adminId: string) {
    const exists = await prisma.promoCode.findUnique({ where: { code: input.code } });
    if (exists) throw new HttpError(409, 'Ce code promo existe déjà');

    const promo = await prisma.promoCode.create({
      data: {
        code: input.code,
        discountType: input.discountType as never,
        discountValue: input.discountValue,
        minAmount: input.minAmount,
        maxUses: input.maxUses,
        validFrom: new Date(input.validFrom),
        validUntil: new Date(input.validUntil),
        isActive: input.isActive,
        createdBy: adminId,
      },
    });

    await createAudit({
      adminId,
      action: 'admin.promo_code.create',
      targetType: 'promo_code',
      targetId: promo.id,
      description: `Création du code promo : ${input.code}`,
    });

    return promo;
  },

  async updatePromoCode(id: string, input: Partial<{
    code: string;
    discountType: 'percent' | 'fixed_amount';
    discountValue: number;
    minAmount: number;
    maxUses: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
  }>, adminId: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new HttpError(404, 'Code promo introuvable');

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.discountType !== undefined && { discountType: input.discountType as never }),
        ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
        ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
        ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
        ...(input.validFrom !== undefined && { validFrom: new Date(input.validFrom) }),
        ...(input.validUntil !== undefined && { validUntil: new Date(input.validUntil) }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await createAudit({
      adminId,
      action: 'admin.promo_code.update',
      targetType: 'promo_code',
      targetId: id,
      description: `Mise à jour du code promo ${promo.code}`,
    });

    return updated;
  },

  // ── Email templates ────────────────────────────────────────────────────────

  async listEmailTemplates() {
    const rows = await prisma.platformConfig.findMany({
      where: { key: { startsWith: 'email_template_' } },
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({
      name: r.key.replace('email_template_', ''),
      key: r.key,
      ...(r.value as Record<string, unknown>),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async sendTestEmailTemplate(
    adminId: string,
    templateId: number,
    to?: string,
    params?: Record<string, unknown>,
  ) {
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new HttpError(400, 'templateId invalide');
    }
    let recipient = to;
    if (!recipient) {
      const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { email: true } });
      recipient = admin?.email;
    }
    if (!recipient) throw new HttpError(400, 'Aucun destinataire — précisez "to" ou vérifiez votre email');

    await sendTestEmail({ to: [{ email: recipient }], templateId, params });
    await createAudit({
      adminId,
      action: 'admin.email_template.test',
      targetType: 'email',
      targetId: String(templateId),
      description: `Email de test (template ${templateId}) envoyé à ${recipient}`,
    });
    return { message: `Email de test envoyé à ${recipient}`, templateId };
  },

  async upsertEmailTemplate(
    name: string,
    data: { subject: string; bodyHtml: string; variables?: string[] },
    adminId: string,
  ) {
    const key = `email_template_${name}`;
    await prisma.platformConfig.upsert({
      where: { key },
      update: { value: data as never, updatedBy: adminId },
      create: { key, value: data as never, updatedBy: adminId },
    });
    await createAudit({
      adminId,
      action: 'admin.email_template.update',
      targetType: 'platform_config',
      targetId: key,
      description: `Template email mis à jour : ${name}`,
    });
  },

  async deletePromoCode(id: string, adminId: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new HttpError(404, 'Code promo introuvable');

    await prisma.promoCode.delete({ where: { id } });

    await createAudit({
      adminId,
      action: 'admin.promo_code.delete',
      targetType: 'promo_code',
      targetId: id,
      description: `Suppression du code promo ${promo.code}`,
    });
  },

  // ── Client ratings moderation ──────────────────────────────────────────────

  async listReportedClientRatings(query: { page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');

    const [data, total] = await Promise.all([
      prisma.clientRating.findMany({
        where: { isReported: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ratedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          raterUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          booking: { select: { id: true, startDate: true, endDate: true } },
        },
      }),
      prisma.clientRating.count({ where: { isReported: true } }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async hideClientRating(id: string, adminId: string) {
    const rating = await prisma.clientRating.findUnique({ where: { id } });
    if (!rating) throw new HttpError(404, 'Évaluation introuvable');

    await prisma.clientRating.update({ where: { id }, data: { isHidden: true } });

    await createAudit({
      adminId,
      action: 'admin.client_rating.hide',
      targetType: 'client_rating',
      targetId: id,
      description: `Évaluation client ${id} masquée après enquête`,
    });
  },

  async restoreClientRating(id: string, adminId: string) {
    const rating = await prisma.clientRating.findUnique({ where: { id } });
    if (!rating) throw new HttpError(404, 'Évaluation introuvable');

    await prisma.clientRating.update({
      where: { id },
      data: { isHidden: false, isReported: false, reportReason: null },
    });

    await createAudit({
      adminId,
      action: 'admin.client_rating.restore',
      targetType: 'client_rating',
      targetId: id,
      description: `Évaluation client ${id} restaurée après enquête`,
    });
  },
};
