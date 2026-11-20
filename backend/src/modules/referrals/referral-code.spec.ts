// Codes de parrainage courts : format et normalisation de la saisie.
import { REFERRAL_CODE_PATTERN, normalizeReferralCode } from './referral-code';

describe('codes de parrainage courts', () => {
  it('accepte 6 caractères maximum, majuscules et chiffres', () => {
    for (const ok of ['SUG26T', 'PRM450', 'KOF81A', 'A1']) expect(REFERRAL_CODE_PATTERN.test(ok)).toBe(true);
    for (const ko of ['cmw42rgan0001jfiasbg8i6jh', 'ABCDEFG', 'AB-12', 'ab12', '']) expect(REFERRAL_CODE_PATTERN.test(ko)).toBe(false);
  });
  it('normalise la saisie (casse, espaces, tirets)', () => {
    expect(normalizeReferralCode(' kof81a ')).toBe('KOF81A');
    expect(normalizeReferralCode('KOF-81A')).toBe('KOF81A');
    expect(normalizeReferralCode('kof 81 a')).toBe('KOF81A');
    expect(normalizeReferralCode(undefined)).toBe('');
  });
});
