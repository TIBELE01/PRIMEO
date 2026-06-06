// Disputes controller
import { Request, Response, NextFunction } from 'express';
import { disputesService } from './disputes.service';

export async function createDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await disputesService.create(req.user!.sub, req.body);
    res.status(201).json(dispute);
  } catch (err) {
    next(err);
  }
}

export async function getDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await disputesService.getById(req.params['id']!, req.user!.sub);
    res.json(dispute);
  } catch (err) {
    next(err);
  }
}

export async function listMyDisputes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const disputes = await disputesService.listForUser(req.user!.sub);
    res.json(disputes);
  } catch (err) {
    next(err);
  }
}

export async function getDisputeMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const messages = await disputesService.getMessages(
      req.params['id']!,
      req.user!.sub,
      req.user!.role,
    );
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendDisputeMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ok = await disputesService.isAuthorizedForDispute(
      req.params['id']!,
      req.user!.sub,
      req.user!.role,
    );
    if (!ok) { res.status(403).json({ message: 'Accès non autorisé' }); return; }

    const content: string = (req.body?.content ?? '').toString().trim();
    if (!content || content.length > 2000) {
      res.status(400).json({ message: 'Contenu invalide (max 2000 caractères)' });
      return;
    }

    const message = await disputesService.saveDisputeMessage(req.params['id']!, req.user!.sub, content);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}
