// Intent handler — classifies support queries into actionable intents
export type SupportIntent =
  | 'booking_cancel'
  | 'booking_status'
  | 'payment_issue'
  | 'refund_request'
  | 'account_help'
  | 'general_inquiry'
  | 'unknown';

const intentKeywords: Record<SupportIntent, string[]> = {
  booking_cancel: ['annuler', 'cancel', 'annulation'],
  booking_status: ['statut', 'status', 'réservation', 'booking'],
  payment_issue: ['paiement', 'payment', 'echec', 'erreur', 'failed'],
  refund_request: ['remboursement', 'refund', 'rembourser'],
  account_help: ['compte', 'account', 'mot de passe', 'password', 'connexion'],
  general_inquiry: ['information', 'info', 'comment', 'aide', 'help'],
  unknown: [],
};

export function classifyIntent(query: string): SupportIntent {
  const normalized = query.toLowerCase();
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (intent === 'unknown') continue;
    if (keywords.some(kw => normalized.includes(kw))) {
      return intent as SupportIntent;
    }
  }
  return 'unknown';
}
