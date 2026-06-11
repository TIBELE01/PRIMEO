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
    tourImages?: { uri: string; name?: string; file?: File | Blob; roomName?: string }[];
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
  // Photos 360° → endpoint dédié /3d-scenes (table property_3d_scenes, viewer 3D)
  for (let i = 0; i < tour.length; i++) {
    try {
      await uploadScene3d(propertyId, tour[i], tour[i].roomName ?? `Pièce ${i + 1}`, i);
    } catch (err: any) {
      failed += 1;
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erreur inconnue';
      errors.push(msg);
      console.error('[uploadPropertyMedia] échec upload scène 3D', { item: tour[i].name, err: msg });
    } finally {
      done += 1;
      options.onProgress?.(done, total);
    }
  }

  return { uploaded: total - failed, failed, errors };
}

export interface Scene3d {
  id: string;
  propertyId: string;
  roomName: string;
  url: string;
  publicId: string | null;
  sortOrder: number;
}

/**
 * Upload une photo panoramique 360° (équirectangulaire) vers l'endpoint dédié.
 * Réservé à la formule Entreprise — le backend renvoie 403 sinon.
 */
export async function uploadScene3d(
  propertyId: string,
  item: { uri: string; name?: string; file?: File | Blob },
  roomName: string,
  sortOrder: number,
): Promise<Scene3d> {
  const form = new FormData();

  if (item.file) {
    const f = item.file instanceof File
      ? item.file
      : new File([item.file], item.name ?? 'panorama.jpg', { type: 'image/jpeg' });
    form.append('file', f);
  } else if (typeof document !== 'undefined' && item.uri.startsWith('blob:')) {
    const blob = await fetch(item.uri).then((r) => r.blob());
    form.append('file', new File([blob], item.name ?? 'panorama.jpg', { type: blob.type || 'image/jpeg' }));
  } else {
    const ext = item.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    form.append('file', { uri: item.uri, name: item.name ?? `panorama.${ext}`, type: mime } as unknown as Blob);
  }

  form.append('roomName', roomName);
  form.append('sortOrder', String(sortOrder));

  const res = await apiClient.post(
    `/properties/${propertyId}/3d-scenes`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data?.data ?? res.data;
}

/** Liste les scènes 3D d'une propriété. */
export async function listScenes3d(propertyId: string): Promise<Scene3d[]> {
  const res = await apiClient.get(`/properties/${propertyId}/3d-scenes`);
  return res.data?.data ?? res.data ?? [];
}

/** Supprime une scène 3D (propriétaire uniquement). */
export async function deleteScene3d(propertyId: string, sceneId: string): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}/3d-scenes/${sceneId}`);
}
