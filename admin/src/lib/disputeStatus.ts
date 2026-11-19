// Statuts de litige (valeurs réelles de l'API) — libellés, couleurs et état « clos ».
export type DisputeBadge = 'warning' | 'info' | 'success' | 'danger' | 'default';

export const disputeStatusVariant: Record<string, DisputeBadge> = {
  open: 'warning',
  under_review: 'info',
  resolved_refund_full: 'success',
  resolved_refund_partial: 'success',
  resolved_no_refund: 'default',
  closed: 'default',
  // anciens libellés
  resolved_client: 'success',
  resolved_professional: 'success',
  rejected: 'default',
};

export const disputeStatusLabel: Record<string, string> = {
  open: 'Ouvert',
  under_review: 'En révision',
  resolved_refund_full: 'Remboursé (total)',
  resolved_refund_partial: 'Remboursé (partiel)',
  resolved_no_refund: 'Clos sans remboursement',
  closed: 'Fermé',
  resolved_client: 'Résolu (client)',
  resolved_professional: 'Résolu (pro)',
  rejected: 'Rejeté',
};

export const disputeStatusOptions: Array<[string, string]> = [
  ['open', 'Ouvert'],
  ['resolved_refund_full', 'Remboursé (total)'],
  ['resolved_refund_partial', 'Remboursé (partiel)'],
  ['resolved_no_refund', 'Clos sans remboursement'],
];

/** Un litige n'accepte plus d'action dès qu'il n'est plus « ouvert ». */
export const isDisputeClosed = (status: string): boolean => !['open', 'under_review'].includes(status);
