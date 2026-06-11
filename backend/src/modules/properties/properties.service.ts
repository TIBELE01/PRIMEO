// Properties service — CRUD, search, geo, media signing, admin moderation
import * as crypto from 'crypto';
import { prisma } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../common/handlers/http-error.handler';
import { geocodeAddress } from '../../common/utils/maps';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import { searchService } from './services/search.service';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  SearchPropertiesInput,
  AddMediaInput,
} from './dto/property.dto';

/**
 * Normalise la sortie d'une propriété pour le client : expose `images` (alias de
 * la relation `media`) et `mainImageUrl` (URL de l'image principale) afin que tous
 * les écrans — qui lisent indifféremment `media`, `images` ou `mainImageUrl` —
 * affichent correctement les photos. Source unique de vérité : la relation `media`.
 */
export function serializeProperty<T extends Record<string, unknown>>(property: T): T {
  const media = (property as { media?: Array<{ url: string; isPrimary?: boolean }> }).media ?? [];
  const primary = media.find((m) => m.isPrimary) ?? media[0];
  return {
    ...property,
    images: media,
    mainImageUrl: primary?.url ?? null,
    virtualTour: buildVirtualTour(property),
  };
}

/**
 * Construit l'objet virtualTour attendu par le mobile à partir des scènes 3D
 * (table property_3d_scenes). Chaque scène devient un panorama nommé ; le viewer
 * mobile (VirtualTourScreen) gère la navigation entre pièces.
 */
function buildVirtualTour(property: Record<string, unknown>): { available: boolean; panoramas: Array<{ id: string; roomName: string; imageUrl: string; hotspots: never[] }> } | undefined {
  const scenes = (property as { scenes3d?: Array<{ id: string; roomName: string; url: string }> }).scenes3d;
  if (!scenes) return undefined; // relation non chargée (listes) — le flag hasVirtualTour suffit
  const panoramas = scenes.map((s) => ({
    id: s.id,
    roomName: s.roomName,
    imageUrl: s.url,
    hotspots: [] as never[],
  }));
  return { available: panoramas.length > 0, panoramas };
}

function serializeList<T extends Record<string, unknown>>(result: {
  data: T[];
  [k: string]: unknown;
}): typeof result {
  return { ...result, data: result.data.map((p) => serializeProperty(p)) };
}

export const propertiesService = {
  async search(params: SearchPropertiesInput) {
    const result = await searchService.search(params);
    return serializeList(result as { data: Record<string, unknown>[]; total: number; page: number; limit: number; pages: number });
  },

  async getById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, subscription: { select: { planType: true } } } },
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        scenes3d: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { status: 'published' },
          take: 10,
          orderBy: { publishedAt: 'desc' },
          include: {
            booking: {
              select: {
                client: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    // Fire-and-forget view count increment
    prisma.property
      .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => {});

    const planType = (property as any).owner?.subscription?.planType ?? '';
    const badgeType = planType === 'entreprise' ? 'premium' : planType === 'business' ? 'verified' : null;
    return serializeProperty({ ...(property as Record<string, unknown>), badgeType });
  },

  async create(ownerId: string, input: CreatePropertyInput) {
    // Ensure a professional profile exists — auto-create with pending KYC if missing.
    let profile = await prisma.professionalProfile.findUnique({ where: { userId: ownerId } });
    if (!profile) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { firstName: true, lastName: true } });
      const businessName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Professionnel';
      profile = await prisma.professionalProfile.create({
        data: { userId: ownerId, businessName, verificationStatus: 'pending' },
      });
    }

    // Vérification de la limite de publications selon la formule d'abonnement
    const user = await prisma.user.findUnique({ where: { id: ownerId }, select: { accountType: true } });
    const sub  = await prisma.subscription.findUnique({ where: { userId: ownerId } });
    if (sub) {
      const { getPublicationLimit, publicationLabel } = await import('../../common/constants/subscription-plans');
      const limit  = getPublicationLimit(sub.planType, user?.accountType ?? '');
      // Compte les publications actives (hors archives et rejets)
      const active = await prisma.property.count({
        where: {
          ownerId,
          status: { in: ['draft', 'pending', 'active', 'suspended'] },
        },
      });
      if (active >= limit) {
        const label = publicationLabel(user?.accountType ?? '');
        throw new HttpError(403, `Limite de ${limit} ${label}(s) atteinte pour votre formule ${sub.planType}. Passez à une formule supérieure pour en ajouter davantage.`);
      }
    }

    // Geocode if coordinates not provided
    let { latitude, longitude } = input;
    if (!latitude || !longitude) {
      const addressStr = [input.street, input.city, "Côte d'Ivoire"].filter(Boolean).join(', ');
      const geo = await geocodeAddress(addressStr);
      if (geo) {
        latitude = geo.coordinates.lat;
        longitude = geo.coordinates.lon;
      }
    }

    // Pour les hôtels : dériver pricePerNight depuis le type de chambre le moins cher
    let pricePerNight = input.pricePerNight;
    if (input.propertyType === 'hotel' && input.roomTypes?.length) {
      pricePerNight = Math.min(...input.roomTypes.map((rt) => rt.pricePerNight));
    }

    return prisma.property.create({
      data: {
        ownerId,
        title: input.title,
        propertyType: input.propertyType,
        description: input.description,
        rooms: input.rooms,
        bedrooms: input.bedrooms,
        beds: input.beds,
        bathrooms: input.bathrooms,
        surface: input.surface,
        capacity: input.capacity,
        pricePerNight,
        pricePerMonth: input.pricePerMonth,
        priceSale: input.priceSale,
        street: input.street,
        city: input.city,
        latitude,
        longitude,
        amenities: input.amenities,
        paymentOptions: input.paymentOptions,
        rules:        input.rules        as Prisma.InputJsonValue | undefined,
        cuisineType:  input.cuisineType,
        openingHours: input.openingHours as Prisma.InputJsonValue | undefined,
        // Immobilier — champs spécifiques
        floor:            input.floor,
        yearBuilt:        input.yearBuilt,
        availabilityDate: input.availabilityDate ? new Date(input.availabilityDate) : undefined,
        diagnostics:      input.diagnostics as Prisma.InputJsonValue | undefined,
        // Hôtel — types de chambres
        roomTypes: input.roomTypes as Prisma.InputJsonValue | undefined,
        status: 'pending', // en attente de validation admin
      },
    });
  },

  async update(id: string, userId: string, input: UpdatePropertyInput) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });
    if (property.ownerId !== userId && requester?.accountType !== 'admin') {
      throw new HttpError(403, 'Accès non autorisé');
    }

    // Re-geocode when address fields change
    let latitude = input.latitude ?? property.latitude ?? undefined;
    let longitude = input.longitude ?? property.longitude ?? undefined;
    if (input.street !== undefined || input.city !== undefined) {
      const street = input.street ?? property.street ?? '';
      const city = input.city ?? property.city;
      const geo = await geocodeAddress(`${street}, ${city}, Côte d'Ivoire`);
      if (geo) {
        latitude = geo.coordinates.lat;
        longitude = geo.coordinates.lon;
      }
    }

    // Pour les hôtels : re-dériver pricePerNight depuis les types de chambres si fournis
    let updatedPricePerNight = input.pricePerNight;
    if (input.roomTypes?.length) {
      updatedPricePerNight = Math.min(...input.roomTypes.map((rt) => rt.pricePerNight));
    }

    return prisma.property.update({
      where: { id },
      data: {
        ...input,
        latitude,
        longitude,
        rules:        input.rules        as Prisma.InputJsonValue | undefined,
        openingHours: input.openingHours as Prisma.InputJsonValue | undefined,
        diagnostics:  input.diagnostics  as Prisma.InputJsonValue | undefined,
        roomTypes:    input.roomTypes    as Prisma.InputJsonValue | undefined,
        availabilityDate: input.availabilityDate ? new Date(input.availabilityDate) : undefined,
        ...(updatedPricePerNight !== undefined ? { pricePerNight: updatedPricePerNight } : {}),
        // Owner edits on an active OR rejected listing re-submit for admin review
        ...(property.ownerId === userId && (property.status === 'active' || property.status === 'rejected')
          ? { status: 'pending' }
          : {}),
      },
    });
  },

  async delete(id: string, userId: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');

    const requester = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });
    if (property.ownerId !== userId && requester?.accountType !== 'admin') {
      throw new HttpError(403, 'Accès non autorisé');
    }

    const activeBookings = await prisma.booking.count({
      where: { propertyId: id, status: { in: ['confirmed', 'pending_payment'] } },
    });
    if (activeBookings > 0) {
      throw new HttpError(409, 'Impossible de supprimer une propriété avec des réservations actives');
    }

    // Logical delete only
    await prisma.property.update({ where: { id }, data: { status: 'archived' } });
  },

  async publish(id: string, userId: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');
    // Autorise la soumission depuis brouillon, rejeté ou suspendu
    const allowedStatuses = ['draft', 'rejected', 'suspended'];
    if (!allowedStatuses.includes(property.status)) {
      throw new HttpError(400, 'Cette annonce ne peut pas être soumise à validation dans son état actuel');
    }
    return prisma.property.update({ where: { id }, data: { status: 'pending' } });
  },

  async suspend(id: string, userId: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');
    if (property.status !== 'active') {
      throw new HttpError(400, 'Seules les annonces actives peuvent être suspendues');
    }
    return prisma.property.update({ where: { id }, data: { status: 'suspended' } });
  },

  async getByOwner(ownerId: string, query: { page?: string; limit?: string; status?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const where = { ownerId, ...(query.status ? { status: query.status as never } : {}) };
    const [rows, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
      }),
      prisma.property.count({ where }),
    ]);
    const data = rows.map(p => ({
      ...p,
      mainImageUrl: p.media?.[0]?.url ?? null,
    }));
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // Garantit qu'un restaurateur possède toujours un établissement.
  // Un compte restaurant = un restaurant : si aucun n'existe, on en
  // provisionne un brouillon automatiquement à partir du profil pro.
  // Renvoie l'établissement existant ou nouvellement créé.
  async ensureRestaurant(ownerId: string) {
    const existing = await prisma.property.findFirst({
      where: { ownerId, propertyType: 'restaurant' },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    // Récupère le nom commercial pour titrer l'établissement
    const [profile, user] = await Promise.all([
      prisma.professionalProfile.findUnique({ where: { userId: ownerId }, select: { businessName: true } }),
      prisma.user.findUnique({ where: { id: ownerId }, select: { firstName: true, lastName: true } }),
    ]);
    const title =
      profile?.businessName?.trim() ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      'Mon restaurant';

    // Crée un établissement brouillon que le restaurateur pourra compléter
    return prisma.property.create({
      data: {
        ownerId,
        title,
        propertyType: 'restaurant',
        description: 'Complétez la description de votre établissement.',
        city: 'Abidjan',
        capacity: 20,
        paymentOptions: ['zero_online'],
        status: 'draft',
      },
    });
  },

  // ── Media management ────────────────────────────────────────────────────────

  async addMedia(propertyId: string, userId: string, input: AddMediaInput) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');

    const count = await prisma.propertyMedia.count({ where: { propertyId } });
    if (count >= 20) throw new HttpError(400, 'Limite de 20 médias par propriété atteinte');

    if (input.isPrimary) {
      await prisma.propertyMedia.updateMany({
        where: { propertyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return prisma.propertyMedia.create({
      data: { propertyId, ...input, mediaType: input.mediaType as never },
    });
  },

  async deleteMedia(propertyId: string, mediaId: string, userId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');

    const media = await prisma.propertyMedia.findFirst({ where: { id: mediaId, propertyId } });
    if (!media) throw new HttpError(404, 'Média introuvable');

    await prisma.propertyMedia.delete({ where: { id: mediaId } });
  },

  // ── Upload proxy → Supabase Storage ────────────────────────────────────────

  async uploadAndSaveMedia(
    propertyId: string,
    userId: string,
    file: Express.Multer.File,
    opts: { mediaType: 'photo' | 'video' | 'virtual_tour_360'; isPrimary: boolean; sortOrder: number },
  ) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');

    const count = await prisma.propertyMedia.count({ where: { propertyId } });
    if (count >= 20) throw new HttpError(400, 'Limite de 20 médias par propriété atteinte');

    const { supabaseAdmin } = await import('../../config/supabase.config');
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${propertyId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('property-media')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      logger.error('Échec upload Supabase Storage', uploadError);
      throw new HttpError(502, 'Échec du stockage de l\'image. Réessayez.');
    }

    const { data: urlData } = supabaseAdmin.storage.from('property-media').getPublicUrl(path);
    const url = urlData.publicUrl;

    // Écritures DB atomiques : si l'une échoue, aucune flag isPrimary n'est
    // perdue et aucune ligne partielle n'est créée. Le fichier déjà stocké est
    // supprimé du bucket pour ne pas laisser d'orphelin.
    try {
      return await prisma.$transaction(async (tx) => {
        if (opts.isPrimary) {
          await tx.propertyMedia.updateMany({ where: { propertyId, isPrimary: true }, data: { isPrimary: false } });
        }
        return tx.propertyMedia.create({
          data: { propertyId, url, publicId: path, mediaType: opts.mediaType as never, isPrimary: opts.isPrimary, sortOrder: opts.sortOrder },
        });
      });
    } catch (dbError) {
      // Rollback du stockage : le fichier vient d'être uploadé, on le retire.
      await supabaseAdmin.storage.from('property-media').remove([path]).catch((removeErr) => {
        logger.error('Échec suppression média orphelin après erreur DB', removeErr);
      });
      logger.error('Échec enregistrement PropertyMedia — média retiré du stockage', dbError);
      throw new HttpError(500, 'Échec de l\'enregistrement de l\'image. Réessayez.');
    }
  },

  // ── Visite 3D : scènes panoramiques 360° (formule Entreprise) ──────────────

  async list3dScenes(propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    return prisma.property3dScene.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async upload3dScene(
    propertyId: string,
    userId: string,
    file: Express.Multer.File,
    opts: { roomName: string; sortOrder: number },
  ) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');

    const count = await prisma.property3dScene.count({ where: { propertyId } });
    if (count >= 10) throw new HttpError(400, 'Limite de 10 photos 360° par propriété atteinte');

    const { supabaseAdmin } = await import('../../config/supabase.config');
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${propertyId}/3d/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('property-media')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      logger.error('Échec upload scène 3D Supabase Storage', uploadError);
      throw new HttpError(502, 'Échec du stockage de la photo 360°. Réessayez.');
    }

    const { data: urlData } = supabaseAdmin.storage.from('property-media').getPublicUrl(path);

    try {
      const scene = await prisma.property3dScene.create({
        data: { propertyId, roomName: opts.roomName, url: urlData.publicUrl, publicId: path, sortOrder: opts.sortOrder },
      });
      // Active le flag de visite 3D sur la propriété (idempotent)
      if (!property.hasVirtualTour) {
        await prisma.property.update({ where: { id: propertyId }, data: { hasVirtualTour: true } }).catch(() => {});
      }
      return scene;
    } catch (dbError) {
      await supabaseAdmin.storage.from('property-media').remove([path]).catch((removeErr) => {
        logger.error('Échec suppression scène 3D orpheline après erreur DB', removeErr);
      });
      logger.error('Échec enregistrement Property3dScene — fichier retiré du stockage', dbError);
      throw new HttpError(500, 'Échec de l\'enregistrement de la photo 360°. Réessayez.');
    }
  },

  async delete3dScene(propertyId: string, sceneId: string, userId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== userId) throw new HttpError(403, 'Accès non autorisé');

    const scene = await prisma.property3dScene.findFirst({ where: { id: sceneId, propertyId } });
    if (!scene) throw new HttpError(404, 'Scène 3D introuvable');

    await prisma.property3dScene.delete({ where: { id: sceneId } });

    // Nettoyage du fichier dans le bucket (best effort)
    if (scene.publicId) {
      const { supabaseAdmin } = await import('../../config/supabase.config');
      await supabaseAdmin.storage.from('property-media').remove([scene.publicId]).catch((err) => {
        logger.error('Échec suppression fichier scène 3D du bucket', err);
      });
    }

    // Désactive le flag si plus aucune scène
    const remaining = await prisma.property3dScene.count({ where: { propertyId } });
    if (remaining === 0) {
      await prisma.property.update({ where: { id: propertyId }, data: { hasVirtualTour: false } }).catch(() => {});
    }
  },

  // ── Cloudinary signed upload (optionnel si CLOUDINARY_URL est configuré) ──

  signUpload(folderKey: string): {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  } {
    const { apiSecret, apiKey, cloudName } = cloudinaryConfig;
    if (!apiSecret || !apiKey || !cloudName) {
      throw new HttpError(503, 'Service de stockage non configuré');
    }

    const folder =
      cloudinaryConfig.folders[folderKey as keyof typeof cloudinaryConfig.folders] ??
      cloudinaryConfig.folders.properties;

    const timestamp = Math.floor(Date.now() / 1000);
    // Params sorted alphabetically as required by Cloudinary signature spec
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

    return { signature, timestamp, apiKey, cloudName, folder };
  },

  // ── Admin moderation ────────────────────────────────────────────────────────

  async approve(id: string, adminId: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.status !== 'pending') {
      throw new HttpError(400, 'Seules les annonces en attente peuvent être approuvées');
    }

    await prisma.property.update({ where: { id }, data: { status: 'active' } });

    // Audit non bloquant — ne pas faire échouer l'approbation si l'audit échoue
    prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin.approve_property',
        targetType: 'property',
        targetId: id,
        description: `Annonce ${id} approuvée`,
      },
    }).catch((err) => logger.warn('Audit approve_property non créé', err));
  },

  async reject(id: string, adminId: string, reason: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.status !== 'pending') {
      throw new HttpError(400, 'Seules les annonces en attente peuvent être rejetées');
    }

    await prisma.property.update({ where: { id }, data: { status: 'rejected' } });

    // Audit non bloquant
    prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin.reject_property',
        targetType: 'property',
        targetId: id,
        description: `Annonce ${id} rejetée — motif: ${reason}`,
      },
    }).catch((err) => logger.warn('Audit reject_property non créé', err));
  },

  // Immobilier : un client exprime son intérêt pour un bien.
  // Aucune réservation/paiement — on notifie le responsable (in-app + email + push)
  // pour qu'il recontacte le client via la messagerie sécurisée.
  async expressInterest(
    propertyId: string,
    clientId: string,
    message?: string,
  ): Promise<{ message: string }> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, ownerId: true, propertyType: true, status: true },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    // Bloquer uniquement les statuts explicitement invalides ; un bien en review reste accessible à l'intérêt
    const blockedStatuses = ['rejected', 'cancelled', 'deleted'];
    if (blockedStatuses.includes(property.status)) {
      throw new HttpError(400, 'Ce bien n\'est pas disponible actuellement');
    }
    if (property.ownerId === clientId) {
      throw new HttpError(400, 'Vous ne pouvez pas exprimer votre intérêt pour votre propre bien');
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { firstName: true, lastName: true, phone: true, email: true },
    });
    if (!client) throw new HttpError(404, 'Utilisateur introuvable');

    // Enregistrer une trace d'audit (pas de modèle Lead dédié pour l'instant)
    await prisma.auditLog.create({
      data: {
        userId: clientId,
        action: 'client.express_interest',
        targetType: 'property',
        targetId: propertyId,
        description: `Intérêt exprimé pour « ${property.title} »${message ? ` — ${message}` : ''}`,
      },
    }).catch((err) => logger.warn('Audit intérêt immobilier échoué', err));

    // Notifier le responsable du bien (in-app + email + push selon préférences)
    await notificationsService.notify({
      type: 'property_interest',
      recipientId: property.ownerId,
      data: {
        propertyId,
        propertyTitle: property.title,
        senderName: `${client.firstName} ${client.lastName}`.trim(),
        contactPhone: client.phone ?? undefined,
        contactEmail: client.email,
        messagePreview: message,
      },
    });

    return { message: 'Votre intérêt a bien été transmis au responsable du bien.' };
  },

  // Statistiques détaillées d'une annonce (vues, réservations, revenus)
  async getStats(id: string, ownerId: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        title: true,
        viewsCount: true,
        bookingsCount: true,
        rating: true,
        reviewCount: true,
        isBoosted: true,
        boostExpiresAt: true,
        bookings: {
          where: { status: { in: ['confirmed', 'completed'] as never[] } },
          select: { totalAmount: true, commissionAmount: true },
        },
      },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== ownerId) throw new HttpError(403, 'Accès refusé');

    const totalRevenue = property.bookings.reduce((s, b) => s + b.totalAmount, 0);
    const totalCommissions = property.bookings.reduce((s, b) => s + b.commissionAmount, 0);

    return {
      id: property.id,
      title: property.title,
      viewsCount: property.viewsCount,
      bookingsCount: property.bookingsCount,
      rating: property.rating,
      reviewCount: property.reviewCount,
      isBoosted: property.isBoosted,
      boostExpiresAt: property.boostExpiresAt,
      totalRevenue,
      netRevenue: totalRevenue - totalCommissions,
    };
  },
};
