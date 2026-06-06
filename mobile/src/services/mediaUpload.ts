// Service d'upload de médias — envoie les fichiers au backend (proxy → Supabase Storage)
// Fonctionne sur web (File/blob:) ET React Native natif (uri local)
import { apiClient } from './api/client';

export interface UploadedMedia {
  id: string;
  url: string;
  publicId: string | null;
  mediaType: 'photo' | 'video' | 'virtual_tour_360';
  isPrimary: boolean;
  sortOrder: number;
}

/**
 * Upload un seul fichier image vers le backend.
 * Sur web, on passe directement l'objet File du navigateur.
 * Sur React Native natif, on reconstruit le fichier depuis son URI local.
 */
async function uploadSingleMedia(
  propertyId: string,
  item: { uri: string; name?: string; file?: File | Blob },
  mediaType: 'photo' | 'video' | 'virtual_tour_360',
  isPrimary: boolean,
  sortOrder: number,
): Promise<UploadedMedia> {
  const form = new FormData();
  const isVideo = mediaType === 'video';

  if (item.file) {
    // Web — objet File fourni directement par expo-document-picker
    const defaultMime = isVideo ? 'video/mp4' : 'image/jpeg';
    const defaultName = isVideo ? 'video.mp4' : 'photo.jpg';
    const f = item.file instanceof File
      ? item.file
      : new File([item.file], item.name ?? defaultName, { type: defaultMime });
    form.append('file', f);
  } else if (typeof document !== 'undefined' && item.uri.startsWith('blob:')) {
    // Web — blob: URI : récupérer le Blob via fetch navigateur
    const blob = await fetch(item.uri).then((r) => r.blob());
    const defaultMime = isVideo ? 'video/mp4' : 'image/jpeg';
    const defaultName = isVideo ? 'video.mp4' : 'photo.jpg';
    form.append('file', new File([blob], item.name ?? defaultName, { type: blob.type || defaultMime }));
  } else {
    // React Native natif — FormData accepte { uri, name, type }
    const ext = item.uri.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg');
    const mime = isVideo ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    form.append('file', { uri: item.uri, name: item.name ?? `media.${ext}`, type: mime } as unknown as Blob);
  }

  form.append('mediaType', mediaType);
  form.append('isPrimary', String(isPrimary));
  form.append('sortOrder', String(sortOrder));

  const res = await apiClient.post(
    `/properties/${propertyId}/media/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data?.data ?? res.data;
}

/**
 * Upload un lot d'images pour une propriété.
 * Retourne { uploaded, failed } pour affichage à l'utilisateur.
 */
export async function uploadPropertyMedia(
  propertyId: string,
  images: { uri: string; name?: string; file?: File | Blob }[],
  options: {
    tourImages?: { uri: string; name?: string; file?: File | Blob }[];
    videoFiles?: { uri: string; name?: string; file?: File | Blob }[];
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<{ uploaded: number; failed: number; errors: string[] }> {
  const tour   = options.tourImages ?? [];
  const videos = options.videoFiles ?? [];
  const total  = images.length + tour.length + videos.length;
  let done = 0;
  let failed = 0;
  const errors: string[] = [];

  const persist = async (
    item: { uri: string; name?: string; file?: File | Blob },
    mediaType: 'photo' | 'video' | 'virtual_tour_360',
    isPrimary: boolean,
    sortOrder: number,
  ) => {
    try {
      await uploadSingleMedia(propertyId, item, mediaType, isPrimary, sortOrder);
    } catch (err: any) {
      failed += 1;
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erreur inconnue';
      errors.push(msg);
      console.error('[uploadPropertyMedia] échec upload', { item: item.name, err: msg });
    } finally {
      done += 1;
      options.onProgress?.(done, total);
    }
  };

  for (let i = 0; i < images.length; i++) {
    await persist(images[i], 'photo', i === 0, i);
  }
  for (let i = 0; i < videos.length; i++) {
    await persist(videos[i], 'video', false, images.length + i);
  }
  for (let i = 0; i < tour.length; i++) {
    await persist(tour[i], 'virtual_tour_360', false, images.length + videos.length + i);
  }

  return { uploaded: total - failed, failed, errors };
}
