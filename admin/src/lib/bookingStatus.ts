// Libellés et couleurs des statuts de réservation (valeurs réelles de l'API + anciens libellés).
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

export const bookingStatusVariant: Record<string, BadgeVariant> = {
  interest_expressed: 'info',
  pending_payment: 'warning',
  confirmed: 'success',
  completed: 'default',
  cancelled_by_client: 'danger',
  cancelled_by_professional: 'danger',
  pending: 'warning',
  cancelled: 'danger',
  refunded: 'default',
  disputed: 'warning',
};

export const bookingStatusLabel: Record<string, string> = {
  interest_expressed: 'Intérêt exprimé',
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmée',
  completed: 'Terminée',
  cancelled_by_client: 'Annulée par le client',
  cancelled_by_professional: 'Annulée par le professionnel',
  pending: 'En attente',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
  disputed: 'Litige',
};

export const bookingStatusOptions: Array<[string, string]> = [
  ['interest_expressed', 'Intérêt exprimé'],
  ['pending_payment', 'En attente de paiement'],
  ['confirmed', 'Confirmée'],
  ['completed', 'Terminée'],
  ['cancelled_by_client', 'Annulée par le client'],
  ['cancelled_by_professional', 'Annulée par le professionnel'],
];

export const cancellableStatuses = ['confirmed', 'pending_payment', 'interest_expressed'];
