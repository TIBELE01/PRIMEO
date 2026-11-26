// Adresses email professionnelles Primeo (domaine primeo.ci, boîtes Zoho Mail).
// Une seule source de vérité : chaque adresse est surchargeable par variable d'environnement.
//
// Boîtes : contact@ (principale), admin@, legal@, professionnel@
// Alias  : contact@  ← support@, assistance@, noreply@, reclamation@
//          admin@    ← comptabilite@, direction@, facturation@, recrutement@, rh@, securite@
//          legal@    ← dpo@, juridique@, presse@
//          professionnel@ ← dmc@, investisseur@, partenariat@
import { env } from './env.config';

const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

export const EMAILS = {
  /** Expéditeur de tous les emails transactionnels (les réponses arrivent dans contact@). */
  from: pick(env.EMAIL_FROM, 'noreply@primeo.ci'),
  fromName: pick(env.EMAIL_FROM_NAME, 'Primeo'),
  /** Adresse de réponse des emails transactionnels. */
  replyTo: pick(env.EMAIL_REPLY_TO, 'contact@primeo.ci'),
  /** Expéditeur des réponses du support (alias de contact@ coché « boîte aux lettres »). */
  supportFrom: pick(env.EMAIL_SUPPORT_FROM, 'support@primeo.ci'),
  /** Support (alias de contact@, utilisable comme expéditeur). */
  support: pick(env.SUPPORT_EMAIL, 'support@primeo.ci'),
  contact: pick(env.CONTACT_EMAIL, 'contact@primeo.ci'),
  reclamation: pick(env.RECLAMATION_EMAIL, 'reclamation@primeo.ci'),
  /** Notifications internes d'administration. */
  admin: pick(env.ADMIN_EMAIL, 'admin@primeo.ci'),
  legal: pick(env.LEGAL_EMAIL, 'legal@primeo.ci'),
  dpo: pick(env.DPO_EMAIL, 'dpo@primeo.ci'),
  press: pick(env.PRESS_EMAIL, 'presse@primeo.ci'),
  partnership: pick(env.PARTNERSHIP_EMAIL, 'partenariat@primeo.ci'),
  careers: pick(env.CAREERS_EMAIL, 'recrutement@primeo.ci'),
  billing: pick(env.BILLING_EMAIL, 'facturation@primeo.ci'),
  security: pick(env.SECURITY_EMAIL, 'securite@primeo.ci'),
  direction: pick(env.DIRECTION_EMAIL, 'direction@primeo.ci'),
  professional: pick(env.PROFESSIONAL_EMAIL, 'professionnel@primeo.ci'),
  investor: pick(env.INVESTOR_EMAIL, 'investisseur@primeo.ci'),
} as const;

/** Boîte de destination d'un message du formulaire de contact, selon le sujet choisi. */
export function contactRecipientFor(subject: string | undefined): string {
  const s = (subject ?? '').toLowerCase();
  if (s.includes('support') || s.includes('technique')) return EMAILS.support;
  if (s.includes('litige') || s.includes('réclamation') || s.includes('reclamation')) return EMAILS.reclamation;
  if (s.includes('partenariat')) return EMAILS.partnership;
  if (s.includes('professionnel')) return EMAILS.professional;
  if (s.includes('presse')) return EMAILS.press;
  return EMAILS.contact;
}
