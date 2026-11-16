// Liens externes de l'application — source unique de vérité.
// Les adresses par défaut sont celles des sites réellement en ligne ; on peut les
// surcharger (domaine personnalisé) via EXPO_PUBLIC_VITRINE_URL / EXPO_PUBLIC_LEGAL_URL.
import { Linking } from 'react-native';

const clean = (v: string | undefined, fallback: string) => (v?.trim() || fallback).replace(/\/+$/, '');

export const VITRINE_URL = clean(process.env['EXPO_PUBLIC_VITRINE_URL'], 'https://primeo-vitrine-152o.onrender.com');
export const LEGAL_URL   = clean(process.env['EXPO_PUBLIC_LEGAL_URL'],   'https://primeo-legal-kg6t.onrender.com');

/** Page du site vitrine (avec barre finale) — ex. vitrineUrl('a-propos') */
export const vitrineUrl = (path = '') => `${VITRINE_URL}/${path.replace(/^\/+/, '')}`;
/** Page du site légal — ex. legalUrl('cgu') */
export const legalUrl = (path = '') => `${LEGAL_URL}/${path.replace(/^\/+/, '')}`;

export const SOCIAL_URLS = {
  facebook:  'https://www.facebook.com/profile.php?id=61590079695276',
  instagram: 'https://www.instagram.com/primeo.ci',
  tiktok:    'https://www.tiktok.com/@primeo.ci',
} as const;

/** Ouvre une URL dans le navigateur externe ; ne plante jamais si aucun navigateur n'est disponible. */
export async function openExternal(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
