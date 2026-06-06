// Professional middleware — verifies KYC is approved before allowing pro actions
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';

export async function requireKycApproved(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: req.user!.sub },
      select: { verificationStatus: true },
    });
    if (!profile) return next(new HttpError(403, 'Professional profile not found'));
    if (profile.verificationStatus !== 'approved') return next(new HttpError(403, 'KYC verification required'));
    next();
  } catch (err) {
    next(err);
  }
}
