// Cloudinary direct upload helper.
// Flow: the backend signs the upload params (GET /properties/media/sign),
// the client uploads the local file straight to Cloudinary, then the resulting
// URL + publicId is persisted via POST /properties/:id/media.
import { propertiesApi } from './api/endpoints/properties';

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface CloudinaryResult {
  url: string;
  publicId: string;
}

/** Guess a sensible mime type + filename for a local image URI. */
function fileMeta(uri: string, fallbackName: string): { name: string; type: string } {
  const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
  const mime = safeExt === 'jpg' ? 'jpeg' : safeExt;
  return { name: fallbackName || `photo.${safeExt}`, type: `image/${mime}` };
}

/**
 * Upload a single local file URI to Cloudinary using server-signed params.
 * Returns the secure URL and the publicId needed to persist / later delete it.
 *
 * @param fileObj - Objet File/Blob natif du navigateur (fourni par expo-document-picker
 *                  sur web). Prioritaire sur l'URI quand disponible.
 */
export async function uploadToCloudinary(
  uri: string,
  fileName: string,
  folderKey = 'properties',
  fileObj?: File | Blob,
): Promise<CloudinaryResult> {
  // 1. Ask the backend for a signature (keeps the API secret server-side)
  const signRes = await propertiesApi.signMediaUpload(folderKey);
  const params: SignedUploadParams = signRes.data?.data ?? signRes.data;
  const { signature, timestamp, apiKey, cloudName, folder } = params;

  // 2. Construire la pièce jointe selon l'environnement d'exécution
  const { name, type } = fileMeta(uri, fileName);
  const form = new FormData();

  if (fileObj) {
    // Web — expo-document-picker fournit un objet File directement
    const webFile = fileObj instanceof File ? fileObj : new File([fileObj], name, { type });
    form.append('file', webFile);
  } else if (typeof document !== 'undefined' && uri.startsWith('blob:')) {
    // Web — URI blob: (fallback) : récupérer le Blob via fetch navigateur
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('file', new File([blob], name, { type: blob.type || type }));
  } else {
    // React Native natif : FormData accepte { uri, name, type } comme fichier
    form.append('file', { uri, name, type } as unknown as Blob);
  }

  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Échec de l'upload Cloudinary (${res.status}) ${detail}`);
  }
  const json = await res.json();
  return { url: json.secure_url ?? json.url, publicId: json.public_id };
}

export interface UploadedMedia extends CloudinaryResult {
  mediaType: 'photo' | 'virtual_tour_360';
  isPrimary: boolean;
  sortOrder: number;
}

/**
 * Upload a batch of property images (and optional 360° tour photos) and persist
 * each to the property. `onProgress` reports completed/total so the UI can show
 * a live counter. Failures are collected and re-thrown after the batch so a
 * single bad file doesn't silently drop the rest.
 */
export async function uploadPropertyMedia(
  propertyId: string,
  images: { uri: string; name?: string; file?: File | Blob }[],
  options: { tourImages?: { uri: string; name?: string; file?: File | Blob }[]; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ uploaded: number; failed: number }> {
  const tour = options.tourImages ?? [];
  const total = images.length + tour.length;
  let done = 0;
  let failed = 0;

  const persist = async (
    item: { uri: string; name?: string; file?: File | Blob },
    mediaType: 'photo' | 'virtual_tour_360',
    isPrimary: boolean,
    sortOrder: number,
  ) => {
    try {
      const { url, publicId } = await uploadToCloudinary(item.uri, item.name ?? '', 'properties', item.file);
      await propertiesApi.addMedia(propertyId, { url, publicId, mediaType, isPrimary, sortOrder });
    } catch {
      failed += 1;
    } finally {
      done += 1;
      options.onProgress?.(done, total);
    }
  };

  // Photos first — the first one becomes the primary image
  for (let i = 0; i < images.length; i++) {
    await persist(images[i], 'photo', i === 0, i);
  }
  // 360° equirectangular tour photos (Prestige / Premium)
  for (let i = 0; i < tour.length; i++) {
    await persist(tour[i], 'virtual_tour_360', false, images.length + i);
  }

  return { uploaded: total - failed, failed };
}
