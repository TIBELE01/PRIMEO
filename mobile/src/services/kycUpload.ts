// Service d'upload KYC — construit le multipart et soumet le dossier au backend.
// Fonctionne sur web (File/blob:) ET React Native natif (uri local).
import { professionalApi } from './api/endpoints/professional';

export interface KycBusinessInfo {
  businessName: string;
  rccm?: string;
  taxId?: string;
  touristLicense?: string;
  street?: string;
  city?: string;
  description?: string;
}

export interface KycDocumentFile {
  /** Clé logique côté mobile (identity, rccm_extract, tourist_license…) */
  key: string;
  uri: string;
  name: string;
  file?: File | Blob;
}

// Correspondance clé mobile → nom de champ attendu par le backend (DocumentType)
const FIELD_MAP: Record<string, string> = {
  identity: 'id_card',
  id_card: 'id_card',
  rccm_extract: 'rccm_extract',
  tax_id_certificate: 'tax_id_certificate',
  tourist_license: 'tourist_license',
};

function fieldNameFor(key: string): string {
  return FIELD_MAP[key] ?? 'other';
}

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function appendFile(form: FormData, field: string, doc: KycDocumentFile): Promise<void> {
  const mime = mimeFromName(doc.name);

  if (doc.file) {
    // Web — objet File fourni par expo-document-picker
    const f = doc.file instanceof File ? doc.file : new File([doc.file], doc.name, { type: mime });
    form.append(field, f);
  } else if (typeof document !== 'undefined' && doc.uri.startsWith('blob:')) {
    // Web — blob: URI
    const blob = await fetch(doc.uri).then((r) => r.blob());
    form.append(field, new File([blob], doc.name, { type: blob.type || mime }));
  } else {
    // React Native natif — FormData accepte { uri, name, type }
    form.append(field, { uri: doc.uri, name: doc.name, type: mime } as unknown as Blob);
  }
}

/**
 * Soumet (ou re-soumet) le dossier KYC : informations légales + documents.
 */
export async function submitKyc(
  info: KycBusinessInfo,
  documents: KycDocumentFile[],
): Promise<void> {
  const form = new FormData();
  form.append('businessName', info.businessName);
  if (info.rccm) form.append('rccm', info.rccm);
  if (info.taxId) form.append('taxId', info.taxId);
  if (info.touristLicense) form.append('touristLicense', info.touristLicense);
  if (info.street) form.append('street', info.street);
  if (info.city) form.append('city', info.city);
  if (info.description) form.append('description', info.description);

  for (const doc of documents) {
    await appendFile(form, fieldNameFor(doc.key), doc);
  }

  await professionalApi.submitKyc(form);
}
