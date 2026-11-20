// Contenus par défaut adaptés au type de propriété pour la fiche détail.
// Le backend ne retourne pas encore le menu, les lieux proches, la FAQ ou la
// politique d'annulation pour chaque propriété — ce fichier fournit des valeurs
// de repli cohérentes avec le type (hébergement, hôtel, restaurant, immobilier).
import type { Property, PropertyAmenity, MenuItem, RealEstateDocument, NearbyPlace, FaqItem } from '@/types/property';

export type DetailKind = 'hebergement' | 'hotel' | 'restaurant' | 'real_estate';

// Équipements par défaut quand la propriété n'en a pas encore

/** Équipements RÉELS de l'annonce (aucune valeur inventée : sans équipement renseigné,
 *  la section affiche « Informations sur les équipements à venir »). */
export function defaultAmenitiesFor(p: Property): PropertyAmenity[] {
  return p.amenities?.length ? p.amenities : [];
}

export function kindOf(type: string): DetailKind {
  if (type === 'restaurant') return 'restaurant';
  if (type === 'real_estate' || type === 'immobilier_location' || type === 'immobilier_achat' || type === 'immobilier_terrain') return 'real_estate';
  if (type === 'hotel') return 'hotel';
  // 'apartment', 'residence', 'villa', 'guesthouse', 'hostel', 'resort' → hébergement
  return 'hebergement';
}

// Per-type accent color — aligned with the category pages
export function themeColor(type: string): { color: string; soft: string } {
  switch (kindOf(type)) {
    case 'hotel':       return { color: '#0D47A1', soft: '#E3EEFF' };
    case 'real_estate': return { color: '#059669', soft: '#E7F9F2' };
    case 'restaurant':  return { color: '#DC2626', soft: '#FEF2F2' };
    default:            return { color: '#1056E0', soft: '#EEF4FF' };
  }
}

// ── Action button + price label, per type ───────────────────────────────
export function actionLabel(type: string): string {
  switch (kindOf(type)) {
    case 'real_estate': return 'Exprimer mon intérêt';
    case 'restaurant':  return 'Réserver une table';
    default:            return 'Réserver';
  }
}

/**
 * Calcule le prix à afficher, l'unité et le préfixe selon le type de bien :
 * - Résidence/Hôtel  → xxx / nuit
 * - Immobilier vente → xxx  (sans unité)
 * - Immobilier loc.  → xxx / mois
 * - Restaurant       → À partir de xxx / plat  (plat le moins cher du menu)
 */
export function priceDisplay(p: Property): { price: number | null; unit: string; prefix: string } {
  const k = kindOf(p.type);

  if (k === 'restaurant') {
    const items = menuFor(p);
    const minPrice = items.length > 0
      ? Math.min(...items.map(m => m.price))
      : p.pricePerNight != null ? Math.round(p.pricePerNight * 0.4) : null;
    return { price: minPrice, unit: '/ plat', prefix: 'À partir de' };
  }

  if (k === 'real_estate') {
    if (p.priceForSale != null) {
      return { price: p.priceForSale, unit: '', prefix: '' };
    }
    // Location longue durée — pricePerMonth depuis BDD, pricePerNight comme proxy en démo
    const monthly = (p as any).pricePerMonth ?? p.pricePerNight;
    return { price: monthly, unit: '/ mois', prefix: '' };
  }

  // Résidence / Hôtel
  return { price: p.pricePerNight, unit: '/ nuit', prefix: '' };
}

// ── Restaurant: default menu ─────────────────────────────────────────────
export function menuFor(p: Property): MenuItem[] {
  // Carte réelle uniquement (plus de plats fictifs quand le restaurant n'a rien publié)
  return p.menu?.length ? p.menu : [];
}

// ── Real estate: protected documents ─────────────────────────────────────

const DIAG_META: Record<string, { label: string; icon: string }> = {
  dpe:          { label: 'DPE (Performance Énergétique)',  icon: '🔋' },
  carrez:       { label: 'Loi Carrez (superficie)',        icon: '📐' },
  amiante:      { label: 'Diagnostic amiante',            icon: '⚠️' },
  plomb:        { label: 'Diagnostic plomb',              icon: '🚨' },
  electricite:  { label: 'Diagnostic électricité',        icon: '⚡' },
  gaz:          { label: 'Diagnostic gaz',                icon: '🔥' },
  termites:     { label: 'Diagnostic termites',           icon: '🐛' },
  titreFoncier: { label: 'Titre foncier',                 icon: '📄' },
  permisConstruct: { label: 'Permis de construire',       icon: '🏗' },
};

export function documentsFor(p: Property): RealEstateDocument[] {
  if (p.documents?.length) return p.documents;

  // Utiliser les diagnostics réels du bien s'ils existent
  if (p.diagnostics && Object.keys(p.diagnostics).length > 0) {
    return Object.entries(p.diagnostics)
      .filter(([, available]) => available)
      .map(([key], i) => ({
        id: `d${i}`,
        label: DIAG_META[key]?.label ?? key,
        icon:  DIAG_META[key]?.icon  ?? '📋',
        verified: true,
      }));
  }

  // Aucun document déclaré : rien n'est affiché comme « vérifié » sans contrôle réel
  return [];
}

// ── Nearby places ─────────────────────────────────────────────────────────
export function nearbyFor(p: Property): NearbyPlace[] {
  // Lieux réels uniquement (plus de commerces/distances inventés)
  return p.nearby?.length ? p.nearby : [];
}

// ── FAQ — adapted per type ──────────────────────────────────────────────
export function faqFor(p: Property): FaqItem[] {
  if (p.faq?.length) return p.faq;
  // Réponses génériques, valables pour toute annonce (aucune caractéristique supposée du bien)
  const k = kindOf(p.type);
  if (k === 'restaurant') {
    return [
      { id: 'f1', question: 'Faut-il réserver à l\'avance ?', answer: 'C\'est conseillé, surtout le week-end. Si le restaurant propose la réservation de table, vous pouvez réserver directement depuis l\'application.' },
      { id: 'f2', question: 'Comment poser une question au restaurant ?', answer: 'Utilisez la messagerie Primeo : le restaurant reçoit votre message et vous répond dans l\'application.' },
      { id: 'f3', question: 'Quels moyens de paiement sont acceptés ?', answer: 'Les options de paiement disponibles sont indiquées lors de la commande ou de la réservation.' },
    ];
  }
  if (k === 'real_estate') {
    return [
      { id: 'f1', question: 'Comment obtenir les documents du bien ?', answer: 'Les documents sont communiqués par le responsable du bien après prise de contact. Vérifiez toujours les originaux avant tout engagement.' },
      { id: 'f2', question: 'Puis-je visiter le bien ?', answer: 'Oui, cliquez sur « Exprimer mon intérêt » pour être mis en relation avec le responsable et planifier une visite.' },
      { id: 'f3', question: 'Le prix est-il négociable ?', answer: 'Les conditions se discutent directement avec le responsable via la messagerie.' },
    ];
  }
  // hébergement / hôtel
  return [
    { id: 'f1', question: 'Quand ma réservation est-elle confirmée ?', answer: 'Selon l\'option de paiement choisie : dès le paiement en ligne validé, ou immédiatement pour un règlement sur place. Vous recevez une confirmation par e-mail.' },
    { id: 'f2', question: 'L\'annulation est-elle gratuite ?', answer: 'Cela dépend de la politique d\'annulation indiquée sur cette page. Vérifiez-la avant de réserver.' },
    { id: 'f3', question: 'Comment contacter l\'hôte ?', answer: 'Une conversation s\'ouvre automatiquement avec l\'hôte après votre réservation ; vous pouvez aussi lui écrire depuis la messagerie.' },
  ];
}

// ── Cancellation policy text — per type ──────────────────────────────────
export function cancellationFor(p: Property): { title: string; lines: string[] } {
  if (p.cancellationPolicy) return { title: 'Politique d\'annulation', lines: [p.cancellationPolicy] };
  const k = kindOf(p.type);
  if (k === 'restaurant') {
    return {
      title: 'Conditions d\'annulation',
      lines: [
        'Annulation gratuite jusqu\'à 2 heures avant le créneau réservé.',
        'Aucun frais — la réservation de table est sans prépaiement.',
        'En cas de no-show répété, l\'accès à la réservation en ligne peut être limité.',
      ],
    };
  }
  if (k === 'real_estate') {
    return {
      title: 'Conditions',
      lines: [
        'La prise de contact est sans engagement.',
        'Aucun paiement n\'est requis pour exprimer votre intérêt.',
        'Les modalités (visite, dossier, acompte) sont définies avec le responsable.',
      ],
    };
  }
  return {
    title: 'Politique d\'annulation',
    lines: [
      'Flexible : annulation gratuite jusqu\'à 24h avant l\'arrivée.',
      'Au-delà, la première nuit est retenue.',
      'Pour l\'option « 10 % en ligne », l\'hôte peut annuler sans frais jusqu\'à 24h avant l\'arrivée.',
      'Le remboursement éventuel est traité sous 5 à 7 jours ouvrés.',
    ],
  };
}

/**
 * Formate les horaires d'ouverture en chaîne SÛRE pour le rendu.
 * `openingHours` peut être une chaîne ("12h–23h") OU un objet jour→horaire
 * ({ lundi: "12h-23h", … }) renvoyé par le backend. Rendre l'objet directement
 * provoquait « Objects are not valid as a React child ».
 */
function formatOpeningHours(oh: unknown): string {
  if (!oh) return '12h–23h';
  if (typeof oh === 'string') return oh.trim() || '12h–23h';
  if (typeof oh === 'object') {
    const vals = Object.values(oh as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    if (vals.length === 0) return '12h–23h';
    // Horaires uniformes → une seule valeur ; sinon, on affiche la plus fréquente.
    const uniq = [...new Set(vals)];
    return uniq.length === 1 ? uniq[0] : vals[0];
  }
  return '12h–23h';
}

/** Main characteristics — adapted per type, returned as icon/value/label cards. */
export function characteristicsFor(p: Property): { icon: string; value: string; label: string }[] {
  const k = kindOf(p.propertyType ?? p.type);
  const out: { icon: string; value: string; label: string }[] = [];

  if (k === 'restaurant') {
    if (p.cuisineType) out.push({ icon: '🍲', value: String(p.cuisineType), label: 'Cuisine' });
    out.push({ icon: '👥', value: String(p.capacity ?? p.maxGuests ?? 40), label: 'Couverts' });
    out.push({ icon: '🕐', value: formatOpeningHours(p.openingHours), label: 'Horaires' });
    return out;
  }

  if (k === 'real_estate') {
    const surface = (p as any).surface ?? p.area;
    if (surface) out.push({ icon: '📐', value: `${surface}`, label: 'm²' });
    const piecesCount = p.rooms ?? p.bedrooms;
    if (piecesCount && piecesCount > 0) out.push({ icon: '🏠', value: String(piecesCount), label: piecesCount > 1 ? 'Pièces' : 'Pièce' });
    if (p.bathrooms > 0) out.push({ icon: '🚿', value: String(p.bathrooms), label: 'SDB' });
    if (p.floor != null) out.push({ icon: '🏢', value: p.floor === 0 ? 'RDC' : `${p.floor}e`, label: 'Étage' });
    if (p.yearBuilt) out.push({ icon: '🏗', value: String(p.yearBuilt), label: 'Construit' });
    out.push({ icon: p.priceForSale != null ? '🏷️' : '🔑', value: p.priceForSale != null ? 'Vente' : 'Location', label: 'Type' });
    return out;
  }

  if (k === 'hotel') {
    const roomTypesCount = p.roomTypes?.length ?? 0;
    if (roomTypesCount > 0) out.push({ icon: '🛎', value: String(roomTypesCount), label: roomTypesCount > 1 ? 'Types de chambre' : 'Type de chambre' });
    if (p.bathrooms > 0) out.push({ icon: '🚿', value: String(p.bathrooms), label: 'SDB / chambre' });
    if (p.maxGuests > 0 || p.capacity) out.push({ icon: '👥', value: String(p.capacity ?? p.maxGuests), label: 'Capacité' });
    return out;
  }

  // Résidence / hébergement
  if (p.bedrooms > 0) out.push({ icon: '🛏', value: String(p.bedrooms), label: p.bedrooms > 1 ? 'Chambres' : 'Chambre' });
  if (p.bathrooms > 0) out.push({ icon: '🚿', value: String(p.bathrooms), label: p.bathrooms > 1 ? 'Salles de bain' : 'Salle de bain' });
  if (p.maxGuests > 0) out.push({ icon: '👥', value: String(p.maxGuests), label: 'Voyageurs' });
  return out;
}
