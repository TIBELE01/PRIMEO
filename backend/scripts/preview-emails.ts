// Génère un aperçu HTML local de tous les templates email (sans envoi réseau).
// Usage : npx tsx scripts/preview-emails.ts  → écrit /tmp/email-previews/*.html
import { mkdirSync, writeFileSync } from 'fs';
import { renderLocalTemplate } from '../src/common/email/templates';

const SAMPLE: Record<string, unknown> = {
  firstName: 'Awa', name: 'Awa Koné', clientName: 'Awa Koné', senderName: 'Moussa Diallo',
  refereeName: 'Moussa Diallo', propertyTitle: 'Villa Cocody Premium',
  startDate: '15 juillet 2026', endDate: '20 juillet 2026', reservationTime: '20h00', guests: '4',
  totalAmount: 250000, amountPaid: 25000, balanceDue: 225000, amount: 25000, rewardAmount: 1000,
  bookingId: 'a1b2c3d4e5f6', planName: 'Premium', nextBillingDate: '14 juillet 2026',
  reason: 'Document illisible — merci de renvoyer une photo nette.', rating: 5,
  comment: 'Séjour parfait, accueil chaleureux et logement impeccable !',
  replyText: 'Merci beaucoup pour votre retour, au plaisir de vous accueillir à nouveau !',
  duration: '7 jours', expiresAt: '21 juillet 2026 à 23h59',
  contactPhone: '+225 07 00 00 00 00', contactEmail: 'awa.kone@example.ci',
  messagePreview: 'Bonjour, le bien est-il toujours disponible ce week-end ?', otp: '482913',
};

const NAMES: Record<number, string> = {
  1: '01-welcome-client', 2: '02-welcome-pro', 3: '03-booking-confirmation-client',
  4: '04-booking-cancellation', 5: '05-payment-receipt', 6: '06-kyc-approved',
  7: '07-kyc-rejected', 8: '08-subscription-invoice', 9: '09-otp', 11: '11-referral',
  12: '12-booking-confirmation-pro', 13: '13-interest-client', 14: '14-interest-pro',
  15: '15-new-message', 16: '16-stay-reminder', 17: '17-review-received',
  18: '18-review-reply', 19: '19-boost-activated', 20: '20-boost-expiry',
};

const OUT = '/tmp/email-previews';
mkdirSync(OUT, { recursive: true });

const links: string[] = [];
for (const [id, fname] of Object.entries(NAMES)) {
  // Cas restaurant pour la confirmation (mode table)
  const params = Number(id) === 3 ? { ...SAMPLE, mode: 'table' } : SAMPLE;
  const { subject, html } = renderLocalTemplate(Number(id), params);
  writeFileSync(`${OUT}/${fname}.html`, html);
  links.push(`<li><a href="${fname}.html">${fname}</a> — <em>${subject}</em></li>`);
  // eslint-disable-next-line no-console
  console.log(`✓ ${fname} — ${subject}`);
}

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html><meta charset="utf-8"><title>Aperçu emails Primeo</title>
  <body style="font-family:Arial;padding:32px;background:#f4f4f4;">
  <h1>Aperçu des templates email Primeo</h1><ul>${links.join('')}</ul></body>`,
);
// eslint-disable-next-line no-console
console.log(`\nAperçu écrit dans ${OUT}/index.html`);
