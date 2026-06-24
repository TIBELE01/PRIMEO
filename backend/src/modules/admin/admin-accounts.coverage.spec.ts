// Tests — gestion des comptes administrateurs : garde super_admin + validations.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

const mockCreateUser = jest.fn();
const mockUpdateUserById = jest.fn();
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: { auth: { admin: {
    createUser: (...a: unknown[]) => mockCreateUser(...a),
    updateUserById: (...a: unknown[]) => mockUpdateUserById(...a),
  } } },
}));

jest.mock('./admin.service', () => ({ createAudit: jest.fn() }));

import { listAdminAccounts, createAdminAccount, updateAdminAccount } from './admin-accounts.controller';

function mockRes() {
  const r: Record<string, jest.Mock> = {};
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r as unknown as import('express').Response & { status: jest.Mock; json: jest.Mock };
}
const next = jest.fn();
const SUPER = { accountType: 'admin', adminRole: 'super_admin' };

beforeEach(() => jest.clearAllMocks());

describe('garde super_admin', () => {
  it('refuse un sous-rôle non super_admin (403)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'admin', adminRole: 'moderateur' });
    await listAdminAccounts({ user: { sub: 'u1' } } as never, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('traite adminRole null comme super_admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'admin', adminRole: null });
    mockPrisma.user.findMany.mockResolvedValue([]);
    const res = mockRes();
    await listAdminAccounts({ user: { sub: 'u1' } } as never, res, next);
    expect(res.json).toHaveBeenCalledWith({ accounts: [] });
  });
});

describe('createAdminAccount', () => {
  beforeEach(() => mockPrisma.user.findUnique.mockResolvedValue(SUPER));

  it('rejette un rôle invalide (400)', async () => {
    const req = { user: { sub: 'u1' }, body: { email: 'a@b.co', firstName: 'A', lastName: 'B', password: '12345678', role: 'hacker' } };
    await createAdminAccount(req as never, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejette un mot de passe trop court (400)', async () => {
    const req = { user: { sub: 'u1' }, body: { email: 'a@b.co', firstName: 'A', lastName: 'B', password: '123', role: 'support' } };
    await createAdminAccount(req as never, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejette un email déjà utilisé (409)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'x' });
    const req = { user: { sub: 'u1' }, body: { email: 'a@b.co', firstName: 'A', lastName: 'B', password: '12345678', role: 'support' } };
    await createAdminAccount(req as never, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('crée le compte via Supabase + Prisma (201)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'newid' } }, error: null });
    mockPrisma.user.create.mockResolvedValue({
      id: 'newid', email: 'a@b.co', firstName: 'A', lastName: 'B',
      adminRole: 'support', status: 'active', createdAt: new Date(),
    });
    const res = mockRes();
    const req = { user: { sub: 'u1' }, body: { email: 'A@B.co', firstName: 'A', lastName: 'B', password: '12345678', role: 'support' } };
    await createAdminAccount(req as never, res, next);
    expect(mockCreateUser).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'newid', role: 'support', isActive: true }));
  });
});

describe('updateAdminAccount', () => {
  beforeEach(() => mockPrisma.user.findUnique.mockResolvedValue(SUPER));

  it('empêche de modifier son propre compte (400)', async () => {
    const req = { user: { sub: 'u1' }, params: { id: 'u1' }, body: { isActive: false } };
    await updateAdminAccount(req as never, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('désactive un autre admin (status suspended)', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(SUPER)                                  // assertSuperAdmin (acteur)
      .mockResolvedValueOnce({ accountType: 'admin' });             // cible
    mockPrisma.user.update.mockResolvedValue({
      id: 'u2', email: 'c@d.co', firstName: 'C', lastName: 'D',
      adminRole: 'support', status: 'suspended', createdAt: new Date(),
    });
    const res = mockRes();
    const req = { user: { sub: 'u1' }, params: { id: 'u2' }, body: { isActive: false } };
    await updateAdminAccount(req as never, res, next);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u2' }, data: expect.objectContaining({ status: 'suspended' }),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });
});
