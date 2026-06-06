// Booking payment options — three models supported by Genius Pay
export const PaymentOption = {
  FULL_ONLINE: 'full_online',        // 100% paid online at booking
  TEN_PERCENT_ONLINE: 'ten_percent_online', // 10% deposit online, rest on arrival
  ZERO_ONLINE: 'zero_online',        // Full payment on arrival (no online payment)
} as const;

export type PaymentOption = (typeof PaymentOption)[keyof typeof PaymentOption];

export const PAYMENT_OPTION_LABELS: Record<PaymentOption, string> = {
  full_online: 'Paiement complet en ligne',
  ten_percent_online: 'Acompte 10 % en ligne',
  zero_online: 'Paiement sur place',
};
