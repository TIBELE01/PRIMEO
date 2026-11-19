// URLs dérivées Cloudinary des médias d'un bien (vignettes, poster vidéo, lecture
// optimisée). Fonctions pures, partagées entre l'API publique et l'admin.

const CLD = 'res.cloudinary.com';

/** Transformation de lecture mobile : 1280 px max, H.264 (lisible iOS/Android/web), qualité auto. */
export const VIDEO_PLAYBACK_TRANSFORM = 'c_limit,w_1280,q_auto,vc_h264';

function insertTransform(url: string, kind: 'image' | 'video', transform: string): string | null {
  if (!url || !url.includes(CLD)) return null;
  const marker = `/${kind}/upload/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return `${url.slice(0, i + marker.length)}${transform}/${url.slice(i + marker.length)}`;
}

/** Vignette d'un panorama Cloudinary : centre de l'image, 900×600, qualité/format auto. */
export function panoramaCoverUrl(url: string): string {
  return insertTransform(url, 'image', 'c_fill,g_center,w_900,h_600,q_auto,f_auto') ?? url;
}

/** Image d'aperçu (poster) d'une vidéo Cloudinary : image extraite à 1 s, 900×600, JPEG. */
export function videoPosterUrl(url: string): string | null {
  const t = insertTransform(url, 'video', 'so_1,c_fill,g_auto,w_900,h_600,q_auto');
  return t ? t.replace(/\.(mp4|mov|avi|m4v|webm)(\?.*)?$/i, '.jpg') : null;
}

/** URL de lecture allégée (1280 px, H.264, MP4) — générée en tâche de fond dès l'upload. */
export function videoPlaybackUrl(url: string): string {
  const t = insertTransform(url, 'video', VIDEO_PLAYBACK_TRANSFORM);
  return t ? t.replace(/\.(mov|avi|m4v|webm)(\?.*)?$/i, '.mp4') : url;
}
