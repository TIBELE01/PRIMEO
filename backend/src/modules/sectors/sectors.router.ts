// Configuration publique des secteurs — lue par l'application mobile et le site.
//   GET /api/config/features → { residence_enabled, hotel_enabled, immobilier_enabled, restaurant_enabled }
// L'écriture est réservée aux administrateurs : PUT /api/admin/config/features.
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sectorsService, toFlags, fromFlags } from './sectors.service';
import { HttpError } from '../../common/handlers/http-error.handler';

export const sectorsConfigRouter = Router();

sectorsConfigRouter.get('/features', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Pas de cache HTTP : une bascule admin doit être visible dès la requête suivante
    res.setHeader('Cache-Control', 'no-store');
    res.json(toFlags(await sectorsService.getStates()));
  } catch (err) {
    next(err);
  }
});

// ── Handlers admin (montés dans admin.router, derrière authenticate + authorize('admin')) ──

const UpdateSectorFlagsDto = z
  .object({
    residence_enabled: z.boolean().optional(),
    hotel_enabled: z.boolean().optional(),
    immobilier_enabled: z.boolean().optional(),
    restaurant_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun secteur à modifier' });

export async function adminGetSectorFlags(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(toFlags(await sectorsService.getStates(true)));
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateSectorFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateSectorFlagsDto.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Données invalides : chaque valeur doit être un booléen', parsed.error.flatten());
    }
    const states = await sectorsService.setStates(fromFlags(parsed.data), req.user!.sub);
    res.json(toFlags(states));
  } catch (err) {
    next(err);
  }
}
