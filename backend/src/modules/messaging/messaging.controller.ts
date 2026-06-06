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
