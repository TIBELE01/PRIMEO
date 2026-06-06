// Users controller — profile CRUD operations
import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getById(req.user!.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.update(req.user!.sub, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.changePassword(req.user!.sub, req.body);
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.delete(req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function setup2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.setup2fa(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirm2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.confirm2fa(req.user!.sub, req.body.token);
    res.json({ message: 'Double authentification activée' });
  } catch (err) {
    next(err);
  }
}

export async function disable2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.disable2fa(req.user!.sub);
    res.json({ message: 'Double authentification désactivée' });
  } catch (err) {
    next(err);
  }
}
