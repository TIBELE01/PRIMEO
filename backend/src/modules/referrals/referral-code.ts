// Codes de parrainage — Format des codes : 6 caractères maximum, lettres majuscules et chiffres (ex. « KOF81A »).
// Les codes sont générés en base (fonction SQL generate_referral_code, unicité garantie).
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{1,6}$/;

/** Normalise une saisie : espaces et tirets retirés, majuscules. */
export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? '').replace(/[\s-]+/g, '').toUpperCase();
}
