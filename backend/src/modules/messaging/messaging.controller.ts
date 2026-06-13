// Messaging controller — REST endpoints for message history and conversation list
import { Request, Response, NextFunction } from 'express';
import { messagingService } from './messaging.service';

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
