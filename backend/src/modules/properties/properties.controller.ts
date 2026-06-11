// Properties controller — CRUD, search, media, admin moderation
import { Request, Response, NextFunction } from 'express';
import { propertiesService } from './properties.service';
import { autocompleteAddress } from '../../common/utils/maps';

export async function listProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertiesService.search(req.query as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.getById(req.params.id);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function createProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.create(req.user!.sub, req.body);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

export async function updateProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.update(req.params.id, req.user!.sub, req.body);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function deleteProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertiesService.delete(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function publishProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.publish(req.params.id, req.user!.sub);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function getMyProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Un restaurateur possède toujours un établissement : on le provisionne
    // automatiquement s'il n'existe pas encore, pour atterrir directement
    // sur le tableau de bord sans étape de création manuelle.
    if (req.user!.role === 'restaurateur') {
      await propertiesService.ensureRestaurant(req.user!.sub).catch(() => undefined);
    }
    const properties = await propertiesService.getByOwner(req.user!.sub, req.query as never);
    res.json(properties);
  } catch (err) {
    next(err);
  }
}

// Proxy Geoapify autocomplete to avoid exposing the API key to the client
export async function addressAutocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query['q'] as string | undefined;
    if (!q || q.length < 3) { res.json([]); return; }
    const results = await autocompleteAddress(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

// Generate Cloudinary signed upload params for direct client-to-CDN upload
export async function signUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const folder = (req.query['folder'] as string | undefined) ?? 'properties';
    const params = propertiesService.signUpload(folder);
    res.json(params);
  } catch (err) {
    next(err);
  }
}

export async function addMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const media = await propertiesService.addMedia(req.params.id, req.user!.sub, req.body);
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertiesService.deleteMedia(req.params.id, req.params.mediaId, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Upload direct d'un fichier image/vidéo/360 → Cloudinary → PropertyMedia
// Les vidéos nécessitent Business ou Entreprise ; les visites 3D nécessitent Entreprise.
export async function uploadMediaFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'Aucun fichier reçu' }); return; }

    const mediaType = (req.body?.mediaType ?? 'photo') as 'photo' | 'video' | 'virtual_tour_360';
    const isPrimary = req.body?.isPrimary === 'true' || req.body?.isPrimary === true;
    const sortOrder = parseInt(req.body?.sortOrder ?? '0', 10);

    // Validation MIME pour les vidéos
    if (mediaType === 'video') {
      const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
      if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
        res.status(400).json({ error: 'Format vidéo non supporté. Utilisez MP4, MOV ou AVI.' });
        return;
      }
    }

    // Vérification des droits d'upload selon la formule
    if (mediaType === 'video' || mediaType === 'virtual_tour_360') {
      const { prisma } = await import('../../database/prisma.service');
      const { PLAN_DETAILS } = await import('../../common/constants/subscription-plans');
      const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.sub } });
      const plan = sub ? PLAN_DETAILS[sub.planType] : null;

      if (mediaType === 'video' && !plan?.videoUpload) {
        res.status(403).json({ error: 'L\'upload de vidéos est réservé aux formules Business et Entreprise.' });
        return;
      }
      if (mediaType === 'virtual_tour_360' && !plan?.virtualTour) {
        res.status(403).json({ error: 'La visite 3D est réservée à la formule Entreprise.' });
        return;
      }

      // Max 1 vidéo par propriété
      if (mediaType === 'video') {
        const videoCount = await prisma.propertyMedia.count({
          where: { propertyId: req.params.id, mediaType: 'video' as never },
        });
        if (videoCount >= 1) {
          res.status(400).json({ error: 'Maximum 1 vidéo par propriété.' });
          return;
        }
      }
    }

    const media = await propertiesService.uploadAndSaveMedia(
      req.params.id, req.user!.sub, file, { mediaType, isPrimary, sortOrder },
    );
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
}

// ── Visite 3D : scènes panoramiques 360° ─────────────────────────────────────

// Liste publique des scènes 3D d'une propriété (consommée par la fiche détail)
export async function list3dScenes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scenes = await propertiesService.list3dScenes(req.params.id);
    res.json(scenes);
  } catch (err) {
    next(err);
  }
}

// Upload d'une photo panoramique équirectangulaire (JPEG/PNG, max 10 Mo).
// Réservé à la formule Entreprise ; max 10 scènes par propriété.
export async function upload3dScene(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'Aucun fichier reçu' }); return; }

    const ALLOWED_360_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_360_MIMES.includes(file.mimetype)) {
      res.status(400).json({ error: 'Format non supporté. Utilisez une photo JPEG, PNG ou WebP équirectangulaire.' });
      return;
    }

    // Gate abonnement : Entreprise uniquement
    const { prisma } = await import('../../database/prisma.service');
    const { PLAN_DETAILS } = await import('../../common/constants/subscription-plans');
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.sub } });
    const plan = sub ? PLAN_DETAILS[sub.planType] : null;
    if (!plan?.virtualTour) {
      res.status(403).json({ error: 'La visite 3D est réservée à la formule Entreprise.' });
      return;
    }

    const roomName = String(req.body?.roomName ?? '').trim() || 'Pièce';
    const sortOrder = parseInt(req.body?.sortOrder ?? '0', 10);

    const scene = await propertiesService.upload3dScene(req.params.id, req.user!.sub, file, { roomName, sortOrder });
    res.status(201).json(scene);
  } catch (err) {
    next(err);
  }
}

export async function delete3dScene(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertiesService.delete3dScene(req.params.id, req.params.sceneId, req.user!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getPropertyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await propertiesService.getStats(req.params.id, req.user!.sub);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function suspendProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await propertiesService.suspend(req.params.id, req.user!.sub);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

// Admin moderation
export async function approveProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertiesService.approve(req.params.id, req.user!.sub);
    res.json({ message: 'Annonce approuvée et mise en ligne' });
  } catch (err) {
    next(err);
  }
}

export async function rejectProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await propertiesService.reject(req.params.id, req.user!.sub, req.body.reason);
    res.json({ message: 'Annonce rejetée' });
  } catch (err) {
    next(err);
  }
}

// Immobilier : exprimer son intérêt pour un bien (notifie le responsable)
export async function expressPropertyInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await propertiesService.expressInterest(req.params.id, req.user!.sub, req.body?.message);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
