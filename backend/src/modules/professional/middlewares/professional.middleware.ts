// Professional middleware — verifies KYC is approved before allowing pro actions
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';
import { logger } from '../../../common/utils/logger';

/**
 * Un compte professionnel n'est considéré actif que si son KYC est "approved".
 *  - pending  → 403 "Compte en attente de validation"
 *  - rejected → 403 "Compte rejeté, veuillez contacter le support"
 *  - profil absent → traité comme pending (KYC jamais soumis)
 * Les admins passent sans vérification (consultation des comptes pro).
 */
export async function requireKycApproved(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (req.user.role === 'admin') return next();

    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: req.user.sub },
      select: { verificationStatus: true },
    });

    const status = profile?.verificationStatus ?? 'pending';

    if (status === 'approved') return next();

    if (status === 'rejected') {
      return next(new HttpError(403, 'Compte rejeté, veuillez contacter le support.'));
    }

    logger.debug('Accès pro refusé — KYC non approuvé', {
      userId: req.user.sub,
      kycStatus: status,
      path: req.path,
    });
    return next(new HttpError(403, 'Compte en attente de validation.'));
  } catch (err) {
    next(err);
  }
}
