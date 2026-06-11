// Tests de régression — logique de dates du tunnel de réservation.
// Couvre les scénarios de crash corrigés : modification de la date d'arrivée,
// de départ, dates invalides, plages inversées et dates déjà réservées.
import {
  isValidDateStr,
  todayStr,
  addDaysStr,
  countNights,
  isValidStayRange,
  formatShortDateFR,
  formatLongDateFR,
} from '../src/utils/dates';

describe('isValidDateStr', () => {
  it('accepte les vraies dates calendaires', () => {
    expect(isValidDateStr('2026-06-11')).toBe(true);
    expect(isValidDateStr('2024-02-29')).toBe(true); // bissextile
    expect(isValidDateStr('2026-12-31')).toBe(true);
  });

  it('rejette les dates au bon format mais inexistantes (bug DateModal recherche)', () => {
    expect(isValidDateStr('2025-99-99')).toBe(false);
    expect(isValidDateStr('2025-02-30')).toBe(false);
    expect(isValidDateStr('2025-13-01')).toBe(false);
    expect(isValidDateStr('2025-00-10')).toBe(false);
    expect(isValidDateStr('2023-02-29')).toBe(false); // non bissextile
  });

  it('rejette les entrées invalides sans jeter (undefined, null, vide, mauvais format)', () => {
    expect(isValidDateStr(undefined)).toBe(false);
    expect(isValidDateStr(null)).toBe(false);
    expect(isValidDateStr('')).toBe(false);
    expect(isValidDateStr('11/06/2026')).toBe(false);
    expect(isValidDateStr('2026-6-1')).toBe(false);
    expect(isValidDateStr(20260611)).toBe(false);
  });
});

describe('countNights — jamais NaN, jamais négatif', () => {
  it('compte les nuits d’une plage valide', () => {
    expect(countNights('2026-06-10', '2026-06-13')).toBe(3);
    expect(countNights('2026-06-10', '2026-06-11')).toBe(1);
  });

  it('retourne 0 pour une plage inversée (arrivée déplacée après le départ)', () => {
    expect(countNights('2026-06-15', '2026-06-10')).toBe(0);
  });

  it('retourne 0 pour départ = arrivée (double tap sur le même jour du calendrier)', () => {
    expect(countNights('2026-06-10', '2026-06-10')).toBe(0);
  });

  it('retourne 0 (pas NaN) pour des dates invalides ou absentes', () => {
    expect(countNights(undefined, '2026-06-13')).toBe(0);
    expect(countNights('', '')).toBe(0);
    expect(countNights('2026-06-10', 'invalid')).toBe(0);
    expect(Number.isNaN(countNights('abc', 'def'))).toBe(false);
  });
});

describe('isValidStayRange — garde du bouton Confirmer', () => {
  it('valide une plage de séjour normale', () => {
    expect(isValidStayRange('2026-06-10', '2026-06-12')).toBe(true);
  });
  it('refuse les plages à 0 nuit, inversées ou incomplètes', () => {
    expect(isValidStayRange('2026-06-10', '2026-06-10')).toBe(false);
    expect(isValidStayRange('2026-06-15', '2026-06-10')).toBe(false);
    expect(isValidStayRange('2026-06-10', undefined)).toBe(false);
    expect(isValidStayRange(undefined, undefined)).toBe(false);
  });
});

describe('addDaysStr', () => {
  it('ajoute des jours en franchissant les mois et années', () => {
    expect(addDaysStr('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDaysStr('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysStr('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysStr('2024-02-28', 1)).toBe('2024-02-29'); // bissextile
  });
  it('retourne null pour une entrée invalide (jamais "Invalid Date")', () => {
    expect(addDaysStr('', 1)).toBeNull();
    expect(addDaysStr('abc', 1)).toBeNull();
  });
});

describe('formatShortDateFR / formatLongDateFR — jamais "NaN undefined"', () => {
  it('formate une date valide', () => {
    expect(formatShortDateFR('2026-06-11')).toBe('11 juin');
    expect(formatShortDateFR('2026-01-05')).toBe('5 jan');
  });
  it('retourne le repli pour les entrées invalides (bug "NaN undefined" du récap séjour)', () => {
    expect(formatShortDateFR('')).toBe('—');
    expect(formatShortDateFR(undefined)).toBe('—');
    expect(formatShortDateFR('2025-99-99')).toBe('—');
    expect(formatLongDateFR(null)).toBe('—');
    expect(formatShortDateFR(undefined, 'date inconnue')).toBe('date inconnue');
  });
});

describe('todayStr', () => {
  it('retourne la date du jour au format YYYY-MM-DD', () => {
    expect(isValidDateStr(todayStr())).toBe(true);
  });
});

// ─── Régression : sélection de plage du calendrier (CalendarSection) ──────────
// Reproduit la machine à états corrigée de handleDayPress pour vérifier que :
//  1. taper deux fois le même jour ne produit plus une plage 0 nuit ;
//  2. une plage enjambant une nuit réservée est refusée (redémarrage) ;
//  3. les jours indisponibles ne sont pas sélectionnables.
type RangeState = { checkIn: string | null; checkOut: string | null; emitted: { checkIn: string; checkOut: string } | null };

function dayPress(state: RangeState, dayStr: string, unavailable: string[]): RangeState {
  const { checkIn, checkOut } = state;
  if (unavailable.includes(dayStr)) return state;
  const rangeIsFree = (start: string, end: string) => !unavailable.some(d => d >= start && d < end);
  if (!checkIn || (checkIn && checkOut)) {
    return { checkIn: dayStr, checkOut: null, emitted: null };
  } else if (dayStr <= checkIn) {
    return { checkIn: dayStr, checkOut: null, emitted: null };
  } else if (!rangeIsFree(checkIn, dayStr)) {
    return { checkIn: dayStr, checkOut: null, emitted: null };
  }
  return { checkIn, checkOut: dayStr, emitted: { checkIn, checkOut: dayStr } };
}

describe('sélection de plage calendrier (régression CalendarSection)', () => {
  const init: RangeState = { checkIn: null, checkOut: null, emitted: null };

  it('sélectionne une plage valide en deux taps', () => {
    let s = dayPress(init, '2026-07-10', []);
    s = dayPress(s, '2026-07-13', []);
    expect(s.emitted).toEqual({ checkIn: '2026-07-10', checkOut: '2026-07-13' });
  });

  it('double tap sur le même jour → pas de plage 0 nuit, la sélection redémarre', () => {
    let s = dayPress(init, '2026-07-10', []);
    s = dayPress(s, '2026-07-10', []);
    expect(s.emitted).toBeNull();
    expect(s.checkIn).toBe('2026-07-10');
    expect(s.checkOut).toBeNull();
  });

  it('tap antérieur à l’arrivée → la sélection redémarre sur ce jour', () => {
    let s = dayPress(init, '2026-07-10', []);
    s = dayPress(s, '2026-07-05', []);
    expect(s.checkIn).toBe('2026-07-05');
    expect(s.emitted).toBeNull();
  });

  it('jour déjà réservé → tap ignoré', () => {
    const s = dayPress(init, '2026-07-10', ['2026-07-10']);
    expect(s.checkIn).toBeNull();
  });

  it('plage enjambant une nuit réservée → refusée, redémarre sur le jour tapé', () => {
    let s = dayPress(init, '2026-07-10', ['2026-07-12']);
    s = dayPress(s, '2026-07-15', ['2026-07-12']);
    expect(s.emitted).toBeNull();
    expect(s.checkIn).toBe('2026-07-15');
  });

  it('le départ le lendemain d’une nuit réservée reste autorisé (borne exclue)', () => {
    // nuit du 12 réservée ; séjour 10 → 12 occupe les nuits du 10 et 11 → OK
    let s = dayPress(init, '2026-07-10', ['2026-07-12']);
    s = dayPress(s, '2026-07-12', ['2026-07-12']);
    // le 12 lui-même est indisponible au tap — vérifier la borne avec un autre cas :
    expect(s.emitted).toBeNull();
    let s2 = dayPress(init, '2026-07-10', ['2026-07-13']);
    s2 = dayPress(s2, '2026-07-12', ['2026-07-13']);
    expect(s2.emitted).toEqual({ checkIn: '2026-07-10', checkOut: '2026-07-12' });
  });
});

// ─── Régression : date sûre du tunnel restaurant (PropertyDetailScreen) ───────
// L'ancien code faisait `new Date(new Date(date).getTime() + 86_400_000)
// .toISOString()` : une date invalide jetait « RangeError: Invalid time value »
// et crashait l'app. Le code corrigé passe par addDaysStr (null-safe) avec
// repli sur aujourd'hui.
describe('date sûre réservation restaurant (régression RangeError)', () => {
  function safeRestaurantDates(date: string) {
    const safeDate = addDaysStr(date, 0) ?? todayStr();
    return { checkIn: safeDate, checkOut: addDaysStr(safeDate, 1) ?? safeDate };
  }

  it('produit arrivée + lendemain pour une date valide', () => {
    expect(safeRestaurantDates('2026-07-10')).toEqual({
      checkIn: '2026-07-10',
      checkOut: '2026-07-11',
    });
  });

  it('ne jette jamais pour une date invalide — repli sur aujourd\'hui', () => {
    const { checkIn, checkOut } = safeRestaurantDates('invalid');
    expect(isValidDateStr(checkIn)).toBe(true);
    expect(isValidDateStr(checkOut)).toBe(true);
    expect(countNights(checkIn, checkOut)).toBe(1);
  });

  it('ne jette jamais pour une chaîne vide', () => {
    expect(() => safeRestaurantDates('')).not.toThrow();
    expect(isValidStayRange(safeRestaurantDates('').checkIn, safeRestaurantDates('').checkOut)).toBe(true);
  });
});

// ─── Régression : params de navigation absents (deep link / restauration) ─────
// Plusieurs écrans déstructuraient `route.params` sans repli : un deep link ou
// une restauration d'état sans params provoquait « Cannot read property of
// undefined ». Le motif corrigé est `route.params ?? {}`.
describe('garde route.params (régression deep link)', () => {
  function guardedDestructure(params: { propertyId?: string } | undefined) {
    const { propertyId } = (params ?? {}) as { propertyId?: string };
    return propertyId;
  }

  it('extrait le paramètre quand il est présent', () => {
    expect(guardedDestructure({ propertyId: 'abc' })).toBe('abc');
  });

  it('retourne undefined sans jeter quand params est absent', () => {
    expect(() => guardedDestructure(undefined)).not.toThrow();
    expect(guardedDestructure(undefined)).toBeUndefined();
  });
});

// ─── Régression : stepper de dates du BookingModal ────────────────────────────
// Le bouton « + » de l'arrivée contenait `if (d < checkOut) setCheckIn(d); else
// setCheckIn(d);` (branches identiques) : l'arrivée pouvait dépasser le départ.
describe('stepper BookingModal (régression arrivée > départ)', () => {
  function plusCheckIn(checkIn: string, checkOut: string) {
    const d = addDaysStr(checkIn, 1)!;
    let newCheckOut = checkOut;
    if (d >= checkOut) newCheckOut = addDaysStr(d, 1)!;
    return { checkIn: d, checkOut: newCheckOut };
  }

  it('avancer l’arrivée pousse le départ pour conserver au moins 1 nuit', () => {
    let s = { checkIn: '2026-07-10', checkOut: '2026-07-11' };
    s = plusCheckIn(s.checkIn, s.checkOut);
    expect(s).toEqual({ checkIn: '2026-07-11', checkOut: '2026-07-12' });
    s = plusCheckIn(s.checkIn, s.checkOut);
    expect(s).toEqual({ checkIn: '2026-07-12', checkOut: '2026-07-13' });
    expect(countNights(s.checkIn, s.checkOut)).toBe(1);
  });

  it('l’arrivée ne crée jamais une plage inversée même après plusieurs avances', () => {
    let s = { checkIn: '2026-07-10', checkOut: '2026-07-12' };
    for (let i = 0; i < 10; i++) s = plusCheckIn(s.checkIn, s.checkOut);
    expect(isValidStayRange(s.checkIn, s.checkOut)).toBe(true);
  });
});
