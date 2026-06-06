// Configuration partagée des statuts d'annonce (libellé + couleurs).
// Source unique pour la liste des annonces et l'écran de gestion : un nouveau
// statut backend ne doit être ajouté qu'ici.
export type StatusStyle = { label: string; color: string; bg: string };

export const STATUS_CONFIG: Record<string, StatusStyle> = {
  draft:     { label: 'Brouillon',     color: '#6B7280', bg: '#F3F4F6' },
  pending:   { label: 'En validation', color: '#D97706', bg: '#FEF3C7' },
  active:    { label: 'Active',        color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: 'Rejetée',       color: '#DC2626', bg: '#FEE2E2' },
  suspended: { label: 'Suspendue',     color: '#DC2626', bg: '#FEE2E2' },
  archived:  { label: 'Archivée',      color: '#6B7280', bg: '#F3F4F6' },
};

export const statusStyle = (status: string): StatusStyle =>
  STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
