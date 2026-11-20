// Événements de performance des annonces — vues de la fiche, clics depuis une liste
// de résultats, tentatives de réservation. Source de l'onglet « Statistiques » du pro.
//
// Règles de comptage :
//   • le propriétaire (et l'admin) qui consulte sa propre annonce n'est pas compté ;
//   • une même vue/un même clic d'un utilisateur connecté n'est compté qu'une fois
//     par minute (double chargement d'écran, retour arrière…) ;
//   • aucune donnée personnelle n'est stockée : seule une empreinte non réversible
//     (SHA-256 salée) du visiteur sert à écarter les doublons ;
//   • une vue incrémente aussi le compteur cumulé `properties.viewsCount`.
import { createHash } from 'crypto';
import type { PropertyEventType } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { logger } from '../../common/utils/logger';

const DEDUP_WINDOW_MS = 60_000;

function visitorKey(userId: string): string {
  return createHash('sha256').update(`primeo-stats:${userId}`).digest('hex').slice(0, 32);
}

export interface PropertyEventInput {
  propertyId: string;
  type: PropertyEventType;
  userId?: string | null;
  role?: string | null;
  source?: string | null;
}

export const propertyEventsService = {
  async record(params: PropertyEventInput): Promise<{ recorded: boolean }> {
    const { propertyId, type } = params;
    const userId = params.userId ?? null;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });
    if (!property) return { recorded: false };
    if (userId && (userId === property.ownerId || params.role === 'admin')) return { recorded: false };

    const key = userId ? visitorKey(userId) : null;
    if (key && type !== 'booking_attempt') {
      const recent = await prisma.propertyEvent.findFirst({
        where: { propertyId, type, visitorKey: key, createdAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) } },
        select: { id: true },
      });
      if (recent) return { recorded: false };
    }

    await prisma.propertyEvent.create({
      data: { propertyId, type, visitorKey: key, source: params.source?.slice(0, 30) ?? null },
    });
    if (type === 'view') {
      await prisma.property.update({ where: { id: propertyId }, data: { viewsCount: { increment: 1 } } });
    }
    return { recorded: true };
  },

  /** Variante « best-effort » : n'interrompt jamais le parcours appelant. */
  track(params: PropertyEventInput): void {
    propertyEventsService.record(params).catch((err: unknown) =>
      logger.warn(`Property event ${params.type} not recorded for ${params.propertyId}`, err),
    );
  },
};
