// Utilitaires de dates sûrs — toutes les fonctions tolèrent les entrées
// invalides (undefined, '', format incorrect, dates inexistantes) sans jeter.
// Format pivot : 'YYYY-MM-DD' (chaîne ISO date-only, comparable lexicalement).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS_SHORT_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

/** Vraie date calendaire au format YYYY-MM-DD (rejette 2025-99-99, 2025-02-30…). */
export function isValidDateStr(str: unknown): str is string {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  const [y, m, d] = str.split('-').map(n => parseInt(n, 10));
  if (m < 1 || m > 12 || d < 1) return false;
  // Jours réels du mois (année bissextile incluse)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}

/** Date du jour (locale appareil) au format YYYY-MM-DD. */
export function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Ajoute n jours à une date YYYY-MM-DD. Retourne null si l'entrée est invalide. */
export function addDaysStr(dateStr: string, n: number): string | null {
  if (!isValidDateStr(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Nombre de nuits entre deux dates. Retourne 0 si l'une des dates est
 * invalide ou si checkOut <= checkIn (jamais NaN, jamais négatif).
 */
export function countNights(checkIn: unknown, checkOut: unknown): number {
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut)) return 0;
  const diff = Math.round(
    (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86_400_000,
  );
  return diff > 0 ? diff : 0;
}

/** Plage valide pour un séjour : deux vraies dates et checkOut > checkIn. */
export function isValidStayRange(checkIn: unknown, checkOut: unknown): boolean {
  return countNights(checkIn, checkOut) > 0;
}

/** « 12 mar » — retourne un libellé de secours si la date est invalide (jamais "NaN undefined"). */
export function formatShortDateFR(dateStr: unknown, fallback = '—'): string {
  if (!isValidDateStr(dateStr)) return fallback;
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)} ${MONTHS_SHORT_FR[parseInt(m, 10) - 1]}`;
}

/** « 12 mars 2026 » via Intl, avec garde anti Invalid Date. */
export function formatLongDateFR(dateStr: unknown, fallback = '—'): string {
  if (!isValidDateStr(dateStr)) return fallback;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return fallback;
  try {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
