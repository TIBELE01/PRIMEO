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

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * Réécrit l'URL d'un panorama pour que le serveur d'images livre une texture
 * déjà redimensionnée (jamais plus large que `targetWidth`) et compressée :
 *  - Cloudinary : insertion de `c_limit,w_<w>,q_auto:good,f_jpg` (JPEG progressif
 *    universellement décodable par les WebView iOS/Android, poids ÷5 à ÷10) ;
 *  - Supabase Storage : endpoint `render/image` avec width/quality.
 * Évite d'envoyer au GPU des textures de 8K/16K qui dépassent MAX_TEXTURE_SIZE
 * (écran noir ou crash WebGL sur les téléphones d'entrée de gamme).
 * Les autres URLs sont retournées telles quelles.
 */
export function optimizePanoramaUrl(url: string, targetWidth: number): string {
  if (!url || typeof url !== 'string') return url;
  const cld = CLOUDINARY_UPLOAD.exec(url);
  if (cld) {
    const rest = cld[2] ?? '';
    if (/(^|\/)c_limit,w_\d+/.test(rest)) return url; // déjà optimisée
    return `${cld[1]}c_limit,w_${targetWidth},q_auto:good,f_jpg/${rest}`;
  }
  const marker = '/storage/v1/object/public/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const base = url.slice(0, idx);
  const path = url.slice(idx + marker.length);
  return `${base}/storage/v1/render/image/public/${path}?width=${targetWidth}&quality=80`;
}

/** Vignette légère d'un panorama (aperçu fiche bien) — ~1200 px au lieu de 8K. */
export function panoramaPreviewUrl(url: string | undefined | null): string {
  return url ? optimizePanoramaUrl(url, 1200) : '';
}
