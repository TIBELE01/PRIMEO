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
import axios from 'axios';
import { prisma } from '../../database/prisma.service';
import { logger } from '../../common/utils/logger';
import { downloadPrivateFile, parseStorageRef, contentTypeFor, extensionOf } from '../../common/utils/private-storage';
import { cloudinaryPrivateDownloadUrl } from '../../common/utils/s3-client';

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

// CV d'un candidat : lu côté serveur (stockage privé, ou API Cloudinary pour les anciens CV)
// puis renvoyé en téléchargement. Le lien est signé et expire (30 jours).
export async function downloadCv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = verifyDownloadToken(String(req.query.t ?? ''));
    if (payload.k !== 'cv' || !payload.id) throw new HttpError(400, 'Lien de téléchargement invalide.');
    const app = await prisma.careersSpontaneous.findUnique({ where: { id: payload.id } });
    if (!app || !(app.cvUrl || app.cvPublicId)) throw new HttpError(404, 'CV introuvable.');

    const ref = app.cvPublicId ?? app.cvUrl ?? '';
    let buffer: Buffer;
    let ext: string;
    if (parseStorageRef(ref)) {
      buffer = await downloadPrivateFile(ref);
      ext = extensionOf(ref) || 'pdf';
    } else {
      // Ancien CV hébergé sur Cloudinary (envoyé comme « image ») : téléchargement signé via l'API
      ext = extensionOf(app.cvUrl ?? '') || 'pdf';
      const url = cloudinaryPrivateDownloadUrl(app.cvPublicId ?? '', ext, (app.cvUrl ?? '').includes('/raw/') ? 'raw' : 'image');
      try {
        const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 20_000 });
        buffer = Buffer.from(r.data);
      } catch (err) {
        logger.warn(`CV ${app.id} : téléchargement Cloudinary impossible`, err);
        throw new HttpError(404, 'Ce CV n\'est plus disponible. Contactez le candidat directement par e-mail.');
      }
    }
    const filename = safe(`CV_${app.firstName}_${app.lastName}.${ext}`);
    res.setHeader('Content-Type', contentTypeFor(filename));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
