// Users controller — profile CRUD, désactivation, suppression
import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getById(req.user!.sub);
    res.json({ data: user });
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.update(req.user!.sub, req.body);
    res.json({ data: user });
  } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.changePassword(req.user!.sub, req.body);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) { next(err); }
}

export async function deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.deactivate(req.user!.sub, req.body);
    res.json({ message: 'Compte désactivé' });
  } catch (err) { next(err); }
}

export async function reactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.reactivate(req.user!.sub);
    res.json({ message: 'Compte réactivé' });
  } catch (err) { next(err); }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.deleteAccount(req.user!.sub, req.body);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getById(req.params.id);
    res.json({ data: user });
  } catch (err) { next(err); }
}

export async function setup2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.setup2fa(req.user!.sub);
    res.json(result);
  } catch (err) { next(err); }
}

export async function confirm2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.confirm2fa(req.user!.sub, req.body.token);
    res.json({ message: 'Double authentification activée' });
  } catch (err) { next(err); }
}

export async function disable2fa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.disable2fa(req.user!.sub);
    res.json({ message: 'Double authentification désactivée' });
  } catch (err) { next(err); }
}
