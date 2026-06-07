// Tests de non-régression — logique du parcours d'inscription (validation téléphone + mot de passe)
import { normalizeIvorianPhone, isValidIvorianPhone, validatePassword } from '../src/screens/auth/auth.utils';

describe('normalizeIvorianPhone', () => {
  it('normalise un numéro à 10 chiffres en +225…', () => {
    expect(normalizeIvorianPhone('0707161684')).toBe('+2250707161684');
  });

  it('accepte un numéro déjà préfixé 225 (13 chiffres)', () => {
    expect(normalizeIvorianPhone('2250707161684')).toBe('+2250707161684');
  });

  it('ignore les espaces et séparateurs', () => {
    expect(normalizeIvorianPhone('07 07 16 16 84')).toBe('+2250707161684');
    expect(normalizeIvorianPhone('+225 0707-161-684')).toBe('+2250707161684');
  });

  it('gère les anciens numéros à 8 chiffres', () => {
    expect(normalizeIvorianPhone('07161684')).toBe('+22507161684');
  });

  it('renvoie null pour un numéro invalide', () => {
    expect(normalizeIvorianPhone('123')).toBeNull();
    expect(normalizeIvorianPhone('abcdefghij')).toBeNull();
  });
});

describe('isValidIvorianPhone', () => {
  it('true pour un numéro valide, false sinon', () => {
    expect(isValidIvorianPhone('0707161684')).toBe(true);
    expect(isValidIvorianPhone('999')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepte un mot de passe conforme', () => {
    expect(validatePassword('Pass1234')).toBeNull();
  });

  it('rejette si < 8 caractères', () => {
    expect(validatePassword('Pa1')).toMatch(/8 caractères/);
  });

  it('exige une majuscule, une minuscule et un chiffre', () => {
    expect(validatePassword('password1')).toMatch(/majuscule/);
    expect(validatePassword('PASSWORD1')).toMatch(/minuscule/);
    expect(validatePassword('Password')).toMatch(/chiffre/);
  });
});
