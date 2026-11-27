// Rapport mensuel personnalisé (PDF) — avantage de la formule Entreprise.
// Le 1er de chaque mois à 07:00 : activité du mois écoulé (vues, clics, tentatives et
// réservations, revenus, avis) envoyée par email en pièce jointe à chaque abonné Entreprise.
import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { sendEmail } from '../common/utils/mailer';
import { getPlanDetails } from '../common/constants/subscription-plans';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;

export interface MonthlyReportData {
  ownerName: string;
  periodLabel: string;
  totals: { views: number; clicks: number; attempts: number; bookings: number; revenue: number; reviews: number; rating: number | null };
  properties: Array<{ title: string; views: number; bookings: number; revenue: number }>;
}

/** Fenêtre du mois précédant `ref` (UTC) */
export function previousMonth(ref = new Date()): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  return { start, end, label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}` };
}

export async function collectMonthlyReport(userId: string, start: Date, end: Date, label: string): Promise<MonthlyReportData> {
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  const props = await prisma.property.findMany({ where: { ownerId: userId }, select: { id: true, title: true } });
  const ids = props.map((p) => p.id);
  const [events, bookings, reviews] = await Promise.all([
    prisma.propertyEvent.groupBy({ by: ['propertyId', 'type'], where: { propertyId: { in: ids }, createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.booking.findMany({
      where: { propertyId: { in: ids }, status: { in: ['confirmed', 'completed'] }, createdAt: { gte: start, lt: end } },
      select: { propertyId: true, totalAmount: true },
    }),
    prisma.review.aggregate({ where: { propertyId: { in: ids }, createdAt: { gte: start, lt: end } }, _count: { _all: true }, _avg: { rating: true } }),
  ]);
  const count = (pid: string | null, type: string) =>
    events.filter((e) => (pid === null || e.propertyId === pid) && e.type === type).reduce((a, e) => a + e._count._all, 0);
  const perProp = props.map((p) => {
    const b = bookings.filter((x) => x.propertyId === p.id);
    return { title: p.title, views: count(p.id, 'view'), bookings: b.length, revenue: b.reduce((a, x) => a + x.totalAmount, 0) };
  }).sort((a, b) => b.views - a.views || b.revenue - a.revenue).slice(0, 10);
  return {
    ownerName: `${owner?.firstName ?? ''} ${owner?.lastName ?? ''}`.trim(),
    periodLabel: label,
    totals: {
      views: count(null, 'view'), clicks: count(null, 'click'), attempts: count(null, 'booking_attempt'),
      bookings: bookings.length, revenue: bookings.reduce((a, x) => a + x.totalAmount, 0),
      reviews: reviews._count._all, rating: reviews._avg.rating ? Math.round(reviews._avg.rating * 10) / 10 : null,
    },
    properties: perProp,
  };
}

export function renderMonthlyReportPdf(d: MonthlyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Rapport mensuel Primeo — ${d.periodLabel}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const blue = '#0055FF', ink = '#111827', muted = '#6B7280';
    doc.rect(0, 0, doc.page.width, 92).fill(blue);
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(20).text('Primeo', 48, 28);
    doc.font('Helvetica').fontSize(11).text(`Rapport mensuel — ${d.periodLabel}`, 48, 56);
    doc.fill(ink).font('Helvetica-Bold').fontSize(13).text(d.ownerName || 'Votre activité', 48, 116);
    doc.fill(muted).font('Helvetica').fontSize(10).text('Formule Entreprise · synthèse de vos annonces sur le mois écoulé', 48, 134);
    const t = d.totals;
    const tiles: Array<[string, string]> = [
      ['Vues', String(t.views)], ['Clics', String(t.clicks)], ['Tentatives de réservation', String(t.attempts)],
      ['Réservations confirmées', String(t.bookings)], ['Revenus', fcfa(t.revenue)],
      ['Avis reçus', t.rating !== null ? `${t.reviews} · ${t.rating}/5` : String(t.reviews)],
    ];
    const w = (doc.page.width - 96 - 20) / 3;
    tiles.forEach(([label, value], i) => {
      const x = 48 + (i % 3) * (w + 10), y = 166 + Math.floor(i / 3) * 70;
      doc.roundedRect(x, y, w, 60, 8).fill('#F5F8FF');
      doc.fill(muted).font('Helvetica').fontSize(9).text(label, x + 10, y + 10, { width: w - 20 });
      doc.fill(ink).font('Helvetica-Bold').fontSize(15).text(value, x + 10, y + 28, { width: w - 20 });
    });
    let y = 320;
    doc.fill(ink).font('Helvetica-Bold').fontSize(12).text('Vos annonces les plus consultées', 48, y); y += 22;
    doc.fill(muted).font('Helvetica-Bold').fontSize(9);
    doc.text('Annonce', 48, y); doc.text('Vues', 330, y, { width: 50, align: 'right' }); doc.text('Réserv.', 390, y, { width: 50, align: 'right' }); doc.text('Revenus', 450, y, { width: 97, align: 'right' });
    y += 16;
    doc.font('Helvetica').fontSize(10).fill(ink);
    if (!d.properties.length) doc.fill(muted).text('Aucune annonce.', 48, y);
    for (const p of d.properties) {
      doc.text(p.title, 48, y, { width: 270, ellipsis: true, lineBreak: false });
      doc.text(String(p.views), 330, y, { width: 50, align: 'right' });
      doc.text(String(p.bookings), 390, y, { width: 50, align: 'right' });
      doc.text(fcfa(p.revenue), 450, y, { width: 97, align: 'right' });
      y += 18;
    }
    doc.fill(muted).fontSize(8).text('Document généré automatiquement par Primeo. Chiffres calculés sur le mois civil écoulé.', 48, doc.page.height - 70, { width: doc.page.width - 96, align: 'center' });
    doc.end();
  });
}

/** Envoie le rapport du mois écoulé à un abonné Entreprise (ou à un utilisateur donné). */
export async function sendMonthlyReport(userId: string, ref = new Date()): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
  if (!user) return false;
  const { start, end, label } = previousMonth(ref);
  const data = await collectMonthlyReport(userId, start, end, label);
  const pdf = await renderMonthlyReportPdf(data);
  await sendEmail({
    to: [{ email: user.email, name: user.firstName }],
    subject: `Votre rapport mensuel Primeo — ${label}`,
    htmlContent: `<p>Bonjour ${user.firstName},</p>
      <p>Voici votre rapport d'activité de <strong>${label}</strong> : ${data.totals.views} vues,
      ${data.totals.bookings} réservation(s) confirmée(s), ${fcfa(data.totals.revenue)} de revenus.</p>
      <p>Le détail par annonce est dans le PDF joint.</p>`,
    attachment: [{ name: `Rapport-Primeo-${label.replace(' ', '-')}.pdf`, content: pdf.toString('base64') }],
  });
  return true;
}

export async function runMonthlyReports(ref = new Date()): Promise<number> {
  const subs = await prisma.subscription.findMany({ where: { status: 'active' }, select: { userId: true, planType: true } });
  let sent = 0;
  for (const s of subs) {
    if (!getPlanDetails(s.planType)?.monthlyReport) continue;
    try { if (await sendMonthlyReport(s.userId, ref)) sent++; } catch (err) { logger.warn(`Rapport mensuel non envoyé (user=${s.userId})`, err); }
  }
  logger.info(`Rapports mensuels envoyés : ${sent}`);
  return sent;
}

export function startMonthlyReportJob(): void {
  cron.schedule('0 7 1 * *', () => { runMonthlyReports().catch((err) => logger.error('Monthly report job failed', err)); });
  logger.info('Monthly report job scheduled (1st of month 07:00)');
}
