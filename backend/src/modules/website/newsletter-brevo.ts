// Synchronisation des abonnés de la newsletter (blog) avec Brevo : chaque abonné actif est un
// contact de la liste « Newsletter Primeo » (créée automatiquement si elle n'existe pas), pour
// les campagnes envoyées depuis Brevo. Désactivation ou suppression → retrait de la liste.
// Échec Brevo : journalisé, sans bloquer l'inscription sur le site.
import axios from 'axios';
import { brevoConfig } from '../../config/brevo.config';
import { logger } from '../../common/utils/logger';

export const NEWSLETTER_LIST_NAME = 'Newsletter Primeo';
let cachedListId: number | null = null;

function headers() {
  return { 'api-key': brevoConfig.apiKey ?? '', accept: 'application/json', 'content-type': 'application/json' };
}

export async function getNewsletterListId(): Promise<number | null> {
  if (cachedListId) return cachedListId;
  if (!brevoConfig.apiKey) return null;
  const { data } = await axios.get<{ lists?: Array<{ id: number; name: string }> }>(
    `${brevoConfig.baseUrl}/contacts/lists?limit=50&offset=0`, { headers: headers(), timeout: 10_000 },
  );
  const found = (data.lists ?? []).find((l) => l.name === NEWSLETTER_LIST_NAME);
  if (found) return (cachedListId = found.id);
  // Liste absente : création dans le premier dossier du compte
  const folders = await axios.get<{ folders?: Array<{ id: number }> }>(
    `${brevoConfig.baseUrl}/contacts/folders?limit=10&offset=0`, { headers: headers(), timeout: 10_000 },
  );
  let folderId = folders.data.folders?.[0]?.id;
  if (!folderId) {
    const f = await axios.post<{ id: number }>(`${brevoConfig.baseUrl}/contacts/folders`, { name: 'Primeo' }, { headers: headers(), timeout: 10_000 });
    folderId = f.data.id;
  }
  const created = await axios.post<{ id: number }>(
    `${brevoConfig.baseUrl}/contacts/lists`, { name: NEWSLETTER_LIST_NAME, folderId }, { headers: headers(), timeout: 10_000 },
  );
  logger.info(`Liste Brevo « ${NEWSLETTER_LIST_NAME} » créée (id=${created.data.id})`);
  return (cachedListId = created.data.id);
}

/** Ajoute (ou met à jour) le contact dans la liste newsletter. Renvoie true si synchronisé. */
export async function addNewsletterContact(email: string): Promise<boolean> {
  try {
    const listId = await getNewsletterListId();
    if (!listId) return false;
    await axios.post(`${brevoConfig.baseUrl}/contacts`, { email, listIds: [listId], updateEnabled: true }, { headers: headers(), timeout: 10_000 });
    return true;
  } catch (err) {
    logger.warn('Newsletter : synchronisation Brevo impossible (ajout)', { error: (err as Error).message });
    return false;
  }
}

/** Retire le contact de la liste newsletter (le contact Brevo lui-même est conservé). */
export async function removeNewsletterContact(email: string): Promise<boolean> {
  try {
    const listId = await getNewsletterListId();
    if (!listId) return false;
    await axios.post(`${brevoConfig.baseUrl}/contacts/lists/${listId}/contacts/remove`, { emails: [email] }, { headers: headers(), timeout: 10_000 });
    return true;
  } catch (err) {
    // 400 « contact absent de la liste » : rien à retirer
    logger.warn('Newsletter : synchronisation Brevo impossible (retrait)', { error: (err as Error).message });
    return false;
  }
}
