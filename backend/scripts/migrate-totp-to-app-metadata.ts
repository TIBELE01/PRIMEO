/**
 * Migration 2FA : déplace l'état TOTP de `user_metadata` (modifiable par
 * l'utilisateur, secret en clair) vers `app_metadata` (clé service role
 * uniquement, secret chiffré AES-256-GCM).
 *
 * Les comptes sont aussi migrés automatiquement à leur prochaine connexion ;
 * ce script permet de tout traiter d'un coup, sans attendre.
 *
 * Usage (depuis backend/, avec le .env de l'environnement visé) :
 *   npx tsx scripts/migrate-totp-to-app-metadata.ts            # simulation (aucune écriture)
 *   npx tsx scripts/migrate-totp-to-app-metadata.ts --apply    # applique
 */
import 'dotenv/config';
import { supabaseAdmin } from '../src/config/supabase.config';
import { readTwoFactor, writeTwoFactor, type SupabaseUserLike } from '../src/common/utils/two-factor';

const APPLY = process.argv.includes('--apply');
const PER_PAGE = 200;

async function main(): Promise<void> {
  console.log(`Migration 2FA user_metadata → app_metadata (${APPLY ? 'APPLICATION' : 'simulation'})\n`);

  let page = 1;
  let scanned = 0;
  let migrated = 0;
  let cleaned = 0;
  let failed = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`listUsers page ${page} : ${error.message}`);
    const users = data.users as unknown as SupabaseUserLike[];
    if (users.length === 0) break;

    for (const user of users) {
      scanned += 1;
      const state = readTwoFactor(user);
      if (!state.legacy) continue; // déjà dans app_metadata, ou jamais configuré

      // 2FA actif → on le conserve ; configuration jamais confirmée → on efface le secret en clair.
      const target = state.enabled ? { enabled: true, secret: state.secret } : { enabled: false, secret: null };
      console.log(`  ${user.id} : ${state.enabled ? '2FA actif → migré' : 'configuration non confirmée → nettoyée'}`);

      if (!APPLY) {
        if (state.enabled) migrated += 1; else cleaned += 1;
        continue;
      }
      try {
        await writeTwoFactor(user, target);
        if (state.enabled) migrated += 1; else cleaned += 1;
      } catch (err) {
        failed += 1;
        console.error(`  ${user.id} : ÉCHEC — ${(err as Error).message}`);
      }
    }

    if (users.length < PER_PAGE) break;
    page += 1;
  }

  console.log(`\n${scanned} compte(s) parcouru(s) — ${migrated} migré(s), ${cleaned} nettoyé(s), ${failed} échec(s).`);
  if (!APPLY) console.log('Simulation : relancez avec --apply pour écrire les changements.');
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
