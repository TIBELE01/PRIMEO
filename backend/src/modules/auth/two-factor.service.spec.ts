// Tests unitaires — service 2FA + stockage (app_metadata chiffré) + sessions vérifiées

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({
  env: { SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key' },
}));

const redisStore = new Map<string, string>();
let redisConfigured = true;
const fakeRedisClient = {
  get: jest.fn(async (k: string) => redisStore.get(k) ?? null),
  incr: jest.fn(async (k: string) => {
    const n = Number(redisStore.get(k) ?? 0) + 1;
    redisStore.set(k, String(n));
    return n;
  }),
  expire: jest.fn(async () => 1),
  del: jest.fn(async (k: string) => { redisStore.delete(k); return 1; }),
};
jest.mock('../../common/utils/redis-client', () => ({
  getRedisClient: jest.fn(() => (redisConfigured ? fakeRedisClient : null)),
  redisGet: jest.fn(async (k: string) => redisStore.get(k) ?? null),
  redisSet: jest.fn(async (k: string, v: string) => { redisStore.set(k, v); }),
  redisDel: jest.fn(async (k: string) => { redisStore.delete(k); }),
}));

const mockVerifyTotp = jest.fn(() => true);
jest.mock('../../common/utils/totp', () => ({
  generateTotpSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateTotpUri: jest.fn(() => 'otpauth://totp/x'),
  generateQrCode: jest.fn(async () => 'data:image/png;base64,abc'),
  verifyTotp: (...a: unknown[]) => mockVerifyTotp(...(a as [])),
}));

const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn(async () => ({ data: {}, error: null }));
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: (...a: unknown[]) => mockGetUserById(...a),
        updateUserById: (...a: unknown[]) => mockUpdateUserById(...(a as [])),
      },
    },
  },
}));

const mockUserFindUnique = jest.fn();
jest.mock('../../database/prisma.service', () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) } },
}));

import { twoFactorService, TOTP_MAX_ATTEMPTS } from './two-factor.service';
import {
  readTwoFactor,
  getSessionId,
  markSessionVerified,
  isSessionVerified,
} from '../../common/utils/two-factor';
import { encryptSecret, decryptSecret } from '../../common/utils/secret-crypto';

type UpdateCall = [string, { app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown> }];
const lastUpdate = () => (mockUpdateUserById.mock.calls.at(-1) as unknown as UpdateCall)[1];

// Jeton factice au format JWT (seul le payload est lu)
const jwt = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

function sbUser(app: Record<string, unknown> = {}, userMeta: Record<string, unknown> = {}) {
  return { data: { user: { id: 'u1', app_metadata: { role: 'client', ...app }, user_metadata: userMeta } }, error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  redisStore.clear();
  redisConfigured = true;
  mockVerifyTotp.mockReturnValue(true);
  mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'a@b.ci' });
});

describe('readTwoFactor', () => {
  it('lit le secret chiffré depuis app_metadata', () => {
    const state = readTwoFactor({
      id: 'u1',
      app_metadata: { twoFactorEnabled: true, twoFactorSecret: encryptSecret('SECRET') },
    });
    expect(state).toEqual({ enabled: true, secret: 'SECRET', legacy: false });
  });

  it('ignore user_metadata dès que app_metadata porte un état 2FA', () => {
    // L'utilisateur peut écrire dans user_metadata : cela ne doit rien changer.
    const state = readTwoFactor({
      id: 'u1',
      app_metadata: { twoFactorEnabled: true, twoFactorSecret: encryptSecret('SECRET') },
      user_metadata: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    expect(state.enabled).toBe(true);
    expect(state.secret).toBe('SECRET');
  });

  it('reprend un ancien compte configuré dans user_metadata (legacy)', () => {
    const state = readTwoFactor({ id: 'u1', app_metadata: { role: 'client' }, user_metadata: { twoFactorEnabled: true, twoFactorSecret: 'OLD' } });
    expect(state).toEqual({ enabled: true, secret: 'OLD', legacy: true });
  });

  it('renvoie désactivé pour un compte sans 2FA', () => {
    expect(readTwoFactor({ id: 'u1', app_metadata: { role: 'client' }, user_metadata: {} }))
      .toEqual({ enabled: false, secret: null, legacy: false });
  });
});

describe('twoFactorService.setup', () => {
  it('stocke le secret chiffré dans app_metadata, non actif, et vide user_metadata', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser());
    const res = await twoFactorService.setup('u1');

    expect(res).toEqual({ secret: 'JBSWY3DPEHPK3PXP', qrCode: 'data:image/png;base64,abc' });
    const update = lastUpdate();
    expect(update.app_metadata.role).toBe('client'); // le rôle est préservé
    expect(update.app_metadata.twoFactorEnabled).toBe(false);
    expect(update.app_metadata.twoFactorSecret).not.toBe('JBSWY3DPEHPK3PXP'); // jamais en clair
    expect(decryptSecret(update.app_metadata.twoFactorSecret as string)).toBe('JBSWY3DPEHPK3PXP');
    expect(update.user_metadata).toMatchObject({ twoFactorEnabled: null, twoFactorSecret: null });
  });

  it('refuse (409) de reconfigurer un 2FA déjà actif — /setup ne doit pas le neutraliser', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser({ twoFactorEnabled: true, twoFactorSecret: encryptSecret('S') }));
    await expect(twoFactorService.setup('u1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('refuse (503) quand Redis n\'est pas configuré', async () => {
    redisConfigured = false;
    await expect(twoFactorService.setup('u1')).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('twoFactorService.confirm', () => {
  it('active le 2FA et enregistre la session courante comme vérifiée', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser({ twoFactorEnabled: false, twoFactorSecret: encryptSecret('S') }));
    const token = jwt({ session_id: 'sess-1' });

    await twoFactorService.confirm('u1', '123456', token);

    expect(lastUpdate().app_metadata.twoFactorEnabled).toBe(true);
    expect(await isSessionVerified(token)).toBe(true);
  });

  it('refuse (400) un code invalide sans activer', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser({ twoFactorEnabled: false, twoFactorSecret: encryptSecret('S') }));
    mockVerifyTotp.mockReturnValueOnce(false);
    await expect(twoFactorService.confirm('u1', '000000')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('refuse (400) si la configuration n\'a pas été démarrée', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser());
    await expect(twoFactorService.confirm('u1', '123456')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('twoFactorService.disable', () => {
  const enabled = () => sbUser({ twoFactorEnabled: true, twoFactorSecret: encryptSecret('S') });

  it('exige un code TOTP (400 sans code)', async () => {
    mockGetUserById.mockResolvedValueOnce(enabled());
    await expect(twoFactorService.disable('u1', undefined)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('refuse un code invalide', async () => {
    mockGetUserById.mockResolvedValueOnce(enabled());
    mockVerifyTotp.mockReturnValueOnce(false);
    await expect(twoFactorService.disable('u1', '000000')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('désactive avec un code valide et efface le secret', async () => {
    mockGetUserById.mockResolvedValueOnce(enabled());
    await twoFactorService.disable('u1', '123456');
    expect(lastUpdate().app_metadata).toMatchObject({ twoFactorEnabled: false, twoFactorSecret: null });
  });

  it('bloque (429) après trop de codes incorrects, même avec un bon code ensuite', async () => {
    mockVerifyTotp.mockReturnValue(false);
    for (let i = 0; i < TOTP_MAX_ATTEMPTS; i++) {
      mockGetUserById.mockResolvedValueOnce(enabled());
      await expect(twoFactorService.disable('u1', '000000')).rejects.toMatchObject({ statusCode: 400 });
    }
    mockVerifyTotp.mockReturnValue(true);
    mockGetUserById.mockResolvedValueOnce(enabled());
    await expect(twoFactorService.disable('u1', '123456')).rejects.toMatchObject({ statusCode: 429 });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });
});

describe('twoFactorService.revokeByAdmin', () => {
  it('désactive sans code', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser({ twoFactorEnabled: true, twoFactorSecret: encryptSecret('S') }));
    await twoFactorService.revokeByAdmin('u1');
    expect(lastUpdate().app_metadata).toMatchObject({ twoFactorEnabled: false, twoFactorSecret: null });
  });

  it('révoque aussi un ancien compte configuré dans user_metadata', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser({}, { twoFactorEnabled: true, twoFactorSecret: 'OLD' }));
    await twoFactorService.revokeByAdmin('u1');
    expect(lastUpdate().user_metadata).toMatchObject({ twoFactorEnabled: null, twoFactorSecret: null });
  });

  it('refuse (400) si le 2FA n\'est pas actif', async () => {
    mockGetUserById.mockResolvedValueOnce(sbUser());
    await expect(twoFactorService.revokeByAdmin('u1')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('sessions vérifiées', () => {
  it('extrait le session_id du jeton', () => {
    expect(getSessionId(jwt({ session_id: 'abc' }))).toBe('abc');
    expect(getSessionId('pas-un-jwt')).toBeNull();
    expect(getSessionId(jwt({ sub: 'u1' }))).toBeNull();
  });

  it('refuse une session jamais enregistrée (ouverte sans second facteur)', async () => {
    expect(await isSessionVerified(jwt({ session_id: 'inconnue' }))).toBe(false);
  });

  it('accepte une session enregistrée, y compris après rafraîchissement du jeton (même session_id)', async () => {
    await markSessionVerified(jwt({ session_id: 'sess-2', iat: 1 }));
    expect(await isSessionVerified(jwt({ session_id: 'sess-2', iat: 2 }))).toBe(true);
  });

  it('refuse un jeton sans session_id', async () => {
    expect(await isSessionVerified('t')).toBe(false);
  });
});
