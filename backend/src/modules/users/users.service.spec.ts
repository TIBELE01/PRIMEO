// Tests unitaires pour usersService — toutes les I/O externes sont mockées.
// Parcours couverts : getById, update (client + pro), changePassword,
// deactivate, reactivate, deleteAccount (RGPD + garde réservations).

// ── Mocks — déclarés avant tout import ────────────────────────────────────────

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../common/utils/mailer', () => ({
  sendEmail: jest.fn(async () => undefined),
}));

jest.mock('../../common/utils/totp', () => ({
  generateTotpSecret: jest.fn(() => 'SECRET123'),
  generateTotpUri: jest.fn(() => 'otpauth://totp/...'),
  generateQrCode: jest.fn(async () => 'data:image/png;base64,xxx'),
  verifyTotp: jest.fn(() => true),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
  },
  professionalProfile: {
    upsert: jest.fn(async () => ({})),
  },
  auditLog: {
    create: jest.fn(async () => ({})),
  },
  pushToken: {
    deleteMany: jest.fn(async () => ({ count: 0 })),
  },
  $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

const mockSupabaseAdmin = {
  auth: {
    admin: {
      deleteUser: jest.fn(async () => ({})),
      updateUserById: jest.fn(async () => ({ error: null })),
      getUserById: jest.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: {} } }, error: null })),
    },
  },
};
const mockSupabaseAuth = {
  auth: {
    signInWithPassword: jest.fn(
      async (): Promise<{ error: { message: string } | null }> => ({ error: null }),
    ),
  },
};
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabaseAuth: mockSupabaseAuth,
}));

// ── Imports après les mocks ──────────────────────────────────────────────────

import { usersService } from './users.service';
import { sendEmail } from '../../common/utils/mailer';

const CLIENT = {
  id: 'user-1',
  email: 'jean@example.com',
  phone: '+2250700000000',
  firstName: 'Jean',
  lastName: 'Kouassi',
  accountType: 'client',
  status: 'active',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabaseAuth.auth.signInWithPassword.mockImplementation(async () => ({ error: null }));
  mockSupabaseAdmin.auth.admin.updateUserById.mockImplementation(async () => ({ error: null }));
  mockSupabaseAdmin.auth.admin.getUserById.mockImplementation(async () => ({
    data: { user: { id: 'user-1', user_metadata: {} } },
    error: null,
  }));
  mockSupabaseAdmin.auth.admin.deleteUser.mockImplementation(async () => ({}));
  mockPrisma.user.update.mockImplementation(async (args: any) => ({ id: args.where.id, ...args.data }));
  mockPrisma.professionalProfile.upsert.mockImplementation(async () => ({}));
  mockPrisma.auditLog.create.mockImplementation(async () => ({}));
  mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
});

describe('usersService.getById', () => {
  it('retourne le profil utilisateur (plus aucun champ sensible en base)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT });
    const result = await usersService.getById('user-1') as Record<string, unknown>;
    expect(result.email).toBe('jean@example.com');
  });

  it('lève 404 si introuvable', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(usersService.getById('absent')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('usersService.update', () => {
  it('met à jour les champs personnels du client et journalise', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ accountType: 'client', firstName: 'Jean', lastName: 'K', email: 'jean@example.com' })
      .mockResolvedValueOnce({ ...CLIENT, firstName: 'Paul' });
    await usersService.update('user-1', { firstName: 'Paul' });
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.professionalProfile.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'user.profile_updated' }) }),
    );
  });

  it('upsert le profil pro pour un professionnel', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ accountType: 'professional_hotel', firstName: 'H', lastName: 'M', email: 'h@m.com' })
      .mockResolvedValueOnce({ ...CLIENT, accountType: 'professional_hotel' });
    await usersService.update('user-1', { businessName: 'Hôtel Ivoire', rccm: 'CI-123' });
    expect(mockPrisma.professionalProfile.upsert).toHaveBeenCalled();
  });
});

describe('usersService.changePassword', () => {
  it('refuse si le mot de passe actuel est incorrect (rejet Supabase)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(CLIENT);
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });
    await expect(
      usersService.changePassword('user-1', { currentPassword: 'WrongPass', newPassword: 'NewSecret123' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('change le mot de passe via Supabase et envoie un email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(CLIENT);
    await usersService.changePassword('user-1', { currentPassword: 'Secret123', newPassword: 'NewSecret123' });
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-1',
      { password: 'NewSecret123' },
    );
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe('usersService.deactivate / reactivate', () => {
  it('désactive pour 1 semaine avec date butoir et email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(CLIENT);
    await usersService.deactivate('user-1', { duration: '1_week' });
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data.status).toBe('suspended');
    expect(call.data.deactivatedUntil).toBeInstanceOf(Date);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('refuse de désactiver un compte déjà suspendu', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT, status: 'suspended' });
    await expect(usersService.deactivate('user-1', { duration: 'indefinite' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('réactive le compte (status active, deactivatedUntil null)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT, status: 'suspended' });
    await usersService.reactivate('user-1');
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data.status).toBe('active');
    expect(call.data.deactivatedUntil).toBeNull();
  });
});

describe('usersService.deleteAccount', () => {
  it('refuse si le mot de passe est incorrect (rejet Supabase)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT, clientBookings: [] });
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });
    await expect(
      usersService.deleteAccount('user-1', { password: 'WrongPass' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('bloque la suppression si des réservations futures existent', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT, clientBookings: [{ id: 'b1' }] });
    await expect(
      usersService.deleteAccount('user-1', { password: 'Secret123' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('anonymise les données (RGPD) et supprime de Supabase Auth', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...CLIENT, clientBookings: [] });
    await usersService.deleteAccount('user-1', { password: 'Secret123' });
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data.firstName).toBe('Compte');
    expect(call.data.lastName).toBe('Supprimé');
    expect(call.data.status).toBe('banned');
    expect(call.data.email).toContain('@deleted.primeo.ci');
    expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe('usersService.2FA', () => {
  it('setup2fa génère un secret, un QR code et stocke le secret dans Supabase user_metadata', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(CLIENT);
    const res = await usersService.setup2fa('user-1');
    expect(res.secret).toBe('SECRET123');
    expect(res.qrCode).toContain('data:image');
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-1',
      { user_metadata: { twoFactorSecret: 'SECRET123', twoFactorEnabled: false } },
    );
  });

  it('confirm2fa active le 2FA dans Supabase user_metadata quand le code est valide', async () => {
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: 'user-1', user_metadata: { twoFactorSecret: 'SECRET123' } } },
      error: null,
    });
    await usersService.confirm2fa('user-1', '123456');
    expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-1',
      { user_metadata: { twoFactorSecret: 'SECRET123', twoFactorEnabled: true } },
    );
  });
});
