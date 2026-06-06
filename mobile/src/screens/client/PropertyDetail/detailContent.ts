// Contenus par défaut adaptés au type de propriété pour la fiche détail.
// Le backend ne retourne pas encore le menu, les lieux proches, la FAQ ou la
// politique d'annulation pour chaque propriété — ce fichier fournit des valeurs
// de repli cohérentes avec le type (hébergement, hôtel, restaurant, immobilier).
import type { Property, PropertyAmenity, MenuItem, RealEstateDocument, NearbyPlace, FaqItem } from '@/types/property';

export type DetailKind = 'hebergement' | 'hotel' | 'restaurant' | 'real_estate';

// Équipements par défaut quand la propriété n'en a pas encore
const DEFAULT_AMENITIES: Record<DetailKind, PropertyAmenity[]> = {
  hebergement: [
    { id: 'da-0', name: 'Wi-Fi',              icon: '📶' },
    { id: 'da-1', name: 'Climatisation',      icon: '❄️' },
    { id: 'da-2', name: 'Parking',            icon: '🅿️' },
    { id: 'da-3', name: 'Cuisine équipée',    icon: '🍳' },
    { id: 'da-4', name: 'Télévision',         icon: '📺' },
    { id: 'da-5', name: 'Eau chaude',         icon: '🚿' },
    { id: 'da-6', name: 'Gardiennage',        icon: '🔒' },
    { id: 'da-7', name: 'Groupe électrogène', icon: '⚡' },
  ],
  hotel: [
    { id: 'da-0', name: 'Wi-Fi',              icon: '📶' },
    { id: 'da-1', name: 'Climatisation',      icon: '❄️' },
    { id: 'da-2', name: 'Piscine',            icon: '🏊' },
    { id: 'da-3', name: 'Salle de sport',     icon: '💪' },
    { id: 'da-4', name: 'Parking',            icon: '🅿️' },
    { id: 'da-5', name: 'Télévision',         icon: '📺' },
    { id: 'da-6', name: 'Gardiennage 24h/24', icon: '🔒' },
    { id: 'da-7', name: 'Groupe électrogène', icon: '⚡' },
    { id: 'da-8', name: 'Conciergerie',       icon: '🛎️' },
  ],
  restaurant: [
    { id: 'da-0', name: 'Wi-Fi',              icon: '📶' },
    { id: 'da-1', name: 'Climatisation',      icon: '❄️' },
    { id: 'da-2', name: 'Parking',            icon: '🅿️' },
    { id: 'da-3', name: 'Terrasse extérieure',icon: '☀️' },
    { id: 'da-4', name: 'Livraison à domicile',icon: '🛵' },
    { id: 'da-5', name: 'À emporter',         icon: '🥡' },
  ],
  real_estate: [
    { id: 'da-0', name: 'Climatisation',      icon: '❄️' },
    { id: 'da-1', name: 'Parking',            icon: '🅿️' },
    { id: 'da-2', name: 'Gardiennage',        icon: '🔒' },
    { id: 'da-3', name: 'Groupe électrogène', icon: '⚡' },
    { id: 'da-4', name: 'Jardin',             icon: '🌿' },
  ],
};

/** Retourne les équipements de la propriété, ou des valeurs par défaut selon le type. */
export function defaultAmenitiesFor(p: Property): PropertyAmenity[] {
  if (p.amenities?.length) return p.amenities;
  return DEFAULT_AMENITIES[kindOf(p.type)] ?? [];
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
  if (p.menu?.length) return p.menu;
  const base = p.pricePerNight ?? 10000;
  return [
    { id: 'm1', category: 'Entrées',   name: 'Salade d\'avocat & crevettes', description: 'Avocat frais, crevettes grillées, vinaigrette maison', price: Math.round(base * 0.4), imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
    { id: 'm2', category: 'Entrées',   name: 'Attiéké poisson braisé', description: 'Spécialité ivoirienne, poisson du jour', price: Math.round(base * 0.6), imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=400&q=80' },
    { id: 'm3', category: 'Plats',     name: 'Poulet kedjenou', description: 'Mijoté traditionnel aux épices, légumes du marché', price: base, imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80' },
    { id: 'm4', category: 'Plats',     name: 'Garba premium', description: 'Thon frais, attiéké, piment', price: Math.round(base * 0.8), imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80' },
    { id: 'm5', category: 'Desserts',  name: 'Dégué maison', description: 'Mil, yaourt, lait concentré', price: Math.round(base * 0.3), imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80' },
    { id: 'm6', category: 'Boissons',  name: 'Bissap / Gingembre', description: 'Jus naturels pressés du jour', price: Math.round(base * 0.2), imageUrl: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?auto=format&fit=crop&w=400&q=80' },
  ];
}

// ── Real estate: protected documents ─────────────────────────────────────
export function documentsFor(p: Property): RealEstateDocument[] {
  if (p.documents?.length) return p.documents;
  const isLand = (p.name ?? '').toLowerCase().includes('terrain');
  const docs: RealEstateDocument[] = [
    { id: 'd1', label: 'Titre foncier', icon: '📜', verified: true },
    { id: 'd2', label: 'ACD (Arrêté de concession)', icon: '🗂️', verified: true },
  ];
  if (!isLand) docs.push({ id: 'd3', label: 'Permis de construire', icon: '🏗️', verified: true });
  docs.push({ id: 'd4', label: 'Certificat de propriété', icon: '✅', verified: false });
  return docs;
}

// ── Nearby places ─────────────────────────────────────────────────────────
export function nearbyFor(p: Property): NearbyPlace[] {
  if (p.nearby?.length) return p.nearby;
  return [
    { id: 'n1', name: 'Supermarché Prosuma', category: 'commerce',   distance: '350 m',  icon: '🛒' },
    { id: 'n2', name: 'Pharmacie de la Paix', category: 'health',     distance: '500 m',  icon: '💊' },
    { id: 'n3', name: 'Arrêt de bus SOTRA',   category: 'transport',  distance: '200 m',  icon: '🚌' },
    { id: 'n4', name: 'Station Total',        category: 'transport',  distance: '800 m',  icon: '⛽' },
    { id: 'n5', name: 'Plage / Front de mer', category: 'attraction', distance: '1,2 km', icon: '🏖️' },
    { id: 'n6', name: 'Centre commercial',     category: 'commerce',   distance: '1,5 km', icon: '🏬' },
  ];
}

// ── FAQ — adapted per type ──────────────────────────────────────────────
export function faqFor(p: Property): FaqItem[] {
  if (p.faq?.length) return p.faq;
  const k = kindOf(p.type);
  if (k === 'restaurant') {
    return [
      { id: 'f1', question: 'Faut-il réserver à l\'avance ?', answer: 'La réservation est recommandée, surtout le week-end. Vous pouvez réserver une table directement depuis cette page.' },
      { id: 'f2', question: 'Le restaurant est-il accessible aux personnes à mobilité réduite ?', answer: 'Oui, l\'établissement dispose d\'un accès de plain-pied et de sanitaires adaptés.' },
      { id: 'f3', question: 'Acceptez-vous les groupes ?', answer: 'Oui, jusqu\'à la capacité indiquée. Pour les grands groupes, contactez le restaurant via la messagerie.' },
      { id: 'f4', question: 'Quels moyens de paiement sont acceptés ?', answer: 'Espèces, Mobile Money (Orange, MTN, Moov) et cartes bancaires.' },
    ];
  }
  if (k === 'real_estate') {
    return [
      { id: 'f1', question: 'Les documents sont-ils vérifiés ?', answer: 'Les documents marqués « vérifié » ont été contrôlés par nos équipes. Les originaux sont consultables après prise de contact.' },
      { id: 'f2', question: 'Puis-je visiter le bien ?', answer: 'Oui, cliquez sur « Exprimer mon intérêt » pour planifier une visite avec le responsable.' },
      { id: 'f3', question: 'Le prix est-il négociable ?', answer: 'Les conditions sont à discuter directement avec le propriétaire via la messagerie.' },
      { id: 'f4', question: 'Des frais d\'agence s\'appliquent-ils ?', answer: 'Les éventuels frais sont précisés par le responsable lors de la prise de contact.' },
    ];
  }
  // hébergement / hôtel
  return [
    { id: 'f1', question: 'À quelle heure puis-je arriver ?', answer: 'Le check-in se fait à partir de 14h00 et le check-out avant 12h00. Des arrangements sont possibles selon disponibilité.' },
    { id: 'f2', question: 'L\'annulation est-elle gratuite ?', answer: 'Cela dépend de la politique d\'annulation indiquée plus haut. Vérifiez la section dédiée avant de réserver.' },
    { id: 'f3', question: 'Le Wi-Fi est-il inclus ?', answer: 'Oui, le Wi-Fi est disponible gratuitement dans tout le logement.' },
    { id: 'f4', question: 'Y a-t-il un groupe électrogène ?', answer: 'En cas de coupure, un groupe électrogène prend le relais (selon le logement).' },
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

/** Main characteristics — adapted per type, returned as icon/value/label cards. */
export function characteristicsFor(p: Property): { icon: string; value: string; label: string }[] {
  const k = kindOf(p.type);
  const out: { icon: string; value: string; label: string }[] = [];
  if (k === 'restaurant') {
    if (p.cuisineType) out.push({ icon: '🍲', value: p.cuisineType, label: 'Cuisine' });
    out.push({ icon: '👥', value: String(p.capacity ?? p.maxGuests ?? 40), label: 'Couverts' });
    out.push({ icon: '🕐', value: p.openingHours ?? '12h–23h', label: 'Horaires' });
    return out;
  }
  if (k === 'real_estate') {
    if (p.area) out.push({ icon: '📐', value: `${p.area}`, label: 'm²' });
    if (p.bedrooms > 0) out.push({ icon: '🛏', value: String(p.bedrooms), label: p.bedrooms > 1 ? 'Chambres' : 'Chambre' });
    if (p.bathrooms > 0) out.push({ icon: '🚿', value: String(p.bathrooms), label: 'SDB' });
    out.push({ icon: p.priceForSale != null ? '🏷️' : '🔑', value: p.priceForSale != null ? 'Vente' : 'Location', label: 'Type' });
    return out;
  }
  // hébergement / hôtel
  if (p.bedrooms > 0) out.push({ icon: '🛏', value: String(p.bedrooms), label: p.bedrooms > 1 ? 'Chambres' : 'Chambre' });
  if (p.bathrooms > 0) out.push({ icon: '🚿', value: String(p.bathrooms), label: p.bathrooms > 1 ? 'Salles de bain' : 'Salle de bain' });
  if (p.maxGuests > 0) out.push({ icon: '👥', value: String(p.maxGuests), label: 'Voyageurs' });
  return out;
}
