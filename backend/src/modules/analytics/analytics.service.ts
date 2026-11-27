import { getPlanDetails } from '../../common/constants/subscription-plans';
// Analytics service — professional stats and market intelligence reports
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { generateMarketReportPdf, MarketReportType } from '../../common/utils/market-report';
import { sendEmail } from '../../common/utils/mailer';
import { env } from '../../config/env.config';
import { logger } from '../../common/utils/logger';

const MARKET_REPORT_PRICE_FCFA = 10_000;

export const MARKET_REPORT_TYPES: Record<MarketReportType, { label: string; description: string }> = {
  price_trends: {
    label: 'Tendances des prix',
    description: 'Prix moyens par nuit par ville, évolution sur 3 mois',
  },
  occupancy_rates: {
    label: "Taux d'occupation",
    description: 'Taux moyen par période, durée moyenne des séjours',
  },
  client_profiles: {
    label: 'Profil client',
    description: 'Répartition par motif de voyage, durée de préavis',
  },
  competitive_analysis: {
    label: 'Performances comparatives',
    description: 'Positionnement de votre propriété par rapport au marché',
  },
};

// ── Plan access guard ──────────────────────────────────────────────────────────

async function requireAdvancedPlan(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== 'active' || !getPlanDetails(sub.planType)?.analytics) {
    throw new HttpError(403, 'Les analytics avancés sont réservés aux plans Business et Entreprise');
  }
}

// ── Événements applicatifs anonymisés ──────────────────────────────────────────

// Liste blanche des événements acceptés — évite la pollution de la table par
// des appels arbitraires (l'endpoint est public pour couvrir l'avant-connexion).
export const TRACKED_EVENTS = [
  'signup',
  'login',
  'search',
  'property_view',
  'booking_created',
  'payment_success',
  'interest_expressed',
  'page_view',
] as const;

// ─────────────────────────────────────────────────────────────────────────────

export const analyticsService = {
  // ── Événements applicatifs (anonymisés) ─────────────────────────────────────

  // Ingestion par lot (max 20) — aucune donnée personnelle stockée :
  // ni userId, ni IP ; seulement un identifiant de session aléatoire côté client.
  async recordEvents(events: Array<{ name: string; platform?: string; role?: string; sessionId?: string; metadata?: Record<string, unknown> }>) {
    const valid = events
      .filter((e) => (TRACKED_EVENTS as readonly string[]).includes(e.name))
      .slice(0, 20)
      .map((e) => ({
        name: e.name,
        platform: e.platform?.slice(0, 20) ?? null,
        role: e.role?.slice(0, 40) ?? null,
        sessionId: e.sessionId?.slice(0, 64) ?? null,
        metadata: (e.metadata ?? undefined) as never,
      }));

    if (!valid.length) return { recorded: 0 };

    await prisma.appEvent.createMany({ data: valid });
    return { recorded: valid.length };
  },

  // Synthèse admin : volume par événement et par jour sur la période demandée
  async getEventsSummary(query: { days?: string }) {
    const days = Math.min(parseInt(query.days ?? '30'), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const byEvent = await prisma.appEvent.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const byDay = await prisma.$queryRaw<Array<{ day: Date; name: string; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, name, count(*) AS count
      FROM app_events
      WHERE "createdAt" >= ${since}
      GROUP BY 1, 2
      ORDER BY 1 DESC`;

    return {
      since: since.toISOString(),
      totals: byEvent.map((e) => ({ name: e.name, count: e._count._all })),
      daily: byDay.map((d) => ({ day: d.day.toISOString().slice(0, 10), name: d.name, count: Number(d.count) })),
    };
  },

  // ── Admin revenue ──────────────────────────────────────────────────────────

  async getRevenue(query: { from?: string; to?: string }) {
    const where: Record<string, unknown> = { status: 'success' };
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range['gte'] = new Date(query.from);
      if (query.to) range['lte'] = new Date(query.to);
      where['completedAt'] = range;
    }

    const [total, byType] = await Promise.all([
      prisma.transaction.aggregate({
        where: where as never,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: where as never,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalRevenue: total._sum.amount ?? 0,
      transactionCount: total._count,
      byType: byType.map((r) => ({
        type: r.type,
        total: r._sum.amount ?? 0,
        count: r._count,
      })),
    };
  },

  // ── Professional property stats (basic — all plans) ────────────────────────

  async getPropertyStats(ownerId: string) {
    const [total, published, boosted] = await Promise.all([
      prisma.property.count({ where: { ownerId } }),
      prisma.property.count({ where: { ownerId, status: 'active' } }),
      prisma.property.count({ where: { ownerId, isBoosted: true } }),
    ]);
    return { total, published, boosted };
  },

  // ── Professional booking stats (basic — all plans) ─────────────────────────

  async getBookingStats(userId: string, query: { period?: string }) {
    const days = Math.min(parseInt(query.period ?? '30'), 365);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: { property: { ownerId: userId }, createdAt: { gte: from } },
      select: { status: true, totalAmount: true, commissionAmount: true, createdAt: true },
    });

    const byStatus = bookings.reduce<Record<string, { count: number; revenue: number }>>((acc, b) => {
      if (!acc[b.status]) acc[b.status] = { count: 0, revenue: 0 };
      acc[b.status].count++;
      acc[b.status].revenue += b.totalAmount;
      return acc;
    }, {});

    return {
      period: `${days}d`,
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
      totalCommissions: bookings.reduce((s, b) => s + b.commissionAmount, 0),
      byStatus,
    };
  },

  // ── Statistiques détaillées (Business / Entreprise) ───────────────────────
  //
  // Sources (temps réel, aucune mise en cache) :
  //   • vues, clics, tentatives de réservation → table property_events
  //   • réservations confirmées + revenus       → table bookings (confirmées/terminées)
  // Taux de conversion = réservations confirmées / vues de la période.

  async getDetailedStats(ownerId: string, query: { period?: string }) {
    await requireAdvancedPlan(ownerId);

    const days = query.period === '7d' ? 7
      : query.period === '90d' ? 90
      : (query.period === '1y' || query.period === '365d') ? 365
      : 30;
    const label = days === 365 ? '1y' : `${days}d`;
    // Fenêtre alignée sur le début de journée (UTC = heure d'Abidjan)
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const properties = await prisma.property.findMany({
      where: { ownerId, status: { not: 'archived' as never } },
      select: {
        id: true,
        title: true,
        propertyType: true,
        viewsCount: true,
        bookingsCount: true,
        rating: true,
        reviewCount: true,
        isBoosted: true,
        boostExpiresAt: true,
        pricePerNight: true,
        pricePerMonth: true,
        priceSale: true,
        bookings: {
          where: {
            createdAt: { gte: from },
            status: { in: ['confirmed', 'completed'] as never[] },
          },
          select: { id: true, totalAmount: true, commissionAmount: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const ids = properties.map((p) => p.id);

    const [eventCounts, dailyEvents] = ids.length === 0 ? [[], []] : await Promise.all([
      prisma.propertyEvent.groupBy({
        by: ['propertyId', 'type'],
        where: { propertyId: { in: ids }, createdAt: { gte: from } },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ day: Date; type: string; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, type::text AS type, count(*) AS count
        FROM property_events
        WHERE "propertyId" IN (${Prisma.join(ids)}) AND "createdAt" >= ${from}
        GROUP BY 1, 2`,
    ]);

    const countFor = (propertyId: string, type: string) =>
      eventCounts.find((e) => e.propertyId === propertyId && e.type === type)?._count._all ?? 0;
    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
    // Taux de conversion plafonné à 100 % : une réservation peut provenir d'une visite non
    // comptée (antérieure au suivi des vues, ancienne version de l'app, lien direct…).
    const conversionPct = (bookingsCount: number, viewsCount: number) => Math.min(100, pct(bookingsCount, viewsCount));

    // Série quotidienne complète (jours sans activité = 0)
    const daily = Array.from({ length: days }, (_, i) => {
      const d = new Date(from.getTime() + i * 86_400_000);
      return { date: d.toISOString().slice(0, 10), views: 0, clicks: 0, bookingAttempts: 0, bookings: 0, revenue: 0 };
    });
    const byDate = new Map(daily.map((d) => [d.date, d]));
    for (const row of dailyEvents) {
      const d = byDate.get(new Date(row.day).toISOString().slice(0, 10));
      if (!d) continue;
      if (row.type === 'view') d.views += Number(row.count);
      else if (row.type === 'click') d.clicks += Number(row.count);
      else if (row.type === 'booking_attempt') d.bookingAttempts += Number(row.count);
    }

    const perProperty = properties.map((p) => {
      const views = countFor(p.id, 'view');
      const clicks = countFor(p.id, 'click');
      const bookingAttempts = countFor(p.id, 'booking_attempt');
      const revenue = p.bookings.reduce((s, b) => s + b.totalAmount, 0);
      for (const b of p.bookings) {
        const d = byDate.get(b.createdAt.toISOString().slice(0, 10));
        if (d) { d.bookings += 1; d.revenue += b.totalAmount; }
      }
      const conversion = conversionPct(p.bookings.length, views);
      return {
        id: p.id,
        title: p.title,
        name: p.title,
        propertyType: p.propertyType,
        views,
        clicks,
        bookingAttempts,
        bookings: p.bookings.length,
        revenue,
        conversion,
        currentPrice: p.pricePerNight ?? p.pricePerMonth ?? p.priceSale ?? 0,
        viewsCount: p.viewsCount, // cumul depuis la publication
        bookingsCount: p.bookingsCount,
        rating: p.rating,
        reviewCount: p.reviewCount,
        isBoosted: p.isBoosted && !!p.boostExpiresAt && p.boostExpiresAt.getTime() > Date.now(),
        // Champs historiques (export CSV)
        periodBookings: p.bookings.length,
        periodRevenue: revenue,
        conversionRate: `${conversion.toFixed(1)}%`,
        commissions: p.bookings.reduce((s, b) => s + b.commissionAmount, 0),
      };
    });

    // Annonces les plus actives en premier (vues, puis réservations, puis revenus)
    perProperty.sort((a, b) => (b.views - a.views) || (b.bookings - a.bookings) || (b.revenue - a.revenue));

    const sum = (k: 'views' | 'clicks' | 'bookingAttempts' | 'bookings' | 'revenue' | 'commissions') =>
      perProperty.reduce((s, p) => s + p[k], 0);
    const views = sum('views');
    const bookings = sum('bookings');
    const totalRevenue = sum('revenue');
    const totalCommissions = sum('commissions');

    return {
      period: label,
      days,
      from: from.toISOString(),
      generatedAt: new Date().toISOString(),
      views,
      clicks: sum('clicks'),
      bookingAttempts: sum('bookingAttempts'),
      bookings,
      conversionRate: conversionPct(bookings, views),
      revenue: totalRevenue,
      totalRevenue,
      totalCommissions,
      netRevenue: totalRevenue - totalCommissions,
      totalBookings: bookings,
      daily,
      revenueByDay: daily.map((d) => ({ date: d.date, revenue: d.revenue })),
      properties: perProperty,
    };
  },

  // ── Occupancy rate (all plans) ─────────────────────────────────────────────

  async getOccupancyRate(ownerId: string, query: { period?: string }) {
    const days = query.period === '7d' ? 7 : query.period === '90d' ? 90 : query.period === '365d' ? 365 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const properties = await prisma.property.findMany({
      where: { ownerId, status: 'active' },
      select: {
        id: true,
        title: true,
        propertyType: true,
        bookings: {
          where: {
            status: { in: ['confirmed', 'completed'] as never[] },
            startDate: { lte: new Date() },
            endDate: { gte: from },
          },
          select: { startDate: true, endDate: true },
        },
      },
    });

    return properties.map((p) => {
      // Count distinct booked days within the period window
      const bookedDaySet = new Set<string>();
      for (const b of p.bookings) {
        const start = new Date(Math.max(b.startDate.getTime(), from.getTime()));
        const end   = new Date(Math.min(b.endDate.getTime(), Date.now()));
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          bookedDaySet.add(d.toISOString().slice(0, 10));
        }
      }
      const bookedDays = bookedDaySet.size;
      const occupancyRate = days > 0 ? parseFloat(((bookedDays / days) * 100).toFixed(1)) : 0;

      return {
        id: p.id,
        title: p.title,
        propertyType: p.propertyType,
        bookedDays,
        totalDays: days,
        occupancyRate,
      };
    });
  },

  // ── Market reports ────────────────────────────────────────────────────────

  getMarketReportTypes() {
    return Object.entries(MARKET_REPORT_TYPES).map(([key, val]) => ({
      type: key,
      ...val,
      price: MARKET_REPORT_PRICE_FCFA,
    }));
  },

  async purchaseMarketReport(userId: string, reportType: MarketReportType) {
    await requireAdvancedPlan(userId);

    if (!MARKET_REPORT_TYPES[reportType]) {
      throw new HttpError(400, 'Type de rapport invalide');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'market_report_purchase',
        amount: MARKET_REPORT_PRICE_FCFA,
        netAmount: MARKET_REPORT_PRICE_FCFA,
        status: 'initiated',
        notes: reportType,
        webhookPayload: { reportType } as never,
      },
    });

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount: MARKET_REPORT_PRICE_FCFA,
      bookingId: tx.id,
      customerEmail: user.email,
      customerPhone: user.phone ?? undefined,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      returnUrl: `${env.FRONTEND_URL ?? env.BACKEND_URL}/analytics/market-reports?txId=${tx.id}`,
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { geniusPayTransactionId: reference, checkoutUrl },
    });

    return { transactionId: tx.id, checkoutUrl };
  },

  async listMarketReports(userId: string) {
    const reports = await prisma.transaction.findMany({
      where: { userId, type: 'market_report_purchase', status: 'success' },
      orderBy: { completedAt: 'desc' },
    });

    return reports.map((r) => {
      const payload = r.webhookPayload as Record<string, unknown> | null;
      const reportType = (r.notes ?? '') as MarketReportType;
      return {
        id: r.id,
        reportType,
        label: MARKET_REPORT_TYPES[reportType]?.label ?? reportType,
        pdfUrl: payload?.['pdfUrl'] as string | null ?? null,
        generatedAt: payload?.['generatedAt'] as string | null ?? null,
        purchasedAt: r.completedAt,
        amount: r.amount,
      };
    });
  },

  async generateMarketReport(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'market_report_purchase') {
      throw new Error(`Transaction ${transactionId} is not a market report purchase`);
    }

    const reportType = tx.notes as MarketReportType;
    if (!MARKET_REPORT_TYPES[reportType]) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: tx.userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new Error('User not found');

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    let reportData: Record<string, unknown> = {};

    if (reportType === 'price_trends') {
      const rows = await prisma.$queryRaw<Array<{ city: string; avg_price: number; month: string }>>`
        SELECT p.city,
          AVG(b."totalAmount")::int AS avg_price,
          TO_CHAR(b."createdAt", 'YYYY-MM') AS month
        FROM bookings b
        JOIN properties p ON b."propertyId" = p.id
        WHERE b."createdAt" >= ${twelveMonthsAgo}
          AND b.status IN ('confirmed', 'completed')
        GROUP BY p.city, TO_CHAR(b."createdAt", 'YYYY-MM')
        ORDER BY month DESC, p.city
        LIMIT 200
      `;
      reportData = { priceTrends: rows };

    } else if (reportType === 'occupancy_rates') {
      const rows = await prisma.$queryRaw<Array<{ city: string; avg_nights: number; total_bookings: bigint }>>`
        SELECT p.city,
          AVG(DATE_PART('day', b."endDate"::timestamp - b."startDate"::timestamp)) AS avg_nights,
          COUNT(b.id)::bigint AS total_bookings
        FROM bookings b
        JOIN properties p ON b."propertyId" = p.id
        WHERE b."createdAt" >= ${twelveMonthsAgo}
          AND b.status IN ('confirmed', 'completed')
        GROUP BY p.city
        ORDER BY total_bookings DESC
      `;
      reportData = {
        occupancyByCity: rows.map((r) => ({ ...r, total_bookings: Number(r.total_bookings) })),
      };

    } else if (reportType === 'client_profiles') {
      const [leadRows, distRows] = await Promise.all([
        prisma.$queryRaw<Array<{ avg_lead_days: number }>>`
          SELECT AVG(DATE_PART('day', b."startDate"::timestamp - b."createdAt"::timestamp))::int AS avg_lead_days
          FROM bookings b
          WHERE b."createdAt" >= ${twelveMonthsAgo}
            AND b.status IN ('confirmed', 'completed')
        `,
        prisma.$queryRaw<Array<{ duration_bucket: string; count: bigint }>>`
          SELECT
            CASE
              WHEN DATE_PART('day', b."endDate"::timestamp - b."startDate"::timestamp) = 1 THEN '1 nuit'
              WHEN DATE_PART('day', b."endDate"::timestamp - b."startDate"::timestamp) <= 3 THEN '2-3 nuits'
              WHEN DATE_PART('day', b."endDate"::timestamp - b."startDate"::timestamp) <= 7 THEN '4-7 nuits'
              ELSE '8+ nuits'
            END AS duration_bucket,
            COUNT(*)::bigint AS count
          FROM bookings b
          WHERE b."createdAt" >= ${twelveMonthsAgo}
            AND b.status IN ('confirmed', 'completed')
          GROUP BY duration_bucket
          ORDER BY count DESC
        `,
      ]);
      reportData = {
        avgLeadDays: leadRows[0]?.avg_lead_days ?? 0,
        durationDistribution: distRows.map((r) => ({ ...r, count: Number(r.count) })),
      };

    } else if (reportType === 'competitive_analysis') {
      const rows = await prisma.$queryRaw<
        Array<{ city: string; property_type: string; avg_price: number; avg_rating: number; count: bigint }>
      >`
        SELECT p.city, p."propertyType" AS property_type,
          AVG(b."totalAmount")::int AS avg_price,
          AVG(p.rating) AS avg_rating,
          COUNT(DISTINCT p.id)::bigint AS count
        FROM properties p
        LEFT JOIN bookings b ON b."propertyId" = p.id
          AND b."createdAt" >= ${twelveMonthsAgo}
          AND b.status IN ('confirmed', 'completed')
        WHERE p.status = 'active'
        GROUP BY p.city, p."propertyType"
        ORDER BY p.city, p."propertyType"
      `;
      reportData = {
        marketByTypeAndCity: rows.map((r) => ({ ...r, count: Number(r.count) })),
      };
    }

    const pdfUrl = await generateMarketReportPdf({
      reportType,
      reportData,
      generatedAt: new Date(),
      customerName: `${user.firstName} ${user.lastName}`,
      transactionId,
    });

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        webhookPayload: {
          ...((tx.webhookPayload as Record<string, unknown>) ?? {}),
          pdfUrl,
          generatedAt: new Date().toISOString(),
        } as never,
      },
    });

    await sendEmail({
      to: [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
      subject: `Votre rapport de marché — ${MARKET_REPORT_TYPES[reportType].label}`,
      htmlContent: `<p>Bonjour ${user.firstName},</p>
<p>Votre rapport "<strong>${MARKET_REPORT_TYPES[reportType].label}</strong>" est prêt.</p>
<p><a href="${pdfUrl}" style="background:#1E3A5F;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">Télécharger le rapport PDF</a></p>
<p>Ce rapport est également disponible dans votre espace <strong>Analytics</strong> sur Primeo.</p>`,
    }).catch((err) => logger.warn('Market report delivery email failed', err));

    logger.info(`Market report generated and delivered: type=${reportType}, txId=${transactionId}`);
  },
};
