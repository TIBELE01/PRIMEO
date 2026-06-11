// Utilitaires visite 3D — résolution adaptative des panoramas et bornes caméra.
// Extraits du viewer pour être testables unitairement.

export const MIN_FOV = 35;  // zoom max (pincement écarté)
export const MAX_FOV = 95;  // dézoom max
export const DEFAULT_FOV = 75;

/** Borne le champ de vision de la caméra (zoom pinch). */
export function clampFov(fov: number): number {
  return Math.max(MIN_FOV, Math.min(MAX_FOV, fov));
}

/**
 * Largeur cible de la texture panoramique selon la largeur écran en pixels
 * physiques. Un panorama 360° couvre 4× le champ visible — mais sur mobile,
 * 2048px suffisent en dessous de ~1200px d'écran (8 Mo GPU au lieu de 32 Mo).
 */
export function panoramaTargetWidth(screenPx: number): 2048 | 4096 {
  return screenPx > 1200 ? 4096 : 2048;
}

/**
 * Réécrit une URL Supabase Storage publique vers l'endpoint de transformation
 * d'images (redimensionnement serveur + WebP automatique selon l'Accept header).
 * Les URLs non-Supabase sont retournées telles quelles.
 *
 * https://<proj>.supabase.co/storage/v1/object/public/bucket/path.jpg
 *   → https://<proj>.supabase.co/storage/v1/render/image/public/bucket/path.jpg?width=2048&quality=80
 */
export function optimizePanoramaUrl(url: string, targetWidth: number): string {
  if (!url || typeof url !== 'string') return url;
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const base = url.slice(0, idx);
  const path = url.slice(idx + marker.length);
  return `${base}/storage/v1/render/image/public/${path}?width=${targetWidth}&quality=80`;
}
