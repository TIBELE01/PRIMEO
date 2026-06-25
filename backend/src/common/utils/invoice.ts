// PDFKit invoice generator — produces a binary PDF buffer for subscription invoices
import PDFDocument from 'pdfkit';
import { uploadToCloudinary } from './s3-client';
import { cloudinaryPaths } from '../../config/cloudinary-paths';

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

export async function generateAndUploadInvoice(data: InvoiceData): Promise<string> {
  const buffer = await buildPdfBuffer(data);
  const filename = `facture_${data.invoiceNumber}.pdf`;
  const result = await uploadToCloudinary(buffer, cloudinaryPaths.systemInvoices(), filename);
  return result.url;
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
}

export async function generateAndUploadBookingInvoice(data: BookingInvoiceData): Promise<string> {
  const buffer = await buildBookingPdfBuffer(data);
  const filename = `facture_reservation_${data.invoiceNumber}.pdf`;
  const result = await uploadToCloudinary(buffer, cloudinaryPaths.systemInvoices(), filename);
  return result.url;
}

function buildBookingPdfBuffer(data: BookingInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryBlue = '#1E3A5F';
    const orange = '#F97316';
    const lightGray = '#f4f4f4';
    const textDark = '#333333';
    const textMuted = '#888888';

    // ── En-tête ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(primaryBlue);
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('PRIMEO', 50, 28);
    doc
      .fillColor('#B0C4DE')
      .fontSize(10)
      .font('Helvetica')
      .text('La plateforme immobilière ivoirienne', 50, 58);
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('api.primeo.ci  |  contact@primeo.ci', doc.page.width - 250, 42, { width: 200, align: 'right' });

    // ── Titre + badge ───────────────────────────────────────────────────────────
    doc.fillColor(primaryBlue).fontSize(20).font('Helvetica-Bold').text('FACTURE', 50, 115);
    const isPaid = data.onlinePaidAmount > 0;
    if (isPaid) {
      doc.save().roundedRect(doc.page.width - 150, 110, 100, 28, 4).fill(orange);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('PAYÉ', doc.page.width - 132, 118);
      doc.restore();
    }

    // ── Métadonnées ───────────────────────────────────────────────────────────
    const invoiceRef = data.invoiceRef ?? data.invoiceNumber;
    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('N° de facture', 50, 148);
    doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text(invoiceRef, 50, 160);
    doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(`Réf. réservation : ${data.invoiceNumber}`, 50, 174);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('Date', 250, 148);
    doc
      .fillColor(textDark)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.invoiceDate.toLocaleDateString('fr-CI'), 250, 160);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(data.sectionLabel ?? 'Séjour', 400, 148);
    doc
      .fillColor(textDark)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(
        `${data.startDate.toLocaleDateString('fr-CI')} → ${data.endDate.toLocaleDateString('fr-CI')}`,
        400,
        160,
        { width: 145 },
      );

    doc.moveTo(50, 195).lineTo(doc.page.width - 50, 195).strokeColor('#dddddd').stroke();

    // ── Facturé à ─────────────────────────────────────────────────────────────
    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('FACTURÉ À', 50, 210);
    doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text(data.customerName, 50, 224);
    doc.fillColor(textMuted).fontSize(10).font('Helvetica').text(data.customerEmail, 50, 238);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('ÉMIS PAR', 350, 210);
    doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text('Primeo CI', 350, 224);
    doc
      .fillColor(textMuted)
      .fontSize(10)
      .font('Helvetica')
      .text("Abidjan, Côte d'Ivoire", 350, 238)
      .text('contact@primeo.ci', 350, 252);

    doc.moveTo(50, 280).lineTo(doc.page.width - 50, 280).strokeColor('#dddddd').stroke();

    // ── Tableau des lignes ──────────────────────────────────────────────────────
    const tableTop = 295;
    doc.rect(50, tableTop, doc.page.width - 100, 24).fill(lightGray);
    doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, tableTop + 8);
    doc.text('MONTANT', doc.page.width - 130, tableTop + 8);

    const rowTop = tableTop + 34;
    doc.fillColor(textDark).fontSize(10).font('Helvetica');
    doc.text(
      data.lineDescription ?? `${data.propertyTitle} — ${data.nights} nuit${data.nights > 1 ? 's' : ''}`,
      60,
      rowTop,
      { width: 300 },
    );
    doc.text(`${data.totalAmount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, rowTop, {
      width: 110,
      align: 'right',
    });

    doc.moveTo(50, rowTop + 22).lineTo(doc.page.width - 50, rowTop + 22).strokeColor('#eeeeee').stroke();

    // ── Totaux ─────────────────────────────────────────────────────────────────
    const totalTop = rowTop + 36;
    doc.fillColor(textMuted).fontSize(10).font('Helvetica').text('Total du séjour', 350, totalTop);
    doc
      .fillColor(textDark)
      .text(`${data.totalAmount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, totalTop, {
        width: 110,
        align: 'right',
      });

    doc.fillColor(textMuted).fontSize(10).text('Payé en ligne', 350, totalTop + 16);
    doc.fillColor('#166534').text(`${data.onlinePaidAmount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, totalTop + 16, {
      width: 110,
      align: 'right',
    });

    doc.fillColor(textMuted).fontSize(10).text('À régler sur place', 350, totalTop + 32);
    doc.fillColor('#D97706').text(`${data.remainingCashAmount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, totalTop + 32, {
      width: 110,
      align: 'right',
    });

    doc.rect(50, totalTop + 50, doc.page.width - 100, 2).fill('#dddddd');

    doc.fillColor(primaryBlue).fontSize(13).font('Helvetica-Bold').text('TOTAL', 350, totalTop + 60);
    doc.text(`${data.totalAmount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, totalTop + 60, {
      width: 110,
      align: 'right',
    });

    // ── Pied de page ────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.rect(0, footerY, doc.page.width, 70).fill(lightGray);
    doc
      .fillColor(textMuted)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `© ${new Date().getFullYear()} Primeo CI  |  Abidjan, Côte d'Ivoire  |  legal.primeo.ci`,
        50,
        footerY + 16,
        { align: 'center', width: doc.page.width - 100 },
      )
      .text(
        'Cette facture a été générée automatiquement par le système Primeo. Conservez-la pour vos dossiers.',
        50,
        footerY + 32,
        { align: 'center', width: doc.page.width - 100 },
      );

    doc.end();
  });
}

function buildPdfBuffer(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryBlue = '#1E3A5F';
    const orange = '#F97316';
    const lightGray = '#f4f4f4';
    const textDark = '#333333';
    const textMuted = '#888888';

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(primaryBlue);

    doc
      .fillColor('#ffffff')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('PRIMEO', 50, 28);

    doc
      .fillColor('#B0C4DE')
      .fontSize(10)
      .font('Helvetica')
      .text('La plateforme immobilière ivoirienne', 50, 58);

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .text('api.primeo.ci  |  contact@primeo.ci', doc.page.width - 250, 42, { width: 200, align: 'right' });

    // ── Invoice title ─────────────────────────────────────────────────────────
    doc.fillColor(primaryBlue).fontSize(20).font('Helvetica-Bold').text('FACTURE', 50, 115);

    if (data.isPaid) {
      doc
        .save()
        .roundedRect(doc.page.width - 150, 110, 100, 28, 4)
        .fill(orange);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('PAYÉE', doc.page.width - 135, 118);
      doc.restore();
    }

    // ── Invoice metadata ──────────────────────────────────────────────────────
    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('N° de facture', 50, 148);
    doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text(data.invoiceNumber, 50, 160);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('Date', 200, 148);
    doc
      .fillColor(textDark)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.invoiceDate.toLocaleDateString('fr-CI'), 200, 160);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('Période', 350, 148);
    doc
      .fillColor(textDark)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(
        `${data.periodStart.toLocaleDateString('fr-CI')} → ${data.periodEnd.toLocaleDateString('fr-CI')}`,
        350,
        160,
      );

    doc.moveTo(50, 185).lineTo(doc.page.width - 50, 185).strokeColor('#dddddd').stroke();

    // ── Billing info ──────────────────────────────────────────────────────────
    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('FACTURÉ À', 50, 200);
    doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text(data.customerName, 50, 214);
    doc.fillColor(textMuted).fontSize(10).font('Helvetica').text(data.customerEmail, 50, 228);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica').text('ÉMIS PAR', 350, 200);
    doc.fillColor(textDark).fontSize(11).font('Helvetica-Bold').text('Primeo CI', 350, 214);
    doc
      .fillColor(textMuted)
      .fontSize(10)
      .font('Helvetica')
      .text('Abidjan, Côte d\'Ivoire', 350, 228)
      .text('contact@primeo.ci', 350, 242);

    doc.moveTo(50, 270).lineTo(doc.page.width - 50, 270).strokeColor('#dddddd').stroke();

    // ── Line items table ──────────────────────────────────────────────────────
    const tableTop = 285;
    doc.rect(50, tableTop, doc.page.width - 100, 24).fill(lightGray);

    doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, tableTop + 8);
    doc.text('MONTANT', doc.page.width - 130, tableTop + 8);

    const rowTop = tableTop + 34;
    doc.fillColor(textDark).fontSize(10).font('Helvetica');
    doc.text(`Abonnement ${data.planName} — Primeo`, 60, rowTop);
    doc.text(
      `${data.amount.toLocaleString('fr-CI')} FCFA`,
      doc.page.width - 160,
      rowTop,
      { width: 110, align: 'right' },
    );

    doc.moveTo(50, rowTop + 20).lineTo(doc.page.width - 50, rowTop + 20).strokeColor('#eeeeee').stroke();

    // ── Total ─────────────────────────────────────────────────────────────────
    const totalTop = rowTop + 34;
    doc.fillColor(textMuted).fontSize(10).font('Helvetica').text('Sous-total HT', 350, totalTop);
    doc
      .fillColor(textDark)
      .text(`${data.amount.toLocaleString('fr-CI')} FCFA`, doc.page.width - 160, totalTop, {
        width: 110,
        align: 'right',
      });

    doc
      .fillColor(textMuted)
      .fontSize(9)
      .text('TVA (0 % — exonéré)', 350, totalTop + 16);
    doc.fillColor(textDark).fontSize(9).text('0 FCFA', doc.page.width - 160, totalTop + 16, {
      width: 110,
      align: 'right',
    });

    doc.rect(50, totalTop + 32, doc.page.width - 100, 2).fill('#dddddd');

    doc.fillColor(primaryBlue).fontSize(13).font('Helvetica-Bold').text('TOTAL', 350, totalTop + 42);
    doc.text(
      `${data.amount.toLocaleString('fr-CI')} FCFA`,
      doc.page.width - 160,
      totalTop + 42,
      { width: 110, align: 'right' },
    );

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.rect(0, footerY, doc.page.width, 70).fill(lightGray);
    doc
      .fillColor(textMuted)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `© ${new Date().getFullYear()} Primeo CI  |  Abidjan, Côte d'Ivoire  |  legal.primeo.ci`,
        50,
        footerY + 16,
        { align: 'center', width: doc.page.width - 100 },
      )
      .text(
        'Cette facture a été générée automatiquement par le système Primeo. Conservez-la pour vos dossiers.',
        50,
        footerY + 32,
        { align: 'center', width: doc.page.width - 100 },
      );

    doc.end();
  });
}
