// Tests unitaires — middleware authenticate : statut du compte (banni / suspendu / désactivé)

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@sentry/node', () => ({ captureMessage: jest.fn(), setUser: jest.fn() }));

const mockIsSessionVerified = jest.fn();
jest.mock('../utils/two-factor', () => ({
  isTwoFactorEnforced: (u: { app_metadata?: { twoFactorEnabled?: boolean } }) => u?.app_metadata?.twoFactorEnabled === true,
  isSessionVerified: (...a: unknown[]) => mockIsSessionVerified(...a),
}));

const mockGetUser = jest.fn();
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) } },
}));

const mockFindUnique = jest.fn();
jest.mock('../../database/prisma.service', () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}));

import type { Request, Response } from 'express';
import { authenticate } from './jwt-auth.middleware';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer tok' },
    method: 'GET',
    baseUrl: '/api/bookings',
    path: '/',
    ip: '1.2.3.4',
    ...overrides,
  } as unknown as Request;
}

async function run(req: Request) {
  const next = jest.fn();
  await authenticate(req, {} as Response, next);
  return next.mock.calls[0]?.[0] as { statusCode?: number; details?: { code?: string } } | undefined;
}

describe('authenticate — statut du compte', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.ci', app_metadata: { role: 'client' } } },
      error: null,
    });
  });

  it('laisse passer un compte actif', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'active', suspendedByAdmin: false });
    const req = makeReq();
    expect(await run(req)).toBeUndefined();
    expect(req.user).toEqual({ sub: 'u1', email: 'a@b.ci', role: 'client' });
  });

  it('laisse passer un compte pro en attente de validation (pending)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.ci', app_metadata: { role: 'restaurateur' } } },
      error: null,
    });
    mockFindUnique.mockResolvedValue({ accountType: 'restaurateur', status: 'pending', suspendedByAdmin: false });
    expect(await run(makeReq())).toBeUndefined();
  });

  it('refuse (403) un compte banni même avec un jeton valide', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'banned', suspendedByAdmin: false });
    const req = makeReq();
    const err = await run(req);
    expect(err).toMatchObject({ statusCode: 403, details: { code: 'ACCOUNT_BANNED' } });
    expect(req.user).toBeUndefined();
  });

  it('refuse (403) un compte suspendu par un admin, y compris sur la route de réactivation', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'suspended', suspendedByAdmin: true });
    expect(await run(makeReq())).toMatchObject({ statusCode: 403, details: { code: 'ACCOUNT_SUSPENDED' } });
    const reactivation = makeReq({ method: 'POST', baseUrl: '/api/users', path: '/me/reactivate' });
    expect(await run(reactivation)).toMatchObject({ statusCode: 403, details: { code: 'ACCOUNT_SUSPENDED' } });
  });

  it('refuse (403) un compte désactivé volontairement sur les routes ordinaires', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'suspended', suspendedByAdmin: false });
    expect(await run(makeReq())).toMatchObject({ statusCode: 403, details: { code: 'ACCOUNT_DEACTIVATED' } });
  });

  it('autorise un compte désactivé volontairement à appeler sa réactivation', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'suspended', suspendedByAdmin: false });
    const req = makeReq({ method: 'POST', baseUrl: '/api/users', path: '/me/reactivate' });
    expect(await run(req)).toBeUndefined();
    expect(req.user?.sub).toBe('u1');
  });

  it('refuse (403) quand le rôle Supabase diverge du rôle en base', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'admin', status: 'active', suspendedByAdmin: false });
    expect(await run(makeReq())).toMatchObject({ statusCode: 403 });
  });

  it('refuse (401) sans en-tête Authorization', async () => {
    expect(await run(makeReq({ headers: {} as Request['headers'] }))).toMatchObject({ statusCode: 401 });
  });

  // ── 2FA : session ouverte sans second facteur ───────────────────────────────

  describe('compte avec 2FA actif', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.ci', app_metadata: { role: 'client', twoFactorEnabled: true } } },
        error: null,
      });
      mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'active', suspendedByAdmin: false });
    });

    it('refuse (401) une session qui n\'a pas passé le second facteur', async () => {
      mockIsSessionVerified.mockResolvedValue(false);
      const req = makeReq();
      expect(await run(req)).toMatchObject({ statusCode: 401, details: { code: 'TWO_FACTOR_REQUIRED' } });
      expect(req.user).toBeUndefined();
    });

    it('accepte une session ayant passé le second facteur', async () => {
      mockIsSessionVerified.mockResolvedValue(true);
      expect(await run(makeReq())).toBeUndefined();
      expect(mockIsSessionVerified).toHaveBeenCalledWith('tok');
    });
  });

  it('ne consulte pas les sessions vérifiées pour un compte sans 2FA', async () => {
    mockFindUnique.mockResolvedValue({ accountType: 'client', status: 'active', suspendedByAdmin: false });
    expect(await run(makeReq())).toBeUndefined();
    expect(mockIsSessionVerified).not.toHaveBeenCalled();
  });
});
