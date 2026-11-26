// PDFKit invoice generator — produit un buffer PDF binaire pour les factures.
// La livraison se fait par un lien de téléchargement signé (route /api/downloads)
// qui régénère le PDF à la volée : aucun fichier n'est stocké sur un CDN, ce qui
// contourne le blocage de livraison des PDF par défaut côté Cloudinary.
import PDFDocument from 'pdfkit';
import { env } from '../../config/env.config';
import { createDownloadToken } from './download-token';

// Validité des liens de facture : couvre le clic différé depuis l'email.
const INVOICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function invoiceDownloadUrl(payload: { k: 'binv' | 'sinv'; d: unknown }): string {
  const token = createDownloadToken(payload, INVOICE_TTL_MS);
  return `${env.PUBLIC_URL}/api/downloads/invoice?t=${token}`;
}

export interface InvoiceData {
  invoiceNumber: string;    // transaction ID or formatted ref
  invoiceDate: Date;
  periodStart: Date;
  periodEnd: Date;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;           // FCFA
  isPaid: boolean;
}

// Renvoie un lien de téléchargement signé (le PDF est régénéré à la demande).
export async function generateAndUploadInvoice(data: InvoiceData): Promise<string> {
  return invoiceDownloadUrl({ k: 'sinv', d: data });
}

// Génère le buffer PDF d'une facture d'abonnement (utilisé par la route de téléchargement).
export function generateSubscriptionInvoiceBuffer(data: InvoiceData): Promise<Buffer> {
  return buildPdfBuffer(data);
}

// ── Factures de réservation ────────────────────────────────────────────────

/**
 * Numéro de facture unique et déterministe au format FAC-YYYY-MM-XXXX
 * (XXXX = 4 derniers caractères de l'identifiant de réservation, en majuscules).
 * Déterministe → la même réservation produit toujours le même numéro.
 */
export function formatBookingInvoiceRef(date: Date, bookingId: string): string {
  // UTC pour un numéro stable quel que soit le fuseau du serveur.
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const suffix = (bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '0000').toUpperCase();
  return `FAC-${y}-${m}-${suffix}`;
}

export interface BookingInvoiceData {
  invoiceNumber: string; // identifiant de réservation (ou court)
  invoiceRef?: string;   // numéro de facture unique FAC-YYYY-MM-XXXX
  invoiceDate: Date;
  customerName: string;
  customerEmail: string;
  propertyTitle: string;
  startDate: Date;
  endDate: Date;
  nights: number;
  totalAmount: number; // FCFA — montant total du séjour
  onlinePaidAmount: number; // FCFA — payé en ligne
  remainingCashAmount: number; // FCFA — à régler sur place
  lineDescription?: string; // surcharge de la description de la ligne (ex : restaurant)
  sectionLabel?: string; // surcharge de l'étiquette « Séjour » dans les métadonnées
  // Champs d'affichage (facultatifs — anciens liens signés sans ces champs restent valides)
  walletDeduction?: number; // FCFA — déjà déduit du total (solde portefeuille utilisé)
  customerPhone?: string;
  professionalName?: string; // nom de l'établissement
  professionalAddress?: string;
  quantity?: number; // nuits, couverts…
  unitLabel?: string; // « nuit », « couvert »
}

// Renvoie un lien de téléchargement signé (le PDF est régénéré à la demande).
export async function generateAndUploadBookingInvoice(data: BookingInvoiceData): Promise<string> {
  return invoiceDownloadUrl({ k: 'binv', d: data });
}

// Génère le buffer PDF d'une facture de réservation (utilisé par la route de téléchargement).
export function generateBookingInvoiceBuffer(data: BookingInvoiceData): Promise<Buffer> {
  return buildBookingPdfBuffer(data);
}


// ═════════════════════════════════════════════════════════════════════════════
// Rendu PDF — modèle unique, une seule page A4, couleurs Primeo
// (bleu #0055FF, blanc, gris). Aucun calcul de montant ici : uniquement de la mise
// en page des montants déjà calculés et stockés.
// ═════════════════════════════════════════════════════════════════════════════

const PDF = {
  blue: '#0055FF',
  blueDark: '#0041C4',
  blueSoft: '#EAF1FF',
  text: '#1F2937',
  muted: '#6B7280',
  faint: '#9CA3AF',
  line: '#E5E7EB',
  zebra: '#F7F9FC',
  green: '#059669',
  orange: '#D97706',
} as const;

const COMPANY_INFO = {
  name: 'Primeo CI',
  address: 'Cocody – Saint Viateur, Abidjan, Côte d’Ivoire',
  email: 'support.primeo@gmail.com',
  phone: '+225 07 07 16 16 84',
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
const dateFr = (d: Date) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

interface InvoiceModel {
  ref: string;
  subRef?: string;
  issueDate: Date;
  dueDate: Date;
  status: { label: string; color: string };
  client: { name: string; email: string; phone?: string };
  provider: { title: string; name: string; lines: string[] };
  period?: { label: string; value: string };
  items: Array<{ label: string; detail?: string; qty: number; unit: number; total: number }>;
  subtotal: number;
  discounts: Array<{ label: string; amount: number }>;
  total: number;
  payment: Array<{ label: string; amount: number; color?: string }>;
  paymentNote: string;
}

function renderInvoicePdf(m: InvoiceModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Marges nulles en bas : tout est positionné à la main, PDFKit n'ajoute jamais de page.
    const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 }, info: { Title: `Facture ${m.ref}`, Author: 'Primeo CI' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;   // 595
    const H = doc.page.height;  // 842
    const L = 40;               // marge gauche
    const R = W - 40;           // bord droit
    const CW = R - L;           // largeur utile
    const t = (txt: string, x: number, y: number, o: PDFKit.Mixins.TextOptions = {}) =>
      doc.text(txt, x, y, { lineBreak: false, ...o });

    // ── En-tête : bandeau bleu ────────────────────────────────────────────────
    doc.rect(0, 0, W, 128).fill(PDF.blue);
    doc.rect(0, 128, W, 4).fill(PDF.blueDark);
    // Petit logo (carré blanc arrondi + « P »)
    doc.roundedRect(L, 30, 26, 26, 6).fill('#FFFFFF');
    doc.fillColor(PDF.blue).font('Helvetica-Bold').fontSize(16);
    t('P', L, 35, { width: 26, align: 'center' });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(17);
    t('Primeo', L + 34, 35);
    doc.font('Helvetica').fontSize(8.5).fillColor('#DCE7FF');
    t(COMPANY_INFO.address, L, 68);
    t(COMPANY_INFO.email, L, 81);
    t(COMPANY_INFO.phone, L, 94);

    // Bloc facture (à droite)
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24);
    t('FACTURE', R - 220, 26, { width: 220, align: 'right' });
    const meta: Array<[string, string]> = [
      ['N° de facture', m.ref],
      ['Date d’émission', dateFr(m.issueDate)],
      ['Date d’échéance', dateFr(m.dueDate)],
    ];
    let my = 62;
    for (const [k, v] of meta) {
      doc.font('Helvetica').fontSize(8.5).fillColor('#DCE7FF');
      t(k, R - 220, my, { width: 105 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
      t(v, R - 115, my, { width: 115, align: 'right' });
      my += 15;
    }
    if (m.subRef) {
      doc.font('Helvetica').fontSize(7.5).fillColor('#DCE7FF');
      t(m.subRef, R - 220, my + 1, { width: 220, align: 'right' });
    }

    // ── Statut + période ──────────────────────────────────────────────────────
    let y = 150;
    doc.font('Helvetica-Bold').fontSize(8.5);
    const badgeW = doc.widthOfString(m.status.label) + 18;
    doc.roundedRect(L, y, badgeW, 18, 9).fill(m.status.color);
    doc.fillColor('#FFFFFF');
    t(m.status.label, L, y + 5, { width: badgeW, align: 'center' });
    if (m.period) {
      doc.font('Helvetica').fontSize(8.5).fillColor(PDF.muted);
      t(`${m.period.label} :`, L + badgeW + 12, y + 5);
      const lw = doc.widthOfString(`${m.period.label} : `);
      doc.font('Helvetica-Bold').fillColor(PDF.text);
      t(m.period.value, L + badgeW + 12 + lw, y + 5);
    }

    // ── Client / professionnel ────────────────────────────────────────────────
    y = 184;
    const boxW = (CW - 14) / 2;
    const box = (x: number, title: string, name: string, lines: string[]) => {
      doc.roundedRect(x, y, boxW, 78, 6).fill(PDF.zebra);
      doc.rect(x, y, 3, 78).fill(PDF.blue);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(PDF.blue);
      t(title.toUpperCase(), x + 14, y + 11, { characterSpacing: 0.6 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(PDF.text);
      t(name, x + 14, y + 25, { width: boxW - 24, ellipsis: true });
      doc.font('Helvetica').fontSize(8.5).fillColor(PDF.muted);
      lines.filter(Boolean).slice(0, 3).forEach((l, i) => t(l, x + 14, y + 41 + i * 11.5, { width: boxW - 24, ellipsis: true }));
    };
    box(L, 'Facturé à', m.client.name || 'Client Primeo', [m.client.email, m.client.phone ?? ''].filter(Boolean) as string[]);
    box(L + boxW + 14, m.provider.title, m.provider.name, m.provider.lines);

    // ── Tableau des détails ───────────────────────────────────────────────────
    y = 282;
    const col = { label: L + 12, qty: L + 300, unit: L + 350, total: R - 12 };
    doc.roundedRect(L, y, CW, 24, 4).fill(PDF.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
    t('DÉSIGNATION', col.label, y + 8.5);
    t('QTÉ', col.qty - 20, y + 8.5, { width: 40, align: 'center' });
    t('PRIX UNITAIRE', col.unit, y + 8.5, { width: 85, align: 'right' });
    t('TOTAL', col.total - 90, y + 8.5, { width: 90, align: 'right' });
    y += 24;
    m.items.forEach((it, i) => {
      const h = it.detail ? 34 : 26;
      if (i % 2 === 1) doc.rect(L, y, CW, h).fill(PDF.zebra);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF.text);
      t(it.label, col.label, y + 8, { width: 270, ellipsis: true });
      if (it.detail) {
        doc.font('Helvetica').fontSize(7.5).fillColor(PDF.muted);
        t(it.detail, col.label, y + 20, { width: 270, ellipsis: true });
      }
      doc.font('Helvetica').fontSize(9).fillColor(PDF.text);
      t(String(it.qty), col.qty - 20, y + 8, { width: 40, align: 'center' });
      t(fcfa(it.unit), col.unit, y + 8, { width: 85, align: 'right' });
      doc.font('Helvetica-Bold');
      t(fcfa(it.total), col.total - 90, y + 8, { width: 90, align: 'right' });
      y += h;
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor(PDF.line).stroke();
    });

    // ── Totaux (à droite) ─────────────────────────────────────────────────────
    y += 16;
    const TX = R - 230;
    const row = (label: string, value: string, color: string = PDF.text) => {
      doc.font('Helvetica').fontSize(9).fillColor(PDF.muted);
      t(label, TX, y, { width: 130 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(color);
      t(value, R - 100, y, { width: 100, align: 'right' });
      y += 16;
    };
    row('Sous-total', fcfa(m.subtotal));
    for (const d of m.discounts) row(d.label, `- ${fcfa(d.amount)}`, PDF.green);
    row('TVA (0 % — non applicable)', fcfa(0));
    y += 4;
    doc.roundedRect(TX - 10, y, R - TX + 10, 32, 6).fill(PDF.blue);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#FFFFFF');
    t('TOTAL GÉNÉRAL', TX, y + 11);
    doc.fontSize(13);
    t(fcfa(m.total), R - 150, y + 9.5, { width: 140, align: 'right' });
    y += 50;

    // ── Conditions de paiement ────────────────────────────────────────────────
    const payH = 26 + m.payment.length * 15 + 14;
    doc.roundedRect(L, y, CW, payH, 6).fill(PDF.blueSoft);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(PDF.blue);
    t('CONDITIONS DE PAIEMENT', L + 14, y + 11, { characterSpacing: 0.6 });
    let py = y + 26;
    for (const p of m.payment) {
      doc.font('Helvetica').fontSize(9).fillColor(PDF.text);
      t(p.label, L + 14, py, { width: 300 });
      doc.font('Helvetica-Bold').fillColor(p.color ?? PDF.text);
      t(fcfa(p.amount), R - 134, py, { width: 120, align: 'right' });
      py += 15;
    }
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(PDF.muted);
    t(m.paymentNote, L + 14, py + 1, { width: CW - 28, ellipsis: true });

    // ── Remerciement + mentions légales (bas de page fixe) ───────────────────
    const fy = H - 92;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(PDF.blue);
    t('Merci pour votre confiance !', L, fy - 38, { width: CW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(PDF.muted);
    t('Pour toute question sur cette facture : support.primeo@gmail.com · +225 07 07 16 16 84', L, fy - 21, { width: CW, align: 'center' });
    doc.rect(0, fy, W, H - fy).fill('#F3F4F6');
    doc.rect(0, fy, W, 2).fill(PDF.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF.text);
    t(`© ${new Date().getUTCFullYear()} Primeo CI — Plateforme de réservation en Côte d’Ivoire`, L, fy + 16, { width: CW, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(PDF.muted);
    t(`${COMPANY_INFO.address} · ${COMPANY_INFO.email} · ${COMPANY_INFO.phone}`, L, fy + 31, { width: CW, align: 'center' });
    t('TVA non applicable. Document généré automatiquement par Primeo, valant facture. Conservez-le pour vos dossiers.', L, fy + 44, { width: CW, align: 'center' });
    t('Conditions générales de vente et mentions légales : legal.primeo.ci', L, fy + 57, { width: CW, align: 'center' });

    doc.end();
  });
}

function buildBookingPdfBuffer(data: BookingInvoiceData): Promise<Buffer> {
  const toDate = (d: Date | string) => new Date(d);
  const wallet = Math.max(0, data.walletDeduction ?? 0);
  const subtotal = data.totalAmount + wallet; // total avant déduction du portefeuille
  const isTable = (data.sectionLabel ?? '') === 'Réservation';
  const qty = Math.max(1, data.quantity ?? data.nights ?? 1);
  const unitLabel = data.unitLabel ?? (isTable ? 'couvert' : 'nuit');
  const start = toDate(data.startDate);
  const end = toDate(data.endDate);
  const paidOnline = data.onlinePaidAmount;
  const cash = data.remainingCashAmount;

  const status = cash <= 0 && paidOnline > 0
    ? { label: 'PAYÉE', color: PDF.green }
    : paidOnline > 0
      ? { label: 'ACOMPTE PAYÉ', color: PDF.blue }
      : { label: 'À RÉGLER SUR PLACE', color: PDF.orange };

  const detail = isTable
    ? `Le ${dateFr(start)}`
    : `Du ${dateFr(start)} au ${dateFr(end)} · ${qty} ${unitLabel}${qty > 1 ? 's' : ''}`;

  return renderInvoicePdf({
    ref: data.invoiceRef ?? data.invoiceNumber,
    subRef: `Réf. réservation : ${data.invoiceNumber}`,
    issueDate: toDate(data.invoiceDate),
    // Échéance : date d'arrivée s'il reste un montant à régler, sinon date d'émission
    dueDate: cash > 0 ? start : toDate(data.invoiceDate),
    status,
    client: { name: data.customerName, email: data.customerEmail, phone: data.customerPhone },
    provider: {
      title: 'Établissement',
      name: data.professionalName || data.propertyTitle,
      lines: [data.professionalName ? data.propertyTitle : '', data.professionalAddress ?? ''].filter(Boolean),
    },
    period: { label: data.sectionLabel ?? 'Séjour', value: isTable ? dateFr(start) : `du ${dateFr(start)} au ${dateFr(end)}` },
    items: [{
      label: data.lineDescription ?? (isTable ? `Réservation de table — ${data.propertyTitle}` : `Nuitée — ${data.propertyTitle}`),
      detail,
      qty,
      unit: Math.round(subtotal / qty),
      total: subtotal,
    }],
    subtotal,
    discounts: wallet > 0 ? [{ label: 'Remise (solde portefeuille)', amount: wallet }] : [],
    total: data.totalAmount,
    payment: [
      { label: 'Payé en ligne (Genius Pay)', amount: paidOnline, color: PDF.green },
      { label: 'Reste à payer en espèces sur place', amount: cash, color: cash > 0 ? PDF.orange : PDF.text },
    ],
    paymentNote: cash > 0
      ? `Le solde de ${fcfa(cash)} est à régler directement auprès de l’établissement à votre arrivée.`
      : 'Aucun montant restant dû. Merci pour votre règlement.',
  });
}

function buildPdfBuffer(data: InvoiceData): Promise<Buffer> {
  const issue = new Date(data.invoiceDate);
  return renderInvoicePdf({
    ref: data.invoiceNumber,
    issueDate: issue,
    dueDate: issue,
    status: data.isPaid ? { label: 'PAYÉE', color: PDF.green } : { label: 'EN ATTENTE DE PAIEMENT', color: PDF.orange },
    client: { name: data.customerName, email: data.customerEmail },
    provider: { title: 'Émis par', name: COMPANY_INFO.name, lines: [COMPANY_INFO.address, COMPANY_INFO.email] },
    period: { label: 'Période', value: `du ${dateFr(new Date(data.periodStart))} au ${dateFr(new Date(data.periodEnd))}` },
    items: [{ label: `Abonnement ${data.planName} — Primeo`, detail: 'Formule professionnelle mensuelle', qty: 1, unit: data.amount, total: data.amount }],
    subtotal: data.amount,
    discounts: [],
    total: data.amount,
    payment: [{ label: data.isPaid ? 'Payé en ligne (Genius Pay)' : 'Montant à régler', amount: data.amount, color: data.isPaid ? PDF.green : PDF.orange }],
    paymentNote: data.isPaid ? 'Abonnement réglé. Merci pour votre confiance.' : 'Le règlement est prélevé à la date d’échéance indiquée.',
  });
}
