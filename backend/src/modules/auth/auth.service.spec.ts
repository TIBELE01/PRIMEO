// Unit tests for authService — all external I/O is mocked.
// Focus: register, verifyPhone, login, resendOtp, verifyTotp critical paths.
//
// Note: auth.service has in-memory fallback Maps (pendingUserMemory, otpMemory)
// that are module-level and cannot be cleared from tests. Each describe block
// uses a unique phone number to avoid cross-test contamination.

// ── Mocks — must be declared before any imports ───────────────────────────────

const redisStore = new Map<string, string>();

jest.mock('../../common/utils/redis-client', () => ({
  redisGet: jest.fn(async (k: string) => redisStore.get(k) ?? null),
  redisSet: jest.fn(async (k: string, v: string) => { redisStore.set(k, v); }),
  redisDel: jest.fn(async (k: string) => { redisStore.delete(k); }),
  getRedisClient: jest.fn(() => null), // null → repli mémoire (rate limit OTP)
}));

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../common/utils/sms', () => ({
  generateOtp: jest.fn(() => '123456'),
  sendSms: jest.fn(async () => undefined),
}));

jest.mock('../../common/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendOtpEmail: jest.fn(async () => undefined),
}));

jest.mock('../../common/utils/totp', () => ({
  verifyTotp: jest.fn(() => true),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(async () => null),
    create: jest.fn(),
    update: jest.fn(),
  },
  professionalProfile: {
    create: jest.fn(async () => ({})),
  },
  property: {
    count: jest.fn(async () => 0),
    create: jest.fn(async () => ({})),
  },
  referral: {
    create: jest.fn(async () => ({})),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

const mockSupabaseAdmin = {
  auth: {
    admin: {
      createUser: jest.fn(),
      signOut: jest.fn(async () => ({})),
      getUserById: jest.fn(),
      updateUserById: jest.fn(async () => ({ error: null })),
    },
  },
};
const mockSupabaseAuth = {
  auth: {
    signInWithPassword: jest.fn(),
    refreshSession: jest.fn(),
  },
};
jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabaseAuth: mockSupabaseAuth,
}));

const envMock = { SKIP_OTP_VERIFICATION: false, NODE_ENV: 'test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-for-crypto' };
jest.mock('../../config/env.config', () => ({ env: envMock }));

jest.mock('../../config/orange-sms.config', () => ({
  orangeSmsConfig: { otpExpiresInSeconds: 600 },
}));

// ── Actual imports (after mock declarations) ──────────────────────────────────

import { authService } from './auth.service';
import { redisSet } from '../../common/utils/redis-client';
import { encryptSecret, decryptSecret } from '../../common/utils/secret-crypto';
import { generateOtp, sendSms } from '../../common/utils/sms';
import { sendOtpEmail } from '../../common/utils/mailer';
import { AccountType, UserStatus } from '@prisma/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLIENT_REGISTER = {
  email: 'koffi@test.ci',
  phone: '+2250707001001',
  password: 'Pass1234!',
  firstName: 'Koffi',
  lastName: 'Assi',
  accountType: 'client' as const,
};

const PRO_REGISTER = {
  ...CLIENT_REGISTER,
  email: 'pro@test.ci',
  phone: '+2250707001099',
  accountType: 'professional_hebergement' as const,
  businessName: 'Villa Test',
};

const supabaseUser = { id: 'supa-uid-001', email: CLIENT_REGISTER.email };
const prismaUser = {
  id: 'supa-uid-001',
  email: CLIENT_REGISTER.email,
  phone: CLIENT_REGISTER.phone,
  firstName: 'Koffi',
  lastName: 'Assi',
  accountType: AccountType.client,
  status: UserStatus.active,
  professionalProfile: null,
};

function resetMocks() {
  redisStore.clear();
  jest.clearAllMocks();
  envMock.SKIP_OTP_VERIFICATION = false;
  envMock.NODE_ENV = 'test';
  // Restore persistent mock defaults that clearAllMocks would leave as no-ops
  mockPrisma.user.findFirst.mockImplementation(async () => null);
  mockPrisma.professionalProfile.create.mockImplementation(async () => ({}));
  mockPrisma.property.count.mockImplementation(async () => 0);
  mockPrisma.property.create.mockImplementation(async () => ({}));
  mockPrisma.referral.create.mockImplementation(async () => ({}));
  mockSupabaseAdmin.auth.admin.updateUserById.mockImplementation(async () => ({ error: null }));
  // 2FA lu depuis Supabase user_metadata — désactivé par défaut
  mockSupabaseAdmin.auth.admin.getUserById.mockImplementation(async () => ({
    data: { user: { id: 'supa-uid-001', user_metadata: {} } },
    error: null,
  }));
}

function setupBypassSuccess() {
  mockPrisma.user.findUnique.mockResolvedValue(null);
  envMock.SKIP_OTP_VERIFICATION = true;
  mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
    data: { user: supabaseUser },
    error: null,
  });
  mockPrisma.user.create.mockResolvedValue(prismaUser);
  mockSupabaseAuth.auth.signInWithPassword.mockResolvedValue({
    data: { session: { access_token: 'tok-access', refresh_token: 'tok-refresh' }, user: supabaseUser },
    error: null,
  });
}

// ── register() ────────────────────────────────────────────────────────────────

describe('authService.register', () => {
  beforeEach(resetMocks);

  it('throws 409 when email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'x' });
    await expect(authService.register(CLIENT_REGISTER)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 409 when phone already exists', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)   // email check → not found
      .mockResolvedValueOnce({ id: 'y' }); // phone check → found
    await expect(authService.register(CLIENT_REGISTER)).rejects.toMatchObject({ statusCode: 409 });
  });

  describe('normal mode (OTP flow)', () => {
    // L'OTP SMS ne concerne que les comptes professionnels (les clients sont
    // créés immédiatement). Un téléphone DIFFÉRENT par test : la limite
    // anti-abus (3 OTP/heure/numéro) utilise un compteur mémoire module-level.
    const mkInput = (phone: string) => ({ ...PRO_REGISTER, phone });

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('returns a pending message and sends the OTP by email', async () => {
      const result = await authService.register(mkInput('+2250707002001'));
      expect(result.message).toMatch(/code de vérification/i);
      expect(result.message).toMatch(/email/i);
      expect(sendOtpEmail).toHaveBeenCalledTimes(1);
      expect(sendOtpEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: [expect.objectContaining({ email: PRO_REGISTER.email })],
        code: '123456',
      }));
    });

    it('stores pending user encrypted in Redis (password never in clear)', async () => {
      const phone = '+2250707002002';
      await authService.register(mkInput(phone));
      const stored = redisStore.get(`pending:${phone}`)!;
      // Chiffré : le payload brut ne doit contenir ni email ni mot de passe
      expect(stored).not.toContain(PRO_REGISTER.email);
      expect(stored).not.toContain(PRO_REGISTER.password);
      // Mais déchiffrable et complet
      const pending = JSON.parse(decryptSecret(stored));
      expect(pending.email).toBe(PRO_REGISTER.email);
    });

    it('stores OTP in Redis', async () => {
      const phone = '+2250707002003';
      (generateOtp as jest.Mock).mockReturnValueOnce('654321');
      await authService.register(mkInput(phone));
      expect(redisSet).toHaveBeenCalledWith(`otp:${phone}`, '654321', 600);
    });

    it('does not throw when email sending fails (degraded mode)', async () => {
      (sendOtpEmail as jest.Mock).mockRejectedValueOnce(new Error('email provider down'));
      await expect(authService.register(mkInput('+2250707002004'))).resolves.toBeDefined();
    });

    it('throws 429 after 3 OTP requests for the same phone within the window', async () => {
      const phone = '+2250707002005';
      await authService.register(mkInput(phone));
      await authService.register(mkInput(phone));
      await authService.register(mkInput(phone));
      await expect(authService.register(mkInput(phone))).rejects.toMatchObject({ statusCode: 429 });
    });
  });

  describe('bypass mode (SKIP_OTP_VERIFICATION=true)', () => {
    beforeEach(setupBypassSuccess);

    it('returns tokens directly without OTP', async () => {
      const result = await authService.register(CLIENT_REGISTER);
      expect(result.accessToken).toBe('tok-access');
      expect(result.user?.email).toBe(CLIENT_REGISTER.email);
    });

    it('creates professional profile for pro account type', async () => {
      const proUser = { ...prismaUser, accountType: AccountType.professional_hebergement };
      mockPrisma.user.create.mockResolvedValueOnce(proUser);
      await authService.register(PRO_REGISTER);
      expect(mockPrisma.professionalProfile.create).toHaveBeenCalledTimes(1);
    });

    it('does NOT create professional profile for client account', async () => {
      await authService.register(CLIENT_REGISTER);
      expect(mockPrisma.professionalProfile.create).not.toHaveBeenCalled();
    });

    it('crée automatiquement le restaurant pour un compte restaurateur (actif)', async () => {
      mockPrisma.user.create.mockResolvedValueOnce({ ...prismaUser, accountType: AccountType.restaurateur });
      await authService.register({
        ...PRO_REGISTER,
        accountType: 'restaurateur' as const,
        businessName: 'Chez Tantie',
        businessAddress: 'Cocody, Abidjan',
      });
      expect(mockPrisma.property.create).toHaveBeenCalledTimes(1);
      const calls = mockPrisma.property.create.mock.calls as unknown as Array<[{ data: Record<string, unknown> }]>;
      const data = calls[0][0].data;
      expect(data).toMatchObject({
        propertyType: 'restaurant',
        title: 'Chez Tantie',
        city: 'Cocody, Abidjan',
        status: 'active',
      });
    });

    it('ne crée PAS de restaurant pour un pro hébergement', async () => {
      mockPrisma.user.create.mockResolvedValueOnce({ ...prismaUser, accountType: AccountType.professional_hebergement });
      await authService.register(PRO_REGISTER);
      expect(mockPrisma.property.create).not.toHaveBeenCalled();
    });

    it('ignore le bypass en production : passe par le flux OTP (envoi email, pas de tokens)', async () => {
      envMock.NODE_ENV = 'production'; // SKIP reste true mais doit être neutralisé
      const result = await authService.register({ ...PRO_REGISTER, phone: '+2250707002777' });
      expect(result.accessToken).toBeUndefined();
      expect(result.message).toMatch(/code de vérification/i);
      expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    });

    it('throws 500 when Supabase user creation fails', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'supabase error' },
      });
      await expect(authService.register(CLIENT_REGISTER)).rejects.toMatchObject({ statusCode: 500 });
    });
  });
});

// ── verifyPhone() ─────────────────────────────────────────────────────────────

describe('authService.verifyPhone', () => {
  // Use a phone number isolated from other describe blocks
  const phone = '+2250707003001';
  const email = 'verify@test.ci';
  const pendingPayload = () => encryptSecret(JSON.stringify({
    email,
    phone,
    password: 'Pass1234!',
    firstName: 'Test',
    lastName: 'User',
    accountType: 'client',
  }));

  beforeEach(() => {
    resetMocks();
    // Pre-populate Redis for most tests
    redisStore.set(`otp:${phone}`, '999999');
    redisStore.set(`pending:${phone}`, pendingPayload());
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { ...supabaseUser, email } },
      error: null,
    });
    mockPrisma.user.create.mockResolvedValue({ ...prismaUser, phone, email });
    mockPrisma.user.findUnique.mockResolvedValue({ ...prismaUser, phone, email });
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: { ...supabaseUser, email } },
      error: null,
    });
  });

  describe('normal mode', () => {
    it('throws 400 when OTP is expired (not in Redis)', async () => {
      redisStore.delete(`otp:${phone}`);
      await expect(authService.verifyPhone({ phone, otp: '999999' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 for wrong OTP', async () => {
      await expect(authService.verifyPhone({ phone, otp: '000000' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('returns tokens on correct OTP', async () => {
      const result = await authService.verifyPhone({ phone, otp: '999999' });
      expect(result.accessToken).toBe('acc');
      expect(result.user.email).toBe(email);
    });

    it('cleans up OTP and pending keys from Redis', async () => {
      await authService.verifyPhone({ phone, otp: '999999' });
      expect(redisStore.has(`otp:${phone}`)).toBe(false);
      expect(redisStore.has(`pending:${phone}`)).toBe(false);
    });
  });

  describe('bypass mode', () => {
    const bypassPhone = '+2250707003099';
    const bypassPending = () => encryptSecret(JSON.stringify({
      email: 'bypass@test.ci',
      phone: bypassPhone,
      password: 'Pass1234!',
      firstName: 'Bypass',
      lastName: 'User',
      accountType: 'client',
    }));

    beforeEach(() => {
      envMock.SKIP_OTP_VERIFICATION = true;
      redisStore.set(`pending:${bypassPhone}`, bypassPending());
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { ...supabaseUser, email: 'bypass@test.ci' } },
        error: null,
      });
      mockPrisma.user.create.mockResolvedValue({ ...prismaUser, phone: bypassPhone, email: 'bypass@test.ci' });
      mockPrisma.user.findUnique.mockResolvedValue({ ...prismaUser, phone: bypassPhone, email: 'bypass@test.ci' });
      mockSupabaseAuth.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: supabaseUser },
        error: null,
      });
    });

    it('accepts bypass OTP code 000000', async () => {
      const result = await authService.verifyPhone({ phone: bypassPhone, otp: '000000' });
      expect(result.accessToken).toBe('acc');
    });

    it('rejects any other code in bypass mode', async () => {
      await expect(authService.verifyPhone({ phone: bypassPhone, otp: '123456' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // Sécurité : même si SKIP_OTP_VERIFICATION=true, le bypass DOIT être neutralisé
  // en production. Le code 000000 ne doit jamais passer.
  describe('bypass désactivé en production (sécurité)', () => {
    const prodPhone = '+2250707004099';

    beforeEach(() => {
      envMock.SKIP_OTP_VERIFICATION = true;
      envMock.NODE_ENV = 'production';
      redisStore.set(`pending:${prodPhone}`, encryptSecret(JSON.stringify({
        email: 'prod@test.ci', phone: prodPhone, password: 'Pass1234!',
        firstName: 'Prod', lastName: 'User', accountType: 'client',
      })));
    });

    it('rejette 000000 en production malgré SKIP_OTP_VERIFICATION=true', async () => {
      // Aucun OTP réel stocké → doit échouer (pas de bypass)
      await expect(authService.verifyPhone({ phone: prodPhone, otp: '000000' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('exige le vrai code OTP stocké en production', async () => {
      redisStore.set(`otp:${prodPhone}`, '777111');
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { ...supabaseUser, email: 'prod@test.ci' } }, error: null,
      });
      mockPrisma.user.create.mockResolvedValue({ ...prismaUser, phone: prodPhone, email: 'prod@test.ci' });
      mockPrisma.user.findUnique.mockResolvedValue({ ...prismaUser, phone: prodPhone, email: 'prod@test.ci' });
      mockSupabaseAuth.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: supabaseUser }, error: null,
      });

      // 000000 refusé, le vrai code accepté
      await expect(authService.verifyPhone({ phone: prodPhone, otp: '000000' }))
        .rejects.toMatchObject({ statusCode: 400 });
      const ok = await authService.verifyPhone({ phone: prodPhone, otp: '777111' });
      expect(ok.accessToken).toBe('acc');
    });
  });
});

// ── login() ───────────────────────────────────────────────────────────────────

describe('authService.login', () => {
  beforeEach(resetMocks);

  const creds = { email: CLIENT_REGISTER.email, password: CLIENT_REGISTER.password };

  it('throws 401 when Supabase rejects credentials', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });
    await expect(authService.login(creds)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 when Prisma user not found', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'r' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(authService.login(creds)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 for suspended user', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'r' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...prismaUser, status: UserStatus.suspended });
    await expect(authService.login(creds)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 for banned user', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'r' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...prismaUser, status: UserStatus.banned });
    await expect(authService.login(creds)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns tokens for an active user without 2FA', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 'tok', refresh_token: 'ref' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    const result = await authService.login(creds);
    expect(result).toMatchObject({ accessToken: 'tok', refreshToken: 'ref' });
  });

  it('includes kycStatus in returned user for pro account', async () => {
    const proUser = {
      ...prismaUser,
      accountType: AccountType.professional_hebergement,
      professionalProfile: { verificationStatus: 'pending', verificationNotes: null },
    };
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 'tok', refresh_token: 'ref' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(proUser);

    const result = await authService.login(creds) as { user: { kycStatus: string } };
    expect(result.user.kycStatus).toBe('pending');
  });

  it('returns requiresTwoFactor when 2FA is enabled in Supabase user_metadata', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'ref' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: prismaUser.id, user_metadata: { twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' } } },
      error: null,
    });

    const result = await authService.login(creds);
    expect(result).toMatchObject({ requiresTwoFactor: true, userId: prismaUser.id });
  });

  it('stores the refresh token ENCRYPTED in Redis when 2FA required', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'ref-secret' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: prismaUser.id, user_metadata: { twoFactorEnabled: true, twoFactorSecret: 'SECRET' } } },
      error: null,
    });

    await authService.login(creds);
    const stored = redisStore.get(`totp_pending:${prismaUser.id}`)!;
    expect(stored).not.toContain('ref-secret'); // jamais en clair
    expect(JSON.parse(decryptSecret(stored)).supabaseRefreshToken).toBe('ref-secret');
  });
});

// ── resendOtp() ───────────────────────────────────────────────────────────────

describe('authService.resendOtp', () => {
  // Use a phone never touched in other describe blocks
  const phone = '+2250707004001';

  beforeEach(resetMocks);

  it('throws 400 when no pending inscription found', async () => {
    // Redis is empty and this phone was never used → memory fallback also empty
    await expect(authService.resendOtp(phone)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('generates and stores a new OTP in Redis', async () => {
    redisStore.set(`pending:${phone}`, JSON.stringify({ email: 'x@test.ci' }));
    (generateOtp as jest.Mock).mockReturnValueOnce('888888');
    await authService.resendOtp(phone);
    expect(redisStore.get(`otp:${phone}`)).toBe('888888');
  });

  it('sends the new OTP by email', async () => {
    redisStore.set(`pending:${phone}`, JSON.stringify({ email: 'x@test.ci', firstName: 'X', lastName: 'Y' }));
    await authService.resendOtp(phone);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: [expect.objectContaining({ email: 'x@test.ci' })],
    }));
  });

  it('in bypass mode, stores BYPASS_OTP without calling SMS', async () => {
    const bypassPhone = '+2250707004099';
    redisStore.set(`pending:${bypassPhone}`, JSON.stringify({ email: 'x@test.ci' }));
    envMock.SKIP_OTP_VERIFICATION = true;
    await authService.resendOtp(bypassPhone);
    expect(redisStore.get(`otp:${bypassPhone}`)).toBe('000000');
    expect(sendSms).not.toHaveBeenCalled();
  });
});

// ── verifyTotp() ──────────────────────────────────────────────────────────────

describe('authService.verifyTotp', () => {
  beforeEach(resetMocks);

  it('throws 400 when TOTP session not found in Redis', async () => {
    await expect(authService.verifyTotp({ userId: 'u-not-found', token: '123456' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns tokens and user with kycStatus on valid TOTP code', async () => {
    const proUser = {
      ...prismaUser,
      accountType: AccountType.professional_hebergement,
      professionalProfile: { verificationStatus: 'approved', verificationNotes: null },
    };

    // Pré-charger la session TOTP en Redis (refresh token chiffré)
    const { encryptSecret } = jest.requireActual<typeof import('../../common/utils/secret-crypto')>(
      '../../common/utils/secret-crypto',
    );
    redisStore.set(
      `totp_pending:${prismaUser.id}`,
      encryptSecret(JSON.stringify({ supabaseRefreshToken: 'totp-refresh-token' })),
    );

    // Le TOTP est valide (mock retourne true par défaut après resetMocks)
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: prismaUser.id, user_metadata: { twoFactorSecret: 'JBSWY3DPEHPK3PXP' } } },
      error: null,
    });
    mockSupabaseAuth.auth.refreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(proUser);

    const result = await authService.verifyTotp({ userId: prismaUser.id, token: '123456' });

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(result.user.kycStatus).toBe('approved');
    // La session TOTP en attente doit être supprimée de Redis
    expect(redisStore.has(`totp_pending:${prismaUser.id}`)).toBe(false);
  });

  it('throws 401 when TOTP code is invalid', async () => {
    const { verifyTotp: mockVerify } = jest.requireMock('../../common/utils/totp') as { verifyTotp: jest.Mock };
    mockVerify.mockReturnValueOnce(false);

    const { encryptSecret } = jest.requireActual<typeof import('../../common/utils/secret-crypto')>(
      '../../common/utils/secret-crypto',
    );
    redisStore.set(
      `totp_pending:${prismaUser.id}`,
      encryptSecret(JSON.stringify({ supabaseRefreshToken: 'r' })),
    );
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: prismaUser.id, user_metadata: { twoFactorSecret: 'SECRET' } } },
      error: null,
    });

    await expect(authService.verifyTotp({ userId: prismaUser.id, token: '000000' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 400 when Supabase user has no TOTP secret configured', async () => {
    const { encryptSecret } = jest.requireActual<typeof import('../../common/utils/secret-crypto')>(
      '../../common/utils/secret-crypto',
    );
    redisStore.set(
      `totp_pending:${prismaUser.id}`,
      encryptSecret(JSON.stringify({ supabaseRefreshToken: 'r' })),
    );
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValueOnce({
      data: { user: { id: prismaUser.id, user_metadata: {} } }, // no secret
      error: null,
    });

    await expect(authService.verifyTotp({ userId: prismaUser.id, token: '123456' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── refreshToken() ─────────────────────────────────────────────────────────────

describe('authService.refreshToken', () => {
  beforeEach(resetMocks);

  it('returns new tokens and user profile on valid refresh token', async () => {
    mockSupabaseAuth.auth.refreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'new-acc', refresh_token: 'new-ref', user: { id: prismaUser.id } } },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(prismaUser);

    const result = await authService.refreshToken('valid-refresh');

    expect(result.accessToken).toBe('new-acc');
    expect(result.refreshToken).toBe('new-ref');
    expect(result.user?.email).toBe(prismaUser.email);
  });

  it('throws 401 when Supabase rejects the refresh token', async () => {
    mockSupabaseAuth.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid refresh token' },
    });

    await expect(authService.refreshToken('bad-token')).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('authService.logout', () => {
  beforeEach(resetMocks);

  it('calls Supabase signOut with the provided access token', async () => {
    await authService.logout(prismaUser.id, 'access-token-xyz');
    expect(mockSupabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith('access-token-xyz');
  });

  it('resolves without error when no access token is provided', async () => {
    await expect(authService.logout(prismaUser.id)).resolves.toBeUndefined();
    expect(mockSupabaseAdmin.auth.admin.signOut).not.toHaveBeenCalled();
  });
});

// ── googleAuth ────────────────────────────────────────────────────────────────

// getUser n'existe pas dans le mock d'origine — ajouté dynamiquement ici
const mockGetUser = jest.fn();
(mockSupabaseAdmin.auth as Record<string, unknown>)['getUser'] = mockGetUser;

const googleSbUser = {
  id: 'supa-google-001',
  email: 'client.google@gmail.com',
  app_metadata: { provider: 'google', providers: ['google'], role: 'client' },
  user_metadata: { full_name: 'Ama Google', avatar_url: 'https://lh3.example/p.jpg' },
};

describe('authService.googleAuth', () => {
  beforeEach(() => {
    resetMocks();
    mockGetUser.mockResolvedValue({ data: { user: googleSbUser }, error: null });
  });

  it('rejette une session invalide (401)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    await expect(authService.googleAuth({ accessToken: 'bad', refreshToken: 'r' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejette une session ne provenant pas de Google (400)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { ...googleSbUser, app_metadata: { provider: 'email', providers: ['email'] } } },
      error: null,
    });
    await expect(authService.googleAuth({ accessToken: 't', refreshToken: 'r' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('crée un compte client au premier login Google', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // ni par id, ni par email
    mockPrisma.user.create.mockResolvedValue({
      id: googleSbUser.id, email: googleSbUser.email, phone: null,
      firstName: 'Ama', lastName: 'Google', accountType: 'client', status: 'active',
    });

    const result = await authService.googleAuth({ accessToken: 't', refreshToken: 'r' });

    expect(result.isNewUser).toBe(true);
    expect(result.user.role).toBe('client');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ id: googleSbUser.id, accountType: 'client', phone: null }),
    }));
  });

  it('connecte un client existant (même UUID Supabase)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: googleSbUser.id, email: googleSbUser.email, phone: null,
      firstName: 'Ama', lastName: 'Google', accountType: 'client', status: 'active',
      professionalProfile: null,
    });

    const result = await authService.googleAuth({ accessToken: 't', refreshToken: 'r' });

    expect(result.isNewUser).toBe(false);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse Google pour un compte professionnel (403)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: googleSbUser.id, email: googleSbUser.email, phone: '+22501',
      firstName: 'Pro', lastName: 'Immo', accountType: 'professional_immobilier', status: 'active',
      professionalProfile: null,
    });
    await expect(authService.googleAuth({ accessToken: 't', refreshToken: 'r' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse en cas de doublon email avec un autre UUID (409)', async () => {
    // 1er findUnique (par id) → null ; 2e (par email) → compte existant
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'autre-uuid', email: googleSbUser.email });
    await expect(authService.googleAuth({ accessToken: 't', refreshToken: 'r' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuse un compte suspendu (403)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: googleSbUser.id, email: googleSbUser.email, phone: null,
      firstName: 'Ama', lastName: 'Google', accountType: 'client', status: 'suspended',
      professionalProfile: null,
    });
    await expect(authService.googleAuth({ accessToken: 't', refreshToken: 'r' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── forgotPassword / resetPassword ────────────────────────────────────────────

const mockGenerateLink = jest.fn();
(mockSupabaseAdmin.auth.admin as Record<string, unknown>)['generateLink'] = mockGenerateLink;

describe('authService.forgotPassword', () => {
  beforeEach(() => {
    resetMocks();
    (envMock as Record<string, unknown>)['FRONTEND_URL'] = 'https://app.primeo.ci';
  });

  it('reste silencieux quand l\'email est inconnu (anti-énumération)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.forgotPassword('inconnu@x.ci')).resolves.toBeUndefined();
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it('génère un lien de récupération Supabase et envoie l\'email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'ama@x.ci', firstName: 'Ama', lastName: 'K',
    });
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://supabase/recovery?token=abc' } },
      error: null,
    });

    await authService.forgotPassword('ama@x.ci');

    expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'recovery', email: 'ama@x.ci' }));
    const { sendPasswordResetEmail } = jest.requireMock('../../common/utils/mailer') as { sendPasswordResetEmail: jest.Mock };
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({
      resetUrl: 'https://supabase/recovery?token=abc',
    }));
  });

  it('lève 500 si Supabase ne génère pas de lien', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ama@x.ci', firstName: 'A', lastName: 'K' });
    mockGenerateLink.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(authService.forgotPassword('ama@x.ci')).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('authService.resetPassword', () => {
  beforeEach(resetMocks);

  it('rejette un recovery token invalide (400)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
    await expect(authService.resetPassword({ recoveryToken: 'bad', password: 'New#Pass123' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('met à jour le mot de passe via Supabase quand le token est valide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supa-uid-001' } }, error: null });
    await authService.resetPassword({ recoveryToken: 'good', password: 'New#Pass123' });
    expect(mockSupabaseAdmin.auth.admin.updateUserById)
      .toHaveBeenCalledWith('supa-uid-001', { password: 'New#Pass123' });
  });
});
