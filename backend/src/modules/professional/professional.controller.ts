// Professional controller — KYC and 2FA management
import { Request, Response, NextFunction } from 'express';
import { professionalService } from './professional.service';

export async function getProfessionalProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await professionalService.getProfile(req.user!.sub);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function submitKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.files est peuplé par multer (upload.fields) — documents justificatifs
    const result = await professionalService.submitKyc(req.user!.sub, req.body, req.files as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getKycStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await professionalService.getKycStatus(req.user!.sub);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function setupTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await professionalService.setupTotp(req.user!.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function confirmTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await professionalService.confirmTotp(req.user!.sub, req.body.token);
    res.json({ message: '2FA enabled' });
  } catch (err) {
    next(err);
  }
}

export async function disableTotp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await professionalService.disableTotp(req.user!.sub);
    res.json({ message: '2FA disabled' });
  } catch (err) {
    next(err);
  }
}
