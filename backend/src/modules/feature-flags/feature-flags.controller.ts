// Contrôleur feature flags — endpoints publics et admin
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { featureFlagsService } from './feature-flags.service';
import { createAudit } from '../admin/admin.service';

const upsertSchema = z.object({
  enabled:     z.boolean(),
  description: z.string().optional(),
});

// GET /api/feature-flags — public, utilisé par mobile et frontend
export async function getPublicFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const flags = await featureFlagsService.getPublic();
    res.json(flags);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/feature-flags — liste complète (admin)
export async function getAllFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const flags = await featureFlagsService.getAll();
    res.json(flags);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/feature-flags/:key — créer ou mettre à jour un flag
export async function upsertFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.params.key;
    const body = upsertSchema.parse(req.body);
    const adminId = (req as any).user?.id as string;

    // Valeur précédente pour l'audit
    const existing = await featureFlagsService.getAll()
      .then(flags => flags.find(f => f.key === key));

    const flag = await featureFlagsService.upsert(key, body.enabled, body.description, adminId);

    await createAudit({
      adminId,
      action:      existing ? 'featureFlag.update' : 'featureFlag.create',
      targetType:  'feature_flag',
      targetId:    key,
      description: existing
        ? `Flag "${key}" modifié : ${existing.enabled ? 'activé' : 'désactivé'} → ${body.enabled ? 'activé' : 'désactivé'}`
        : `Flag "${key}" créé (${body.enabled ? 'activé' : 'désactivé'})`,
      ipAddress: req.ip,
      metadata: existing
        ? { old: { enabled: existing.enabled, description: existing.description }, new: { enabled: flag.enabled, description: flag.description } }
        : { old: {}, new: { enabled: flag.enabled, description: flag.description } },
    });

    res.json(flag);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/feature-flags/:key — supprimer un flag
export async function deleteFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.params.key;
    const adminId = (req as any).user?.id as string;

    const existing = await featureFlagsService.getAll()
      .then(flags => flags.find(f => f.key === key));

    if (!existing) {
      res.status(404).json({ error: 'Flag introuvable' });
      return;
    }

    await featureFlagsService.delete(key, adminId);

    await createAudit({
      adminId,
      action:      'featureFlag.delete',
      targetType:  'feature_flag',
      targetId:    key,
      description: `Flag "${key}" supprimé`,
      ipAddress:   req.ip,
      metadata:    { old: { enabled: existing.enabled, description: existing.description }, new: {} },
    });

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}
