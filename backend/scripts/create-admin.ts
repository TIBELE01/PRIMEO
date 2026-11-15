/**
 * Crée (ou remet en conformité) un compte administrateur.
 *
 * L'authentification est assurée exclusivement par Supabase Auth : le compte est
 * créé dans Supabase avec app_metadata.role = "admin", puis sa fiche applicative
 * (table users) est créée avec le MÊME identifiant. Les deux doivent concorder :
 * le backend refuse un compte dont le rôle Supabase diffère du rôle en base.
 *
 * Paramètres (variables d'environnement, renseignées par scripts/create-admin.sh) :
 *   NEW_ADMIN_EMAIL, NEW_ADMIN_PASSWORD, NEW_ADMIN_FIRST_NAME, NEW_ADMIN_LAST_NAME,
 *   NEW_ADMIN_PHONE (facultatif), NEW_ADMIN_ROLE (défaut : super_admin)
 *
 * Usage direct (depuis backend/) : npx tsx scripts/create-admin.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['super_admin', 'moderateur', 'support', 'analyste'];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable ${name} manquante`);
  return value;
}

async function main(): Promise<void> {
  const email = required('NEW_ADMIN_EMAIL').toLowerCase();
  const password = required('NEW_ADMIN_PASSWORD');
  const firstName = required('NEW_ADMIN_FIRST_NAME');
  const lastName = required('NEW_ADMIN_LAST_NAME');
  const phone = process.env['NEW_ADMIN_PHONE']?.trim() || null;
  const adminRole = process.env['NEW_ADMIN_ROLE']?.trim() || 'super_admin';

  if (password.length < 12) throw new Error('Mot de passe trop court (minimum 12 caractères)');
  if (!ADMIN_ROLES.includes(adminRole)) throw new Error(`Rôle invalide. Valeurs : ${ADMIN_ROLES.join(', ')}`);

  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient();

  try {
    // 1. Compte Supabase Auth — création, ou reprise d'un compte existant
    let supabaseId: string;
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      ...(phone ? { phone, phone_confirm: true } : {}),
      email_confirm: true,
      app_metadata: { role: 'admin', adminRole },
    });

    if (!created.error && created.data.user) {
      supabaseId = created.data.user.id;
      console.log('Compte Supabase Auth créé.');
    } else {
      // Déjà inscrit : on le retrouve et on corrige son rôle et son mot de passe
      let existingId: string | null = null;
      for (let page = 1; !existingId; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw new Error(`Supabase listUsers : ${error.message}`);
        existingId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
        if (data.users.length < 200) break;
      }
      if (!existingId) throw new Error(`Création Supabase impossible : ${created.error?.message}`);

      const { data: current } = await supabase.auth.admin.getUserById(existingId);
      const updated = await supabase.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
        app_metadata: { ...(current?.user?.app_metadata ?? {}), role: 'admin', adminRole },
      });
      if (updated.error) throw new Error(`Mise à jour Supabase : ${updated.error.message}`);
      supabaseId = existingId;
      console.log('Compte Supabase Auth existant : rôle et mot de passe mis à jour.');
    }

    // 2. Fiche applicative — même identifiant que le compte Supabase
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail && byEmail.id !== supabaseId) {
      throw new Error(
        `Une fiche users existe déjà pour ${email} avec un autre identifiant (${byEmail.id}). ` +
          'Corrigez-la manuellement avant de relancer.',
      );
    }
    await prisma.user.upsert({
      where: { id: supabaseId },
      create: {
        id: supabaseId, email, phone, firstName, lastName,
        accountType: 'admin', adminRole, status: 'active',
      },
      update: { accountType: 'admin', adminRole, status: 'active', suspendedByAdmin: false, firstName, lastName },
    });

    console.log(`Compte administrateur prêt : ${email} (${adminRole})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(`Échec : ${(err as Error).message}`);
  process.exit(1);
});
