/**
 * Script de migration TOTP : déplace twoFactorEnabled + twoFactorSecret
 * depuis les colonnes Prisma vers user_metadata Supabase.
 *
 * Étapes :
 *   1. Lister les users avec twoFactorEnabled=true ou twoFactorSecret non null
 *   2. Pour chacun, appeler supabaseAdmin.auth.admin.updateUserById
 *   3. Vérifier la cohérence auth.users ↔ public.users
 *   4. Confirmer que la migration SQL peut s'exécuter en sécurité
 *
 * Usage : npx ts-node -r tsconfig-paths/register scripts/migrate-totp-to-supabase.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Migration TOTP Prisma → Supabase user_metadata');
  console.log('══════════════════════════════════════════════════\n');

  // ─── Étape 1 : Utilisateurs avec 2FA dans Prisma ────────────────────────────
  console.log('📋 Étape 1 — Utilisateurs avec TOTP configuré en base Prisma…');

  const usersWithTotp = await (prisma as any).user.findMany({
    where: {
      OR: [
        { twoFactorEnabled: true },
        { twoFactorSecret: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  console.log(`   → ${usersWithTotp.length} utilisateur(s) avec TOTP trouvé(s) en base Prisma`);

  if (usersWithTotp.length > 0) {
    for (const u of usersWithTotp) {
      console.log(`     • ${u.email} | enabled=${u.twoFactorEnabled} | secret=${u.twoFactorSecret ? '****' + u.twoFactorSecret.slice(-4) : 'null'}`);
    }
  }

  // ─── Étape 2 : Migration vers Supabase user_metadata ──────────────────────
  if (usersWithTotp.length > 0) {
    console.log('\n🔄 Étape 2 — Migration vers Supabase user_metadata…');
    let ok = 0;
    let failed = 0;

    for (const u of usersWithTotp) {
      if (!u.twoFactorSecret) continue; // pas de secret = rien à migrer

      // Lire les user_metadata existants pour ne pas les écraser
      const { data: { user: sbUser }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(u.id);

      if (getErr || !sbUser) {
        console.log(`   ❌ ${u.email} — introuvable dans Supabase Auth (${getErr?.message ?? 'not found'})`);
        failed++;
        continue;
      }

      const existingMeta = sbUser.user_metadata ?? {};

      // Ne migrer que si pas déjà dans user_metadata
      if (existingMeta.twoFactorSecret) {
        console.log(`   ⏩ ${u.email} — déjà migré dans user_metadata (skip)`);
        ok++;
        continue;
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
        user_metadata: {
          ...existingMeta,
          twoFactorEnabled: u.twoFactorEnabled,
          twoFactorSecret:  u.twoFactorSecret,
        },
      });

      if (updateErr) {
        console.log(`   ❌ ${u.email} — erreur update user_metadata : ${updateErr.message}`);
        failed++;
      } else {
        console.log(`   ✅ ${u.email} — TOTP migré vers user_metadata`);
        ok++;
      }
    }

    console.log(`\n   Migration : ${ok} ok, ${failed} échec(s)`);
  } else {
    console.log('   → Aucune migration TOTP nécessaire.\n');
  }

  // ─── Étape 3 : Cohérence auth.users ↔ public.users ────────────────────────
  console.log('\n🔍 Étape 3 — Vérification cohérence auth.users ↔ public.users…');

  // Charger tous les users Prisma
  const prismaUsers = await (prisma as any).user.findMany({
    select: { id: true, email: true, accountType: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`   → ${prismaUsers.length} utilisateur(s) dans public.users (Prisma)`);

  // Charger tous les users Supabase
  const { data: supabaseUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.log(`   ❌ Impossible de lister les users Supabase : ${listErr.message}`);
  } else {
    console.log(`   → ${supabaseUsers.users.length} utilisateur(s) dans auth.users (Supabase)`);

    const supabaseIds = new Set(supabaseUsers.users.map((u) => u.id));
    const supabaseEmails = new Set(supabaseUsers.users.map((u) => u.email));

    // Users Prisma sans correspondance Supabase
    const orphanPrisma = prismaUsers.filter((u: any) => !supabaseIds.has(u.id) && !u.email.endsWith('@deleted.primeo.ci'));
    if (orphanPrisma.length > 0) {
      console.log(`\n   ⚠️  ${orphanPrisma.length} user(s) Prisma SANS entrée Supabase Auth :`);
      for (const u of orphanPrisma) {
        console.log(`      • [${u.accountType}] ${u.email} (${u.status})`);
      }
    } else {
      console.log('   ✅ Tous les users Prisma ont une entrée dans Supabase Auth');
    }

    // Users Supabase sans correspondance Prisma
    const orphanSupabase = supabaseUsers.users.filter((u) => !prismaUsers.some((p: any) => p.id === u.id));
    if (orphanSupabase.length > 0) {
      console.log(`\n   ⚠️  ${orphanSupabase.length} user(s) Supabase SANS entrée Prisma :`);
      for (const u of orphanSupabase) {
        console.log(`      • ${u.email} (role=${u.app_metadata?.role ?? 'none'})`);
      }
    } else {
      console.log('   ✅ Tous les users Supabase ont une entrée dans Prisma');
    }
  }

  // ─── Étape 4 : Feu vert pour la migration SQL ─────────────────────────────
  console.log('\n✅ Étape 4 — Bilan et feu vert pour la migration SQL…\n');

  // Vérifier si les colonnes existent encore (si la migration a déjà tourné, elles n'existent plus)
  let columnsExist = false;
  try {
    await (prisma as any).$queryRaw`SELECT "twoFactorEnabled" FROM "users" LIMIT 0`;
    columnsExist = true;
  } catch {
    columnsExist = false;
  }

  if (!columnsExist) {
    console.log('   ℹ️  Les colonnes legacy ont déjà été supprimées. Migration SQL déjà appliquée.');
  } else {
    const usersWithTotpEnabled = await (prisma as any).user.count({ where: { twoFactorEnabled: true } });
    const usersWithSecret      = await (prisma as any).user.count({ where: { twoFactorSecret: { not: null } } });
    const usersWithResetToken  = await (prisma as any).user.count({ where: { resetToken: { not: null } } });
    const usersWithPasswordHash = await (prisma as any).user.count({ where: { NOT: { passwordHash: { in: ['supabase_managed', '[DELETED]', ''] } } } });

    console.log('   Données restantes dans les colonnes legacy :');
    console.log(`   • twoFactorEnabled=true : ${usersWithTotpEnabled} user(s)`);
    console.log(`   • twoFactorSecret≠null  : ${usersWithSecret} user(s)`);
    console.log(`   • resetToken≠null       : ${usersWithResetToken} user(s)`);
    console.log(`   • passwordHash legacy   : ${usersWithPasswordHash} user(s) (hashes bcrypt non supabase_managed)`);

    const safeToRun = usersWithTotpEnabled === 0 && usersWithSecret === 0;
    console.log(safeToRun
      ? '\n   ✅ FEU VERT — La migration SQL peut s\'exécuter en sécurité.'
      : '\n   ❌ ATTENTION — Des données TOTP non migrées sont encore présentes. Relancez ce script.',
    );
  }

  console.log('\n══════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('ERREUR FATALE :', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
