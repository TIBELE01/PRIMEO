// Messaging controller — REST endpoints for message history and conversation list
import { Request, Response, NextFunction } from 'express';
import { messagingService } from './messaging.service';
import { mediaService } from '../media/media.service';
import { supportService } from '../support/support.service';
import { prisma } from '../../database/prisma.service';
import { cloudinaryPaths } from '../../config/cloudinary-paths';
import { HttpError } from '../../common/handlers/http-error.handler';

export async function listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversations = await messagingService.listConversations(req.user!.sub, req.user!.role);
    res.json(conversations);
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1');
    const limit = Math.min(parseInt((req.query['limit'] as string) ?? '50'), 100);
    const result = await messagingService.getConversation(
      req.params['bookingId']!,
      req.user!.sub,
      req.user!.role,
      page,
      limit,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await messagingService.markAsRead(req.params['bookingId']!, req.user!.sub);
    res.json({ markedRead: count });
  } catch (err) {
    next(err);
  }
}

// ── Réponses rapides (templates) ─────────────────────────────────────────────

export async function listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await messagingService.listTemplates(req.user!.sub, req.user!.role) });
  } catch (err) { next(err); }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ data: await messagingService.createTemplate(req.user!.sub, req.user!.role, req.body) });
  } catch (err) { next(err); }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await messagingService.updateTemplate(req.user!.sub, req.params['id']!, req.body) });
  } catch (err) { next(err); }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await messagingService.deleteTemplate(req.user!.sub, req.params['id']!);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Image jointe à une conversation : téléversée sur Cloudinary, réservée aux
// participants de la réservation. Le client envoie ensuite « [Image] <url> ».
export async function uploadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.params['bookingId']!;
    const allowed = await messagingService.isAuthorized(bookingId, req.user!.sub, req.user!.role);
    if (!allowed) throw new HttpError(403, 'Accès non autorisé à cette conversation');
    if (!req.file) throw new HttpError(400, 'Aucun fichier fourni');
    if (!req.file.mimetype.startsWith('image/')) throw new HttpError(400, 'Seules les images sont acceptées');
    const result = await mediaService.upload(req.file, cloudinaryPaths.messageAttachments(bookingId));
    res.status(201).json({ url: result.optimizedUrl ?? result.url });
  } catch (err) {
    next(err);
  }
}

const REPORT_REASONS: Record<string, string> = {
  inappropriate_content: 'Contenu inapproprié',
  harassment: 'Harcèlement',
  spam: 'Spam',
};

// Signalement d'un message reçu : crée un ticket « réclamation » traité par
// l'équipe support depuis l'admin (Support › Tickets).
export async function reportMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const reason = String(req.body?.reason ?? '');
    if (!REPORT_REASONS[reason]) throw new HttpError(400, 'Motif de signalement invalide');
    const msg = await prisma.message.findUnique({
      where: { id: req.params['messageId']! },
      select: { id: true, content: true, senderId: true, receiverId: true, bookingId: true, sentAt: true },
    });
    if (!msg || msg.receiverId !== userId) throw new HttpError(404, 'Message introuvable');
    const ticket = await supportService.create(userId, {
      category: 'complaint',
      subject: `Signalement d'un message — ${REPORT_REASONS[reason]}`,
      description: [
        `Motif : ${REPORT_REASONS[reason]}`,
        `Message : ${msg.id} (envoyé le ${msg.sentAt.toISOString()})`,
        `Expéditeur : ${msg.senderId}`,
        msg.bookingId ? `Réservation : ${msg.bookingId}` : null,
        '',
        `Contenu signalé :\n${msg.content.slice(0, 1500)}`,
      ].filter((l) => l !== null).join('\n'),
      attachments: [],
    });
    res.status(201).json({ reported: true, ticketId: ticket.id });
  } catch (err) {
    next(err);
  }
}
