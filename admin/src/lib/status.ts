// Statuts affichés dans l'administration : libellés + couleur (vert = validé, orange = en attente,
// rouge = rejeté / banni). Utilisés par toutes les listes pour une lecture homogène.
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface StatusMeta { label: string; tone: StatusTone }

/** Liseré de ligne correspondant à une teinte (repérage visuel rapide dans les tableaux) */
export const toneAccent: Record<StatusTone, string> = {
  success: 'border-l-cta-500',
  warning: 'border-l-secondary-500',
  danger: 'border-l-danger-500',
  info: 'border-l-primary-500',
  default: 'border-l-gray-300',
};

/** Pastille de couleur pour les onglets de statut */
export const toneDot: Record<StatusTone, string> = {
  success: 'bg-cta-500',
  warning: 'bg-secondary-500',
  danger: 'bg-danger-500',
  info: 'bg-primary-500',
  default: 'bg-gray-400',
};

// ── Comptes utilisateurs (statut affiché calculé côté serveur : displayStatus) ──
export const USER_STATUS: Record<string, StatusMeta> = {
  active: { label: 'Validé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  rejected: { label: 'Rejeté', tone: 'danger' },
  suspended: { label: 'Suspendu', tone: 'warning' },
  banned: { label: 'Banni', tone: 'danger' },
};

export const USER_STATUS_ORDER = ['active', 'pending', 'rejected', 'suspended', 'banned'] as const;

// ── Types de compte ──
export interface AccountTypeMeta { value: string; label: string; short: string }
export const ACCOUNT_TYPES: AccountTypeMeta[] = [
  { value: 'client', label: 'Clients', short: 'Client' },
  { value: 'professional_hebergement', label: 'Pro · Propriétaires', short: 'Propriétaire' },
  { value: 'professional_hotel', label: 'Pro · Hôteliers', short: 'Hôtelier' },
  { value: 'professional_immobilier', label: 'Pro · Immobiliers', short: 'Immobilier' },
  { value: 'restaurateur', label: 'Pro · Restaurants', short: 'Restaurateur' },
  { value: 'admin', label: 'Administrateurs', short: 'Admin' },
];
export const accountShort = (role: string) => ACCOUNT_TYPES.find((t) => t.value === role)?.short ?? role;

// ── KYC ──
export const KYC_STATUS: Record<string, StatusMeta> = {
  approved: { label: 'Vérifié', tone: 'success' },
  pending: { label: 'À valider', tone: 'warning' },
  rejected: { label: 'Rejeté', tone: 'danger' },
};

// ── Annonces / propriétés ──
export const PROPERTY_STATUS: Record<string, StatusMeta> = {
  active: { label: 'Validée', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  pending_review: { label: 'En attente', tone: 'warning' },
  draft: { label: 'Brouillon', tone: 'default' },
  rejected: { label: 'Rejetée', tone: 'danger' },
  suspended: { label: 'Suspendue', tone: 'warning' },
  archived: { label: 'Archivée', tone: 'default' },
};
export const PROPERTY_STATUS_ORDER = ['active', 'pending_review', 'rejected', 'suspended', 'draft', 'archived'] as const;

// ── Plats / menus ──
export const MENU_STATUS: Record<string, StatusMeta> = {
  approved: { label: 'Validé', tone: 'success' },
  active: { label: 'Validé', tone: 'success' },
  pending: { label: 'En attente', tone: 'warning' },
  rejected: { label: 'Rejeté', tone: 'danger' },
};
