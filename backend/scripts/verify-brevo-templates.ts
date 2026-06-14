/**
 * Task 58 — Vérification des templates email Brevo
 *
 * IMPORTANT : Primeo n'utilise PAS les templates du dashboard Brevo.
 * Les 11 templates sont rendus localement en HTML (renderLocalTemplate dans
 * src/common/utils/mailer.ts) puis envoyés via l'API transactionnelle Brevo en
 * HTML brut. Il n'y a donc AUCUN template à créer côté Brevo.
 *
 * Ce script :
 *   1. Liste les 11 IDs de templates référencés dans brevo.config.ts
 *   2. Vérifie que chacun possède un rendu local dédié (pas le fallback générique)
 *   3. Teste la connexion à l'API Brevo (clé valide) si BREVO_API_KEY est défini
 *
 * Usage :
 *   npx tsx scripts/verify-brevo-templates.ts
 */

import axios from 'axios';
import { brevoConfig } from '../src/config/brevo.config';
import { renderLocalTemplate } from '../src/common/utils/mailer';

// Paramètres factices pour forcer un rendu représentatif de chaque template
const SAMPLE_PARAMS: Record<string, unknown> = {
  firstName: 'Test', name: 'Test', otp: '123456',
  propertyTitle: 'Villa Test', bookingId: 'abcdef123456',
  startDate: '01/01/2026', endDate: '05/01/2026',
  totalAmount: '100 000 FCFA', amount: '100 000 FCFA',
  planName: 'Business', nextBillingDate: '01/02/2026',
  reward: '5 000 FCFA', resetUrl: 'https://primeo.ci/reset?token=x',
  reason: 'Document illisible',
};

async function main(): Promise<void> {
  const templates = brevoConfig.templates;
  const entries = Object.entries(templates);

  console.log('\n── Templates email Primeo (rendu local, pas de dashboard Brevo) ──\n');
  console.log(`${entries.length} clés de template référencées dans brevo.config.ts :\n`);

  // Dédupliquer les IDs (8 est partagé : subscriptionRenewal + boostExpiryReminder)
  const uniqueIds = [...new Set(entries.map(([, id]) => id))].sort((a, b) => a - b);

  let missing = 0;
  for (const [name, id] of entries) {
    const rendered = renderLocalTemplate(id, SAMPLE_PARAMS);
    // Le fallback générique a pour sujet exact "Notification Primeo"
    const isGeneric = rendered.subject === 'Notification Primeo';
    const status = isGeneric ? '⚠️  FALLBACK GÉNÉRIQUE' : '✓ rendu dédié';
    if (isGeneric) missing++;
    console.log(`  [${String(id).padStart(2)}] ${name.padEnd(22)} → ${status}`);
    if (!isGeneric) console.log(`       sujet : "${rendered.subject}"`);
  }

  console.log(`\nIDs uniques rendus localement : ${uniqueIds.join(', ')}`);
  if (missing > 0) {
    console.log(`\n⚠️  ${missing} template(s) sans rendu dédié — ajoutez un case dans renderLocalTemplate().`);
  } else {
    console.log('\n✅ Tous les templates ont un rendu HTML local dédié. Aucune action Brevo requise.');
  }

  // ── Test connexion API Brevo ────────────────────────────────────────────────
  if (!brevoConfig.apiKey) {
    console.log('\nℹ️  BREVO_API_KEY absent — connexion API non testée (envois désactivés).');
    return;
  }

  try {
    const res = await axios.get(`${brevoConfig.baseUrl}/account`, {
      headers: { 'api-key': brevoConfig.apiKey },
      timeout: 8_000,
    });
    const acc = res.data ?? {};
    console.log(`\n✅ Connexion Brevo OK — compte : ${acc.email ?? '(inconnu)'}`);
    console.log(`   Expéditeur configuré : ${brevoConfig.senderName} <${brevoConfig.senderEmail}>`);
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? `${err.response?.status ?? ''} ${err.response?.statusText ?? err.message}`
      : String(err);
    console.error(`\n❌ Échec connexion API Brevo : ${msg}`);
    console.error('   Vérifiez BREVO_API_KEY (https://app.brevo.com → SMTP & API → API Keys).');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('verify-brevo-templates: erreur inattendue', err);
  process.exit(1);
});
