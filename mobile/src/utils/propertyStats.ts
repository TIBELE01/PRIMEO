// Statistiques des annonces (onglet « Statistiques » du professionnel).
// Envoi « best-effort » : une erreur réseau n'interrompt jamais la navigation.
import { propertiesApi } from '../services/api/endpoints/properties';

const isRealId = (id?: string | null): id is string => !!id && !id.startsWith('demo');

/** La fiche (ou la carte d'un restaurant) a été affichée à un visiteur. */
export function trackPropertyView(propertyId?: string | null): void {
  if (!isRealId(propertyId)) return;
  propertiesApi.recordEvent(propertyId, 'view').catch(() => {});
}

/** Clic sur une annonce depuis une liste de résultats (recherche, accueil, catégorie…). */
export function trackPropertyClick(propertyId?: string | null, source?: string): void {
  if (!isRealId(propertyId)) return;
  propertiesApi.recordEvent(propertyId, 'click', source).catch(() => {});
}
