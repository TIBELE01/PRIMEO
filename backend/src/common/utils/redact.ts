// Masquage des secrets pour les journaux et Sentry (sans dépendance : importable très tôt).
// ── Masquage des secrets ──────────────────────────────────────────────────────
// Une erreur axios contient sa configuration complète (en-têtes X-API-Key /
// X-API-Secret, Authorization…) : journalisée telle quelle, elle exposait les clés
// des prestataires (Genius Pay, OneSignal, Brevo…) dans les journaux. On résume les
// erreurs HTTP (méthode, URL, statut, réponse) et on masque toute valeur sensible.
const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|x-api-key|x-api-secret|api[-_]?key|api[-_]?secret|secret|client[-_]?secret|password|pass|token|access[-_]?token|refresh[-_]?token)$/i;
const SENSITIVE_VALUE = /\b(sk|pk)_(live|sandbox|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9_]+|Bearer\s+[A-Za-z0-9._-]{20,}|xkeysib-[A-Za-z0-9-]+/g;

function summarizeHttp(v: Record<string, any>): Record<string, unknown> {
  const cfg = v.config ?? {};
  return {
    method: typeof cfg.method === 'string' ? cfg.method.toUpperCase() : undefined,
    url: typeof cfg.url === 'string' ? cfg.url.split('?')[0] : undefined,
    status: v.response?.status ?? v.status,
    responseData: v.response?.data,
  };
}

export function redactSecrets(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return value.replace(SENSITIVE_VALUE, '[MASQUÉ]');
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value as object) || depth > 6) return '[…]';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((x) => redactSecrets(x, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(k)) { out[k] = '[MASQUÉ]'; continue; }
    if (k === 'request' || k === 'socket' || k === 'agent') continue; // objets réseau internes
    if (k === 'config' && v && typeof v === 'object' && ('headers' in (v as object) || 'url' in (v as object))) {
      out.http = summarizeHttp(value as Record<string, any>); continue;
    }
    if (k === 'response' && v && typeof v === 'object' && 'status' in (v as object)) continue; // résumé dans http
    out[k] = redactSecrets(v, depth + 1, seen);
  }
  return out;
}
