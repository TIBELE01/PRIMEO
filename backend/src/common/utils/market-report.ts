// Market report PDF generator — builds and uploads anonymised market intelligence reports
import PDFDocument from 'pdfkit';
import { uploadToCloudinary } from './s3-client';
import { cloudinaryConfig } from '../../config/cloudinary.config';

export type MarketReportType = 'price_trends' | 'occupancy_rates' | 'client_profiles' | 'competitive_analysis';

interface MarketReportInput {
  reportType: MarketReportType;
  reportData: Record<string, unknown>;
  generatedAt: Date;
  customerName: string;
  transactionId: string;
}

const REPORT_LABELS: Record<MarketReportType, string> = {
  price_trends: 'Tendances des prix',
  occupancy_rates: "Taux d'occupation",
  client_profiles: 'Profil client',
  competitive_analysis: 'Performances comparatives',
};

export async function generateMarketReportPdf(input: MarketReportInput): Promise<string> {
  const buffer = await buildPdfBuffer(input);
  const filename = `rapport_${input.reportType}_${input.transactionId}.pdf`;
  const result = await uploadToCloudinary(buffer, cloudinaryConfig.folders.reports, filename);
  return result.url;
}

function buildPdfBuffer(input: MarketReportInput): Promise<Buffer> {
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
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold').text('PRIMEO', 50, 28);
    doc.fillColor('#B0C4DE').fontSize(10).font('Helvetica').text('La plateforme immobilière ivoirienne', 50, 58);
    doc.fillColor('#ffffff').fontSize(10)
      .text('api.primeo.ci  |  contact@primeo.ci', doc.page.width - 250, 42, { width: 200, align: 'right' });

    // ── Title ─────────────────────────────────────────────────────────────────
    doc.fillColor(primaryBlue).fontSize(20).font('Helvetica-Bold')
      .text('RAPPORT DE MARCHÉ', 50, 115);

    doc.save().roundedRect(doc.page.width - 200, 110, 150, 28, 4).fill(orange);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text(REPORT_LABELS[input.reportType].toUpperCase(), doc.page.width - 195, 118, { width: 140 });
    doc.restore();

    // ── Metadata ──────────────────────────────────────────────────────────────
    const meta = [
      ['Généré le', input.generatedAt.toLocaleDateString('fr-CI')],
      ['Destinataire', input.customerName],
      ['Référence', input.transactionId.slice(0, 12)],
      ['Période analysée', '12 derniers mois'],
    ];

    let metaY = 155;
    meta.forEach(([label, value]) => {
      doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(label, 50, metaY);
      doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text(value, 200, metaY);
      metaY += 16;
    });

    doc.moveTo(50, metaY + 8).lineTo(doc.page.width - 50, metaY + 8).strokeColor('#dddddd').stroke();

    // ── Section intro ─────────────────────────────────────────────────────────
    let y = metaY + 24;
    doc.fillColor(primaryBlue).fontSize(14).font('Helvetica-Bold')
      .text(REPORT_LABELS[input.reportType], 50, y);
    y += 20;

    doc.fillColor(textMuted).fontSize(9).font('Helvetica')
      .text(
        'Données anonymisées et agrégées — conformes à la politique de confidentialité Primeo (§10.6).',
        50, y, { width: doc.page.width - 100 },
      );
    y += 24;

    // ── Report data ────────────────────────────────────────────────────────────
    doc.fillColor(textDark).fontSize(10).font('Helvetica');

    if (input.reportType === 'price_trends') {
      const rows = (input.reportData['priceTrends'] as Array<Record<string, unknown>>) ?? [];
      if (rows.length > 0) {
        // Table header
        doc.rect(50, y, doc.page.width - 100, 22).fill(lightGray);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
        doc.text('VILLE', 60, y + 7);
        doc.text('MOIS', 180, y + 7);
        doc.text('PRIX MOYEN / NUIT', 300, y + 7);
        y += 30;

        const rowsToShow = rows.slice(0, 30);
        rowsToShow.forEach((row, i) => {
          if (i % 2 === 0) doc.rect(50, y - 2, doc.page.width - 100, 18).fill('#fafafa');
          doc.fillColor(textDark).fontSize(9).font('Helvetica');
          doc.text(String(row['city'] ?? ''), 60, y);
          doc.text(String(row['month'] ?? ''), 180, y);
          doc.text(`${Number(row['avg_price'] ?? 0).toLocaleString('fr-CI')} FCFA`, 300, y);
          y += 18;
          if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
        });
      } else {
        doc.text('Données insuffisantes pour générer ce rapport.', 50, y);
      }

    } else if (input.reportType === 'occupancy_rates') {
      const rows = (input.reportData['occupancyByCity'] as Array<Record<string, unknown>>) ?? [];
      if (rows.length > 0) {
        doc.rect(50, y, doc.page.width - 100, 22).fill(lightGray);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
        doc.text('VILLE', 60, y + 7);
        doc.text('RÉSERVATIONS', 250, y + 7);
        doc.text('DURÉE MOY. (nuits)', 380, y + 7);
        y += 30;

        rows.forEach((row, i) => {
          if (i % 2 === 0) doc.rect(50, y - 2, doc.page.width - 100, 18).fill('#fafafa');
          doc.fillColor(textDark).fontSize(9).font('Helvetica');
          doc.text(String(row['city'] ?? ''), 60, y);
          doc.text(String(row['total_bookings'] ?? 0), 250, y);
          doc.text(Number(row['avg_nights'] ?? 0).toFixed(1), 380, y);
          y += 18;
          if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
        });
      } else {
        doc.text('Données insuffisantes pour générer ce rapport.', 50, y);
      }

    } else if (input.reportType === 'client_profiles') {
      const avgLead = input.reportData['avgLeadDays'] as number ?? 0;
      doc.text(`Délai de réservation moyen : ${avgLead} jours`, 50, y);
      y += 24;

      const dist = (input.reportData['durationDistribution'] as Array<Record<string, unknown>>) ?? [];
      if (dist.length > 0) {
        doc.fillColor(primaryBlue).fontSize(12).font('Helvetica-Bold').text('Répartition des durées de séjour', 50, y);
        y += 18;
        doc.rect(50, y, doc.page.width - 100, 22).fill(lightGray);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
        doc.text('DURÉE', 60, y + 7);
        doc.text('NOMBRE DE SÉJOURS', 300, y + 7);
        y += 30;

        dist.forEach((row, i) => {
          if (i % 2 === 0) doc.rect(50, y - 2, doc.page.width - 100, 18).fill('#fafafa');
          doc.fillColor(textDark).fontSize(9).font('Helvetica');
          doc.text(String(row['duration_bucket'] ?? ''), 60, y);
          doc.text(String(row['count'] ?? 0), 300, y);
          y += 18;
        });
      }

    } else if (input.reportType === 'competitive_analysis') {
      const rows = (input.reportData['marketByTypeAndCity'] as Array<Record<string, unknown>>) ?? [];
      if (rows.length > 0) {
        doc.rect(50, y, doc.page.width - 100, 22).fill(lightGray);
        doc.fillColor(textMuted).fontSize(9).font('Helvetica-Bold');
        doc.text('VILLE', 55, y + 7);
        doc.text('TYPE', 155, y + 7);
        doc.text('PRIX MOY.', 270, y + 7);
        doc.text('NOTE MOY.', 370, y + 7);
        doc.text('ANNONCES', 460, y + 7);
        y += 30;

        rows.forEach((row, i) => {
          if (i % 2 === 0) doc.rect(50, y - 2, doc.page.width - 100, 18).fill('#fafafa');
          doc.fillColor(textDark).fontSize(8.5).font('Helvetica');
          doc.text(String(row['city'] ?? ''), 55, y, { width: 95 });
          doc.text(String(row['property_type'] ?? ''), 155, y, { width: 110 });
          doc.text(row['avg_price'] ? `${Number(row['avg_price']).toLocaleString('fr-CI')} F` : '—', 270, y, { width: 90 });
          doc.text(row['avg_rating'] ? Number(row['avg_rating']).toFixed(1) : '—', 370, y, { width: 80 });
          doc.text(String(row['count'] ?? 0), 460, y);
          y += 18;
          if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
        });
      } else {
        doc.text('Données insuffisantes pour générer ce rapport.', 50, y);
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 70;
    doc.rect(0, footerY, doc.page.width, 70).fill(lightGray);
    doc.fillColor(textMuted).fontSize(8).font('Helvetica')
      .text(
        `© ${new Date().getFullYear()} Primeo CI — Rapport confidentiel — Usage interne uniquement`,
        50, footerY + 12,
        { align: 'center', width: doc.page.width - 100 },
      )
      .text(
        'Les données sont anonymisées et agrégées. Aucune donnée personnelle n\'est communiquée.',
        50, footerY + 28,
        { align: 'center', width: doc.page.width - 100 },
      );

    doc.end();
  });
}
