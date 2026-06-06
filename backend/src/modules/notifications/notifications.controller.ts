// Notifications controller
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { notificationsService } from './notifications.service';

const PreferencesDto = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
});

const PushTokenDto = z.object({
  token:    z.string().min(1).optional(),
  platform: z.enum(['ios', 'android']).optional(),
  // Backward-compat field (old clients send playerId instead of token)
  playerId: z.string().min(1).optional(),
}).refine((d) => d.token ?? d.playerId, {
  message: 'token (or playerId) requis',
});

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = parseInt((req.query['page']  as string) ?? '1');
    const limit = parseInt((req.query['limit'] as string) ?? '50');
    const result = await notificationsService.listForUser(req.user!.sub, page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationsService.markRead(req.params['id']!, req.user!.sub);
    res.json({ message: 'Notification marquée comme lue' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationsService.markAllRead(req.user!.sub);
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prefs = await notificationsService.getPreferences(req.user!.sub);
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = PreferencesDto.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
      return;
    }
    const prefs = await notificationsService.updatePreferences(req.user!.sub, parsed.data);
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}

export async function registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = PushTokenDto.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().formErrors[0] ?? 'Token requis' });
      return;
    }
    const rawToken = parsed.data.token ?? parsed.data.playerId!;
    await notificationsService.registerPushToken(req.user!.sub, rawToken, parsed.data.platform);
    res.json({ message: 'Token push enregistré' });
  } catch (err) {
    next(err);
  }
}
