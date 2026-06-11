// Middleware mode maintenance — renvoie 503 sur toute l'API quand il est actif.
//
// Deux sources, combinées par OU logique :
//   1. Variable d'environnement MAINTENANCE_MODE=true (fixée au déploiement)
//   2. platform_config['maintenance_mode'] = { enabled, message, estimatedEnd }
//      (bascule à chaud via PUT /api/admin/maintenance, sans redéploiement)
//
// Réponses : JSON pour les clients API (mobile, vitrine) ; page HTML brandée
// (public/errors/maintenance.html) pour les navigateurs (Accept: text/html).
//
// Routes exemptées : santé, statut de maintenance (pour l'écran mobile/vitrine),
// tout l'espace admin (les admins doivent pouvoir gérer pendant la maintenance),
// la documentation API et les webhooks (les PSP rejouent mal les 503 prolongés).
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma.service';
import { env } from '../../config/env.config';
import { logger } from '../utils/logger';

export interface MaintenanceState {
  enabled: boolean;
  message: string;
  estimatedEnd: string | null; // ISO 8601 — heure estimée de retour
}

const DEFAULT_MESSAGE =
  'Primeo est en maintenance. Nous revenons très vite — merci de votre patience.';

const MAINTENANCE_PAGE = path.join(process.cwd(), 'public', 'errors', 'maintenance.html');

const EXEMPT_PREFIXES = [
  '/api/health',
  '/api/maintenance',
  '/api/admin',
  '/api-docs',
  '/api/webhooks',
];

// Cache 30 s : évite une requête DB par appel API tout en gardant une bascule rapide
const CACHE_TTL_MS = 30_000;
let cache: { state: MaintenanceState; fetchedAt: number } | null = null;

async function readDbState(): Promise<MaintenanceState> {
  try {
    const row = await prisma.platformConfig.findUnique({ where: { key: 'maintenance_mode' } });
    const value = (row?.value ?? {}) as Partial<MaintenanceState>;
    return {
      enabled: value.enabled === true,
      message: typeof value.message === 'string' && value.message.trim() ? value.message : DEFAULT_MESSAGE,
      estimatedEnd: typeof value.estimatedEnd === 'string' ? value.estimatedEnd : null,
    };
  } catch (err) {
    // En cas d'erreur DB, ne jamais bloquer le trafic à cause du middleware
    logger.warn('Maintenance: lecture platform_config impossible — mode considéré inactif', {
      error: (err as Error).message,
    });
    return { enabled: false, message: DEFAULT_MESSAGE, estimatedEnd: null };
  }
}

/** État effectif du mode maintenance (env OU base), avec cache 30 s. */
export async function getMaintenanceState(forceRefresh = false): Promise<MaintenanceState> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.state;
  }
  const db = await readDbState();
  const state: MaintenanceState = {
    enabled: env.MAINTENANCE_MODE || db.enabled,
    message: db.message,
    estimatedEnd: db.estimatedEnd,
  };
  cache = { state, fetchedAt: Date.now() };
  return state;
}

/** Invalide le cache (appelé par l'endpoint admin après une bascule). */
export function invalidateMaintenanceCache(): void {
  cache = null;
}

export async function maintenanceGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (EXEMPT_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`)) || req.path === '/') {
    return next();
  }

  const state = await getMaintenanceState();
  if (!state.enabled) return next();

  // Navigateur → page HTML brandée ; client API → contrat JSON
  if (req.headers?.accept?.includes('text/html')) {
    res.status(503).sendFile(MAINTENANCE_PAGE, (err) => {
      if (err) {
        res.status(503).json({ error: 'maintenance', message: state.message, estimatedEnd: state.estimatedEnd });
      }
    });
    return;
  }

  res.status(503).json({
    error: 'maintenance',
    message: state.message,
    estimatedEnd: state.estimatedEnd,
  });
}
