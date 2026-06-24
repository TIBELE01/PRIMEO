// Gestion des comptes administrateurs — list / create / update.
// Réservé au super_admin (vérifié côté serveur), en plus du gate authorize('admin')
// du routeur. Création sécurisée via l'API Admin Supabase + traçabilité (audit log).
import { Request, Response, NextFunction } from 'express';
import { AccountType, UserStatus } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { supabaseAdmin } from '../../config/supabase.config';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';
import { createAudit } from './admin.service';

const ADMIN_ROLES = ['super_admin', 'moderateur', 'support', 'analyste'] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

function roleOf(u: { adminRole: string | null }): AdminRole {
  return (u.adminRole as AdminRole | null) ?? 'super_admin';
}

// Garantit que l'appelant est un super_admin ; renvoie son id.
async function assertSuperAdmin(req: Request): Promise<string> {
  const me = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { accountType: true, adminRole: true },
  });
  if (!me || me.accountType !== AccountType.admin) throw new HttpError(403, 'Accès réservé aux administrateurs');
  if (roleOf(me) !== 'super_admin') throw new HttpError(403, 'Action réservée au Super Admin');
  return req.user!.sub;
}

type AdminRow = {
  id: string; email: string; firstName: string; lastName: string;
  adminRole: string | null; status: string; createdAt: Date;
};

function serialize(u: AdminRow) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: roleOf(u),
    isActive: u.status === UserStatus.active,
    createdAt: u.createdAt,
    lastLoginAt: null, // pas de suivi de dernière connexion en base pour l'instant
  };
}

const ADMIN_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  adminRole: true, status: true, createdAt: true,
} as const;

export async function listAdminAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertSuperAdmin(req);
    const admins = await prisma.user.findMany({
      where: { accountType: AccountType.admin },
      select: ADMIN_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ accounts: admins.map(serialize) });
  } catch (err) { next(err); }
}

export async function createAdminAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = await assertSuperAdmin(req);
    const { email, firstName, lastName, role, password } = (req.body ?? {}) as Record<string, unknown>;

    if (!email || !firstName || !lastName) throw new HttpError(400, 'Email, prénom et nom sont requis');
    if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Mot de passe : 8 caractères minimum');
    if (typeof role !== 'string' || !ADMIN_ROLES.includes(role as AdminRole)) throw new HttpError(400, 'Rôle invalide');

    const normEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email: { equals: normEmail, mode: 'insensitive' } } });
    if (existing) throw new HttpError(409, 'Un compte avec cet email existe déjà');

    // 1) Création du compte Supabase Auth (email confirmé, rôle admin + sous-rôle)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normEmail,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin', adminRole: role },
    });
    if (createError || !createData.user) {
      logger.error('Erreur création admin Supabase', { email: normEmail, error: createError?.message });
      throw new HttpError(500, 'Erreur lors de la création du compte administrateur');
    }

    // 2) Profil applicatif (même id que Supabase)
    const user = await prisma.user.create({
      data: {
        id: createData.user.id,
        email: normEmail,
        phone: null,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        accountType: AccountType.admin,
        adminRole: role,
        status: UserStatus.active,
      },
      select: ADMIN_SELECT,
    });

    await createAudit({
      adminId, action: 'admin.account.create', targetType: 'user', targetId: user.id,
      description: `Compte administrateur créé (${role}) : ${normEmail}`,
    });
    logger.info(`Admin account created: ${normEmail} role=${role} by=${adminId}`);
    res.status(201).json(serialize(user));
  } catch (err) { next(err); }
}

export async function updateAdminAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = await assertSuperAdmin(req);
    const { id } = req.params;
    const { role, isActive } = (req.body ?? {}) as { role?: string; isActive?: boolean };

    if (id === adminId) throw new HttpError(400, 'Vous ne pouvez pas modifier votre propre compte');

    const target = await prisma.user.findUnique({ where: { id }, select: { accountType: true } });
    if (!target || target.accountType !== AccountType.admin) throw new HttpError(404, 'Compte administrateur introuvable');

    const data: { adminRole?: string; status?: UserStatus } = {};
    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role as AdminRole)) throw new HttpError(400, 'Rôle invalide');
      data.adminRole = role;
    }
    if (isActive !== undefined) {
      data.status = isActive ? UserStatus.active : UserStatus.suspended;
    }
    if (Object.keys(data).length === 0) throw new HttpError(400, 'Aucune modification fournie');

    const updated = await prisma.user.update({ where: { id }, data, select: ADMIN_SELECT });

    // Synchronise le sous-rôle dans Supabase app_metadata (best-effort, non bloquant)
    if (data.adminRole) {
      await supabaseAdmin.auth.admin
        .updateUserById(id, { app_metadata: { role: 'admin', adminRole: data.adminRole } })
        .catch((e) => logger.warn(`Sync app_metadata admin échouée (${id})`, e));
    }

    await createAudit({
      adminId, action: 'admin.account.update', targetType: 'user', targetId: id,
      description: `Compte administrateur modifié : ${JSON.stringify(data)}`,
    });
    res.json(serialize(updated));
  } catch (err) { next(err); }
}
