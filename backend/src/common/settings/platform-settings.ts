// Chargeur du cache de configuration plateforme (platform_config → runtime-config).
//
// Lit les sections éditées par l'admin (subscriptions, boosts, grace, features) et
// les pousse dans le cache mémoire lu (de façon synchrone) par le code métier.
//
// Cadence : amorcé au démarrage (main.ts), rafraîchi périodiquement, et rechargé
// immédiatement après chaque sauvegarde admin (upsertConfig → reloadPlatformSettings).
import { prisma } from '../../database/prisma.service';
import { setRuntimeOverrides, type RuntimeOverrides } from './runtime-config';
import { logger } from '../utils/logger';

const CONFIG_KEYS = ['subscriptions', 'boosts', 'grace', 'features'] as const;

/**
 * Recharge le cache depuis la base. Best-effort : en cas d'erreur, on conserve le
 * cache précédent (le code métier retombe de toute façon sur les constantes).
 */
export async function reloadPlatformSettings(): Promise<void> {
  try {
    const rows = await prisma.platformConfig.findMany({
      where: { key: { in: CONFIG_KEYS as unknown as string[] } },
    });
    const next: RuntimeOverrides = {};
    for (const row of rows) {
      (next as Record<string, unknown>)[row.key] = row.value;
    }
    setRuntimeOverrides(next);
  } catch (err) {
    logger.warn('[platform-settings] Rechargement de la configuration échoué — cache conservé', err);
  }
}

/**
 * Amorce le cache au démarrage et programme un rafraîchissement périodique.
 * Le timer est `unref()` pour ne pas empêcher l'arrêt du process.
 */
export async function initPlatformSettings(refreshMs = 60_000): Promise<void> {
  await reloadPlatformSettings();
  const timer = setInterval(() => { void reloadPlatformSettings(); }, refreshMs);
  if (typeof timer.unref === 'function') timer.unref();
}
