// Exports service — génération asynchrone de rapports professionnels (CSV/PDF).
//
// Flux : createExport() crée un enregistrement `pending` et lance le traitement
// en arrière-plan (setImmediate). processExport() valide les données et passe le
// statut à `ready` avec un lien de téléchargement signé. Le fichier n'est PAS
// stocké : il est régénéré à la volée par la route /api/downloads à partir des
// paramètres de l'export (type, période), ce qui évite toute dépendance à la
// livraison de fichiers par un CDN tiers.
import PDFDocument from 'pdfkit';
import type { DataExport, ExportFormat, ExportType, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { env } from '../../config/env.config';
import { createDownloadToken } from '../../common/utils/download-token';
import { sendEmail } from '../../common/utils/mailer';
import { analyticsService } from '../analytics/analytics.service';
import { logger } from '../../common/utils/logger';

// Durée de validité du lien de téléchargement
const EXPORT_TTL_DAYS = 7;
// Limite anti-abus : nombre d'exports déclenchables sur une fenêtre glissante
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 h
const RATE_MAX = 10;

const ADVANCED_PLANS = ['business', 'entreprise'];

// ── Helpers CSV ───────────────────────────────────────────────────────────────

// Échappe une valeur selon RFC 4180 (guillemets, virgules, sauts de ligne)
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  return '﻿' + lines.join('\r\n');
}

function fmtDate(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

// ── Récupération des données par type ─────────────────────────────────────────

interface Dataset {
  title: string;
  headers: string[];
  rows: unknown[][];
}

async function buildBookingsDataset(ownerId: string, from: Date, to: Date): Promise<Dataset> {
  const bookings = await prisma.booking.findMany({
    where: { property: { ownerId }, createdAt: { gte: from, lte: to } },
    include: {
      property: { select: { title: true, propertyType: true } },
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    title: 'Réservations',
    headers: [
      'ID', 'Propriété', 'Type', 'Client', 'Arrivée', 'Départ', 'Voyageurs',
      'Montant total (FCFA)', 'Payé en ligne (FCFA)', 'Reste en cash (FCFA)',
      'Commission (FCFA)', 'Statut', 'Créée le',
    ],
    rows: bookings.map((b) => [
      b.id,
      b.property.title,
      b.property.propertyType,
      `${b.client.firstName} ${b.client.lastName}`.trim(),
      fmtDate(b.startDate),
      fmtDate(b.endDate),
      b.guests,
      b.totalAmount,
      b.onlinePaidAmount,
      b.remainingCashAmount,
      b.commissionAmount,
      b.status,
      fmtDate(b.createdAt),
    ]),
  };
}

async function buildPropertiesDataset(ownerId: string): Promise<Dataset> {
  const properties = await prisma.property.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    title: 'Propriétés',
    headers: [
      'ID', 'Titre', 'Type', 'Ville', 'Statut', 'Prix/nuit', 'Prix/mois', 'Prix vente',
      'Capacité', 'Vues', 'Réservations', 'Boostée', 'Dispo. à partir du', 'Créée le',
    ],
    rows: properties.map((p) => [
      p.id, p.title, p.propertyType, p.city, p.status,
      p.pricePerNight ?? '', p.pricePerMonth ?? '', p.priceSale ?? '',
      p.capacity ?? '', p.viewsCount, p.bookingsCount,
      p.isBoosted ? 'oui' : 'non', fmtDate(p.availableFrom), fmtDate(p.createdAt),
    ]),
  };
}

async function buildTransactionsDataset(ownerId: string, from: Date, to: Date): Promise<Dataset> {
  const transactions = await prisma.transaction.findMany({
    where: { userId: ownerId, initiatedAt: { gte: from, lte: to } },
    orderBy: { initiatedAt: 'desc' },
  });

  return {
    title: 'Transactions',
    headers: [
      'ID', 'Type', 'Montant (FCFA)', 'Frais (FCFA)', 'Net (FCFA)', 'Devise',
      'Statut', 'Réservation', 'Initiée le', 'Complétée le', 'Note',
    ],
    rows: transactions.map((t) => [
      t.id, t.type, t.amount, t.fee, t.netAmount, t.currency, t.status,
      t.bookingId ?? '', fmtDate(t.initiatedAt), fmtDate(t.completedAt), t.notes ?? '',
    ]),
  };
}

async function buildAdvancedStatsDataset(ownerId: string, from: Date, to: Date): Promise<Dataset> {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const period = days <= 7 ? '7d' : days <= 30 ? '30d' : '90d';

  // getDetailedStats applique déjà le gating Business/Entreprise
  const stats = await analyticsService.getDetailedStats(ownerId, { period });

  const rows: unknown[][] = stats.properties.map((p) => [
    p.title, p.propertyType, p.viewsCount, p.periodBookings, p.periodRevenue,
    p.conversionRate, p.rating ?? '', p.reviewCount, p.isBoosted ? 'oui' : 'non',
  ]);
  // Ligne de synthèse
  rows.push([
    'TOTAL', '', '', stats.totalBookings, stats.totalRevenue,
    `net ${stats.netRevenue} FCFA`, '', '', '',
  ]);

  return {
    title: 'Statistiques avancées',
    headers: [
      'Propriété', 'Type', 'Vues', 'Réservations', 'Revenus (FCFA)',
      'Taux de conversion', 'Note', 'Avis', 'Boostée',
    ],
    rows,
  };
}

async function buildDataset(type: ExportType, ownerId: string, from: Date, to: Date): Promise<Dataset> {
  switch (type) {
    case 'bookings':       return buildBookingsDataset(ownerId, from, to);
    case 'properties':     return buildPropertiesDataset(ownerId);
    case 'transactions':   return buildTransactionsDataset(ownerId, from, to);
    case 'advanced_stats': return buildAdvancedStatsDataset(ownerId, from, to);
    default:               throw new HttpError(400, 'Type d\'export inconnu');
  }
}

// ── Génération PDF ────────────────────────────────────────────────────────────

function generatePdfBuffer(dataset: Dataset, period: { from: Date; to: Date }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).fillColor('#1056E0').text(`PRIMEO — ${dataset.title}`, { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#666').text(
      `Période : ${fmtDate(period.from)} → ${fmtDate(period.to)} · Généré le ${fmtDate(new Date())} · ${dataset.rows.length} ligne(s)`,
    );
    doc.moveDown(0.6);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / dataset.headers.length;
    const rowHeight = 18;
    let y = doc.y;

    const drawRow = (cells: unknown[], opts: { header?: boolean } = {}) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.fontSize(opts.header ? 8 : 7.5).fillColor(opts.header ? '#fff' : '#222');
      if (opts.header) doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#1056E0');
      cells.forEach((cell, i) => {
        doc.fillColor(opts.header ? '#fff' : '#222').text(
          String(cell ?? ''),
          doc.page.margins.left + i * colWidth + 3,
          y + 5,
          { width: colWidth - 6, height: rowHeight, ellipsis: true, lineBreak: false },
        );
      });
      y += rowHeight;
    };

    drawRow(dataset.headers, { header: true });
    dataset.rows.forEach((row) => drawRow(row));

    doc.end();
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

export const exportsService = {
  async _assertCanExport(userId: string, type: ExportType): Promise<void> {
    // Réservé aux professionnels (un client n'a ni propriétés ni stats à exporter)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    if (!user || user.accountType === 'client' || user.accountType === 'admin') {
      throw new HttpError(403, 'Export réservé aux comptes professionnels');
    }

    // Stats avancées : plans Business / Entreprise uniquement
    if (type === 'advanced_stats') {
      const sub = await prisma.subscription.findUnique({ where: { userId }, select: { planType: true } });
      if (!sub || !ADVANCED_PLANS.includes(sub.planType)) {
        throw new HttpError(403, 'L\'export des statistiques avancées est réservé aux plans Business et Entreprise');
      }
    }

    // Limite anti-abus
    const recent = await prisma.dataExport.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    });
    if (recent >= RATE_MAX) {
      throw new HttpError(429, 'Trop d\'exports demandés. Réessayez dans un moment.');
    }
  },

  async createExport(
    userId: string,
    input: { type: ExportType; format: ExportFormat; from?: string; to?: string },
  ): Promise<DataExport> {
    await exportsService._assertCanExport(userId, input.type);

    // Période par défaut : 3 derniers mois
    const to = input.to ? new Date(input.to) : new Date();
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

    const record = await prisma.dataExport.create({
      data: {
        userId,
        type: input.type,
        format: input.format,
        status: 'pending',
        periodFrom: from,
        periodTo: to,
      },
    });

    // Traitement asynchrone (hors cycle requête/réponse)
    setImmediate(() => {
      void exportsService.processExport(record.id).catch((err) =>
        logger.error(`Export ${record.id} — échec du traitement asynchrone`, err),
      );
    });

    return record;
  },

  // Idempotent : ne traite que les exports en attente.
  async processExport(exportId: string): Promise<void> {
    const record = await prisma.dataExport.findUnique({ where: { id: exportId } });
    if (!record || record.status !== 'pending') return;

    await prisma.dataExport.update({ where: { id: exportId }, data: { status: 'processing' } });

    try {
      const from = record.periodFrom ?? new Date(0);
      const to = record.periodTo ?? new Date();
      const dataset = await buildDataset(record.type, record.userId, from, to);

      // On construit le jeu de données pour valider l'accès et compter les lignes ;
      // le fichier lui-même est régénéré à la demande (cf. regenerate()).
      const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const ready = await prisma.dataExport.update({
        where: { id: exportId },
        data: {
          status: 'ready',
          fileUrl: exportsService._downloadUrl(exportId, expiresAt),
          rowCount: dataset.rows.length,
          completedAt: new Date(),
          expiresAt,
        },
      });

      await exportsService._notifyReady(ready, dataset.title).catch((err) =>
        logger.warn(`Export ${exportId} — notification email échouée`, err),
      );

      logger.info(`Export ${exportId} prêt (${record.type}/${record.format}, ${dataset.rows.length} lignes)`);
    } catch (err) {
      await prisma.dataExport.update({
        where: { id: exportId },
        data: { status: 'failed', error: (err as Error).message?.slice(0, 500) ?? 'Erreur inconnue' },
      });
      logger.error(`Export ${exportId} en échec`, err);
    }
  },

  async _notifyReady(record: DataExport, datasetTitle: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { email: true, firstName: true },
    });
    if (!user?.email) return;

    await sendEmail({
      to: [{ email: user.email, name: user.firstName }],
      subject: `Votre export Primeo « ${datasetTitle} » est prêt`,
      htmlContent: `
        <p>Bonjour ${user.firstName},</p>
        <p>Votre export <strong>${datasetTitle}</strong> (${record.format.toUpperCase()},
        ${record.rowCount ?? 0} ligne(s)) est prêt au téléchargement.</p>
        <p><a href="${record.fileUrl}" style="background:#1056E0;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Télécharger le fichier</a></p>
        <p style="color:#888;font-size:13px;">Ce lien expire le ${fmtDate(record.expiresAt)}. Vous pouvez aussi retrouver vos exports dans votre tableau de bord.</p>
        <p style="color:#888;font-size:13px;">L'équipe Primeo</p>`,
    });
  },

  async listMyExports(userId: string): Promise<DataExport[]> {
    return prisma.dataExport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async getExport(userId: string, exportId: string): Promise<DataExport> {
    const record = await prisma.dataExport.findUnique({ where: { id: exportId } });
    if (!record || record.userId !== userId) throw new HttpError(404, 'Export introuvable');
    return record;
  },

  // Construit le lien de téléchargement signé d'un export (jeton chiffré, expiration alignée).
  _downloadUrl(exportId: string, expiresAt: Date): string {
    const ttlMs = Math.max(60_000, expiresAt.getTime() - Date.now());
    const token = createDownloadToken({ k: 'exp', id: exportId }, ttlMs);
    return `${env.PUBLIC_URL}/api/downloads/export?t=${token}`;
  },

  // Renvoie l'URL de téléchargement après contrôle d'accès et de validité.
  async getDownloadUrl(userId: string, exportId: string): Promise<{ url: string; expiresAt: Date | null }> {
    const record = await exportsService.getExport(userId, exportId);
    if (record.status !== 'ready' || !record.fileUrl) {
      throw new HttpError(409, 'Export non disponible (statut : ' + record.status + ')');
    }
    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new HttpError(410, 'Le lien de téléchargement a expiré. Relancez l\'export.');
    }
    return { url: record.fileUrl, expiresAt: record.expiresAt };
  },

  // Régénère le fichier d'un export à la volée (appelé par la route de téléchargement
  // signée). L'autorisation est portée par le jeton ; on revalide juste l'expiration.
  async regenerate(exportId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const record = await prisma.dataExport.findUnique({ where: { id: exportId } });
    if (!record) throw new HttpError(404, 'Export introuvable');
    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new HttpError(410, 'Le lien de téléchargement a expiré. Relancez l\'export.');
    }
    const from = record.periodFrom ?? new Date(0);
    const to = record.periodTo ?? new Date();
    const dataset = await buildDataset(record.type, record.userId, from, to);
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `primeo-${record.type}-${stamp}-${record.id.slice(0, 6)}`;
    if (record.format === 'pdf') {
      return {
        buffer: await generatePdfBuffer(dataset, { from, to }),
        filename: `${baseName}.pdf`,
        contentType: 'application/pdf',
      };
    }
    return {
      buffer: Buffer.from(toCsv(dataset.headers, dataset.rows), 'utf-8'),
      filename: `${baseName}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  },

  // Purge des exports expirés (appelée par le cron de nettoyage) : invalide le lien
  // et marque l'enregistrement comme `expired`. Aucun fichier à supprimer (régénéré
  // à la demande, jamais stocké).
  async purgeExpired(): Promise<number> {
    const { count } = await prisma.dataExport.updateMany({
      where: { status: 'ready', expiresAt: { lt: new Date() } },
      data: { status: 'expired', fileUrl: null },
    });
    return count;
  },
};

// Réexport de types utiles
export type { DataExport };
export type CreateExportArgs = Prisma.DataExportCreateInput;
