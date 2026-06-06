// Collaborators controller — multi-user management (§7.11)
import { Request, Response, NextFunction } from 'express';
import { collaboratorsService } from './collaborators.service';

export async function inviteCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.invite(req.user!.sub, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCollaborators(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.list(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateCollaboratorRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.updateRole(req.user!.sub, req.params['id']!, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function revokeCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.revoke(req.user!.sub, req.params['id']!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function myInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.myInvitations(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await collaboratorsService.accept(req.user!.sub, req.body.token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
