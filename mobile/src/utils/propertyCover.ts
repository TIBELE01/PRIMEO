// Image de couverture d'un bien pour les listes (cartes, favoris, réservations, carte).
// Un bien a un seul type de média : photos, vidéo OU visite 3D. Sans photo, la
// couverture vient de la vidéo (image extraite par Cloudinary) ou de la 1re pièce
// 360° (vignette recadrée) — jamais d'URL .mp4 dans un composant Image, jamais de carte vide.

const VIDEO_EXT = /\.(mp4|mov|m4v|avi|webm)(\?.*)?$/i;

type MediaLike = { url?: string | null; isPrimary?: boolean; mediaType?: string | null };
export type CoverSource = {
  mainImageUrl?: string | null;
  coverImage?: string | null;
  images?: MediaLike[] | null;
  media?: MediaLike[] | null;
  video?: { posterUrl?: string | null } | null;
  virtualTour?: { panoramas?: Array<{ imageUrl?: string | null }> } | null;
  scenes3d?: Array<{ url?: string | null }> | null;
};

const isVideo = (m: MediaLike) => m.mediaType === 'video' || (!!m.url && VIDEO_EXT.test(m.url));

function insertCloudinary(url: string, kind: 'image' | 'video', transform: string): string | null {
  if (!url.includes('res.cloudinary.com')) return null;
  const marker = `/${kind}/upload/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return `${url.slice(0, i + marker.length)}${transform}/${url.slice(i + marker.length)}`;
}

/** Image extraite d'une vidéo Cloudinary (1 s, 900×600). */
export function videoPosterFromUrl(url: string): string | null {
  const t = insertCloudinary(url, 'video', 'so_1,c_fill,g_auto,w_900,h_600,q_auto');
  return t ? t.replace(VIDEO_EXT, '.jpg') : null;
}

/** Vignette centrée d'un panorama 360° Cloudinary (900×600). */
export function panoramaThumbFromUrl(url: string): string {
  if (/\/image\/upload\/c_fill,g_center,w_900/.test(url)) return url;
  return insertCloudinary(url, 'image', 'c_fill,g_center,w_900,h_600,q_auto,f_auto') ?? url;
}

export function propertyCoverUrl(p: CoverSource | null | undefined): string | undefined {
  if (!p) return undefined;
  const main = p.mainImageUrl ?? p.coverImage;
  if (main && !VIDEO_EXT.test(main)) return main;

  const media = [...(p.images ?? []), ...(p.media ?? [])].filter((m): m is MediaLike & { url: string } => !!m?.url);
  const photos = media.filter((m) => !isVideo(m));
  const photo = photos.find((m) => m.isPrimary) ?? photos[0];
  if (photo) return photo.url;

  if (p.video?.posterUrl) return p.video.posterUrl;
  const video = media.find(isVideo);
  if (video) { const poster = videoPosterFromUrl(video.url); if (poster) return poster; }

  const pano = p.virtualTour?.panoramas?.[0]?.imageUrl ?? p.scenes3d?.[0]?.url;
  if (pano) return panoramaThumbFromUrl(pano);
  return undefined;
}
