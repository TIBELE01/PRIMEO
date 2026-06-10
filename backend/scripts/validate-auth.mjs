#!/usr/bin/env node
// Validation E2E de l'authentification Supabase — à exécuter depuis un
// environnement ayant accès réseau à l'API Primeo et à Supabase.
//
// Usage :
//   API_URL=https://primeo-api.onrender.com \
//   SUPABASE_URL=https://<projet>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//   node scripts/validate-auth.mjs
//
// Le script crée des comptes de test jetables (suffixe horodaté), déroule les
// parcours critiques, puis supprime les comptes créés via l'API admin Supabase.

const API = process.env.API_URL ?? 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stamp = Date.now();
const results = [];
const createdUserIds = [];

function ok(name, detail = '') { results.push({ name, ok: true, detail }); console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); }
function ko(name, detail = '') { results.push({ name, ok: false, detail }); console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }

async function api(method, path, { body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* réponse vide */ }
  return { status: res.status, json };
}

// Suppression d'un utilisateur de test (Supabase Auth + cascade backend si besoin)
async function deleteSupabaseUser(userId) {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  }).catch(() => null);
}

async function main() {
  console.log(`\n— Validation auth Primeo contre ${API} —\n`);

  // ── 1. Inscription client : tokens immédiats, aucun OTP ──────────────────────
  const clientEmail = `validation.client.${stamp}@primeo-test.ci`;
  const clientPassword = `Vt!${stamp}aB#9`;
  const reg = await api('POST', '/api/auth/register', {
    body: {
      email: clientEmail,
      phone: `+2250100${String(stamp).slice(-6)}`,
      password: clientPassword,
      firstName: 'Validation',
      lastName: 'Client',
      accountType: 'client',
    },
  });
  let clientToken = null;
  let clientRefresh = null;
  if (reg.status < 300 && reg.json?.accessToken) {
    clientToken = reg.json.accessToken;
    clientRefresh = reg.json.refreshToken;
    if (reg.json.user?.id) createdUserIds.push(reg.json.user.id);
    ok('Inscription client sans OTP', `tokens reçus, user ${reg.json.user?.id ?? '?'}`);
  } else {
    ko('Inscription client sans OTP', `HTTP ${reg.status} ${JSON.stringify(reg.json)?.slice(0, 200)}`);
  }

  // ── 2. Connexion client : JWT accepté par le middleware ──────────────────────
  const login = await api('POST', '/api/auth/login', { body: { email: clientEmail, password: clientPassword } });
  if (login.status === 200 && login.json?.accessToken) {
    clientToken = login.json.accessToken;
    ok('Connexion client (email/mdp)');
  } else {
    ko('Connexion client (email/mdp)', `HTTP ${login.status}`);
  }

  if (clientToken) {
    const me = await api('GET', '/api/users/me', { token: clientToken });
    me.status === 200
      ? ok('Middleware accepte le JWT Supabase', `GET /api/users/me → 200`)
      : ko('Middleware accepte le JWT Supabase', `HTTP ${me.status}`);

    // ── 3. Cloisonnement des rôles : client → admin/pro interdits ─────────────
    const adm = await api('GET', '/api/admin/users', { token: clientToken });
    adm.status === 403
      ? ok('Client bloqué sur route admin', '403 attendu')
      : ko('Client bloqué sur route admin', `HTTP ${adm.status} (403 attendu)`);

    const pro = await api('GET', '/api/professional/profile', { token: clientToken });
    pro.status === 403
      ? ok('Client bloqué sur route professionnelle', '403 attendu')
      : ko('Client bloqué sur route professionnelle', `HTTP ${pro.status} (403 attendu)`);
  }

  // ── 4. Rafraîchissement de session (rotation Supabase) ───────────────────────
  if (clientRefresh) {
    const ref = await api('POST', '/api/auth/refresh', { body: { refreshToken: clientRefresh } });
    ref.status === 200 && ref.json?.accessToken
      ? ok('Rafraîchissement de session', 'nouveaux tokens émis')
      : ko('Rafraîchissement de session', `HTTP ${ref.status}`);
  }

  // ── 5. Inscription professionnel : OTP requis, pas de session immédiate ─────
  const proReg = await api('POST', '/api/auth/register', {
    body: {
      email: `validation.pro.${stamp}@primeo-test.ci`,
      phone: `+2250101${String(stamp).slice(-6)}`,
      password: `Vt!${stamp}aB#9`,
      firstName: 'Validation',
      lastName: 'Pro',
      accountType: 'professional_hebergement',
      businessName: 'Résidence Validation',
    },
  });
  if (proReg.status < 300 && !proReg.json?.accessToken && /code|SMS/i.test(proReg.json?.message ?? proReg.json?.message ?? '')) {
    ok('Inscription pro déclenche l’OTP SMS', 'aucune session avant vérification');
  } else if (proReg.status < 300 && proReg.json?.accessToken) {
    ko('Inscription pro déclenche l’OTP SMS', 'session émise SANS OTP — bypass actif ?');
    if (proReg.json.user?.id) createdUserIds.push(proReg.json.user.id);
  } else {
    ko('Inscription pro déclenche l’OTP SMS', `HTTP ${proReg.status} ${JSON.stringify(proReg.json)?.slice(0, 200)}`);
  }

  // ── 6. Mot de passe oublié : réponse générique sans fuite d'existence ───────
  const forgot = await api('POST', '/api/auth/forgot-password', { body: { email: clientEmail } });
  forgot.status < 300
    ? ok('Demande de réinitialisation de mot de passe', 'lien Supabase + email Brevo')
    : ko('Demande de réinitialisation de mot de passe', `HTTP ${forgot.status}`);

  // ── 7. Token invalide refusé ─────────────────────────────────────────────────
  const bad = await api('GET', '/api/users/me', { token: 'jeton.invalide.xxx' });
  bad.status === 401
    ? ok('JWT invalide rejeté', '401 attendu')
    : ko('JWT invalide rejeté', `HTTP ${bad.status} (401 attendu)`);

  // ── Nettoyage des comptes de test ────────────────────────────────────────────
  for (const id of createdUserIds) await deleteSupabaseUser(id);
  if (createdUserIds.length) console.log(`\n  🧹 ${createdUserIds.length} compte(s) de test supprimé(s) de Supabase Auth.`);
  console.log('  ⚠️  Supprimez aussi les lignes public.users correspondantes si le webhook de cascade n’est pas en place.');

  // ── Bilan ────────────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n— Bilan : ${results.length - failed.length}/${results.length} réussis —\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error('Erreur fatale :', err); process.exit(1); });
