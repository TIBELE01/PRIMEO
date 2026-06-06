// Factory utilisateurs — données cohérentes pour les tests unitaires et e2e
import type { PrismaClient, User } from '@prisma/client';
import { AccountType, UserStatus, Gender } from '@prisma/client';

let _seq = 1;
function seq(): number {
  return _seq++;
}

// ─── Build factory (pas de DB) ────────────────────────────────────────────────

type BuildUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export function buildUser(overrides: BuildUserInput = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  const n = seq();
  return {
    email: `user${n}@test.ci`,
    phone: `+22507071${String(n).padStart(5, '0')}`,
    passwordHash: '$2b$12$mockedHashForTestingOnly00000000000000000000000000',
    firstName: 'Test',
    lastName: `User${n}`,
    birthDate: null,
    gender: null,
    avatarUrl: null,
    accountType: AccountType.client,
    extraRoles: null,
    status: UserStatus.active,
    walletBalance: 0,
    referralCode: `REF-TEST-${n}`,
    onesignalPlayerId: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    otpCode: null,
    otpExpiresAt: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    adminNotes: null,
    ...overrides,
  };
}

export function buildClientUser(overrides: BuildUserInput = {}) {
  return buildUser({ accountType: AccountType.client, ...overrides });
}

export function buildProfessionalUser(overrides: BuildUserInput = {}) {
  return buildUser({ accountType: AccountType.professional_hebergement, ...overrides });
}

export function buildAdminUser(overrides: BuildUserInput = {}) {
  return buildUser({ accountType: AccountType.admin, ...overrides });
}

export function buildRestaurateurUser(overrides: BuildUserInput = {}) {
  return buildUser({ accountType: AccountType.restaurateur, ...overrides });
}

// ─── Prisma factory (avec DB) ─────────────────────────────────────────────────

type CreateUserInput = BuildUserInput & { id?: string };

export async function createUser(
  prisma: PrismaClient,
  overrides: CreateUserInput = {},
): Promise<User> {
  const { id, ...data } = overrides;
  return prisma.user.create({
    data: {
      id: id ?? undefined,
      ...buildUser(data),
    },
  });
}

export async function createClientUser(prisma: PrismaClient, overrides: CreateUserInput = {}) {
  return createUser(prisma, { accountType: AccountType.client, ...overrides });
}

export async function createProfessionalUser(
  prisma: PrismaClient,
  overrides: CreateUserInput = {},
) {
  return createUser(prisma, { accountType: AccountType.professional_hebergement, ...overrides });
}

export async function createAdminUser(prisma: PrismaClient, overrides: CreateUserInput = {}) {
  return createUser(prisma, { accountType: AccountType.admin, ...overrides });
}

// ─── Personas seed (données fixes pour les tests d'intégration) ───────────────

export const PERSONA_CLIENT = buildUser({
  email: 'koffi.assi@test.ci',
  phone: '+2250707900001',
  firstName: 'Koffi',
  lastName: 'Assi',
  accountType: AccountType.client,
  gender: Gender.male,
});

export const PERSONA_PRO_HEBERGEMENT = buildUser({
  email: 'amina.coulibaly@test.ci',
  phone: '+2250707900002',
  firstName: 'Amina',
  lastName: 'Coulibaly',
  accountType: AccountType.professional_hebergement,
  gender: Gender.female,
});

export const PERSONA_HOTELIER = buildUser({
  email: 'dkone@test.ci',
  phone: '+2250707900003',
  firstName: 'Dramane',
  lastName: 'Koné',
  accountType: AccountType.professional_hebergement,
  gender: Gender.male,
  twoFactorEnabled: true,
  twoFactorSecret: 'JBSWY3DPEHPK3PXP',
});

export const PERSONA_RESTAURATRICE = buildUser({
  email: 'f.bamba@test.ci',
  phone: '+2250707900004',
  firstName: 'Fatoumata',
  lastName: 'Bamba',
  accountType: AccountType.restaurateur,
  gender: Gender.female,
});

export const PERSONA_IMMOBILIER = buildUser({
  email: 'm.diallo@test.ci',
  phone: '+2250707900005',
  firstName: 'Mariama',
  lastName: 'Diallo',
  accountType: AccountType.professional_immobilier,
  gender: Gender.female,
});

export const PERSONA_ADMIN = buildUser({
  email: 'admin@test.ci',
  phone: '+2250707900000',
  firstName: 'Super',
  lastName: 'Admin',
  accountType: AccountType.admin,
});
