// Téléchargements signés — factures et exports régénérés à la volée.
// Routes publiques protégées par jeton chiffré (pas de middleware d'auth) : le
// jeton porte l'autorisation et l'expiration. Aucun fichier n'est stocké.
import { Request, Response, NextFunction } from 'express';
import { verifyDownloadToken } from '../../common/utils/download-token';
import { HttpError } from '../../common/handlers/http-error.handler';
import {
  generateBookingInvoiceBuffer,
  generateSubscriptionInvoiceBuffer,
  type BookingInvoiceData,
  type InvoiceData,
} from '../../common/utils/invoice';
import { exportsService } from '../exports/exports.service';

// Les dates transitent en ISO dans le jeton JSON → on les restaure en Date.
function reviveBookingData(raw: unknown): BookingInvoiceData {
  const d = raw as Record<string, unknown>;
  return {
    ...(d as unknown as BookingInvoiceData),
    invoiceDate: new Date(d.invoiceDate as string),
    startDate: new Date(d.startDate as string),
    endDate: new Date(d.endDate as string),
  };
}

function reviveInvoiceData(raw: unknown): InvoiceData {
  const d = raw as Record<string, unknown>;
  return {
    ...(d as unknown as InvoiceData),
    invoiceDate: new Date(d.invoiceDate as string),
    periodStart: new Date(d.periodStart as string),
    periodEnd: new Date(d.periodEnd as string),
  };
}

const safe = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = verifyDownloadToken(String(req.query.t ?? ''));
    let buffer: Buffer;
    let filename: string;
    if (payload.k === 'binv') {
      const data = reviveBookingData(payload.d);
      buffer = await generateBookingInvoiceBuffer(data);
      filename = `facture_${data.invoiceRef ?? data.invoiceNumber}.pdf`;
    } else if (payload.k === 'sinv') {
      const data = reviveInvoiceData(payload.d);
      buffer = await generateSubscriptionInvoiceBuffer(data);
      filename = `facture_${data.invoiceNumber}.pdf`;
    } else {
      throw new HttpError(400, 'Type de document invalide.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safe(filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadExportFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = verifyDownloadToken(String(req.query.t ?? ''));
    if (payload.k !== 'exp' || !payload.id) throw new HttpError(400, 'Lien de téléchargement invalide.');
    const { buffer, filename, contentType } = await exportsService.regenerate(payload.id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safe(filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
