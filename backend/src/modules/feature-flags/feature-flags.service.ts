// Service feature flags — lecture/écriture des drapeaux de fonctionnalité avec cache mémoire
import { prisma } from '../../database/prisma.service';
import { logger } from '../../common/utils/logger';

interface FlagPublic {
  key: string;
  enabled: boolean;
}

interface FlagFull {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// Cache mémoire pour l'endpoint public (évite une requête DB à chaque appel mobile)
let publicCache: { data: FlagPublic[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 secondes

function invalidateCache(): void {
  publicCache = null;
}

export const featureFlagsService = {
  // Tous les flags (admin uniquement)
  async getAll(): Promise<FlagFull[]> {
    return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  },

  // Flags publics pour mobile/frontend, avec cache 60s
  async getPublic(): Promise<FlagPublic[]> {
    if (publicCache && Date.now() < publicCache.expiresAt) {
      return publicCache.data;
    }

    const flags = await prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
      orderBy: { key: 'asc' },
    });

    publicCache = { data: flags, expiresAt: Date.now() + CACHE_TTL_MS };
    return flags;
  },

  // Créer ou mettre à jour un flag
  async upsert(
    key: string,
    enabled: boolean,
    description: string | undefined,
    adminId: string,
  ): Promise<FlagFull> {

    const flag = await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description: description ?? null, updatedBy: adminId },
      update: {
        enabled,
        ...(description !== undefined ? { description } : {}),
        updatedBy: adminId,
      },
    });

    invalidateCache();

    logger.info(
      `Feature flag "${key}" → ${enabled ? 'activé' : 'désactivé'} par admin ${adminId}`,
    );

    return flag;
  },

  // Supprimer un flag
  async delete(key: string, adminId: string): Promise<void> {
    await prisma.featureFlag.delete({ where: { key } });
    invalidateCache();
    logger.info(`Feature flag "${key}" supprimé par admin ${adminId}`);
  },
};
