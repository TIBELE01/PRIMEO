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
}));

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../common/utils/sms', () => ({
  generateOtp: jest.fn(() => '123456'),
  sendSms: jest.fn(async () => undefined),
}));

jest.mock('../../common/utils/bcrypt', () => ({
  hashPassword: jest.fn(async (p: string) => `hashed:${p}`),
  comparePassword: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

jest.mock('../../common/utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
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

const envMock = { SKIP_OTP_VERIFICATION: false, NODE_ENV: 'test' };
jest.mock('../../config/env.config', () => ({ env: envMock }));

jest.mock('../../config/orange-sms.config', () => ({
  orangeSmsConfig: { otpExpiresInSeconds: 300 },
}));

// ── Actual imports (after mock declarations) ──────────────────────────────────

import { authService } from './auth.service';
import { redisSet } from '../../common/utils/redis-client';
import { generateOtp, sendSms } from '../../common/utils/sms';
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
  twoFactorEnabled: false,
  twoFactorSecret: null,
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
  mockPrisma.referral.create.mockImplementation(async () => ({}));
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
    // Use a phone that is never used in bypass tests to avoid memory leakage
    const phone = '+2250707002001';
    const input = { ...CLIENT_REGISTER, phone };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('returns a pending message and sends SMS', async () => {
      const result = await authService.register(input);
      expect(result.message).toMatch(/code de vérification/i);
      expect(sendSms).toHaveBeenCalledTimes(1);
    });

    it('stores pending user in Redis', async () => {
      await authService.register(input);
      expect(redisSet).toHaveBeenCalledWith(
        `pending:${phone}`,
        expect.stringContaining(input.email),
        300,
      );
    });

    it('stores OTP in Redis', async () => {
      (generateOtp as jest.Mock).mockReturnValueOnce('654321');
      await authService.register(input);
      expect(redisSet).toHaveBeenCalledWith(`otp:${phone}`, '654321', 300);
    });

    it('does not throw when SMS fails (degraded mode)', async () => {
      (sendSms as jest.Mock).mockRejectedValueOnce(new Error('SMS provider down'));
      await expect(authService.register(input)).resolves.toBeDefined();
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

    it('ignore le bypass en production : passe par le flux OTP (envoi SMS, pas de tokens)', async () => {
      envMock.NODE_ENV = 'production'; // SKIP reste true mais doit être neutralisé
      const result = await authService.register({ ...CLIENT_REGISTER, phone: '+2250707002777' });
      expect(result.accessToken).toBeUndefined();
      expect(result.message).toMatch(/code de vérification/i);
      expect(sendSms).toHaveBeenCalledTimes(1);
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
  const pendingPayload = JSON.stringify({
    email,
    phone,
    password: 'Pass1234!',
    passwordHash: 'hashed:Pass1234!',
    firstName: 'Test',
    lastName: 'User',
    accountType: 'client',
  });

  beforeEach(() => {
    resetMocks();
    // Pre-populate Redis for most tests
    redisStore.set(`otp:${phone}`, '999999');
    redisStore.set(`pending:${phone}`, pendingPayload);
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
    const bypassPending = JSON.stringify({
      email: 'bypass@test.ci',
      phone: bypassPhone,
      password: 'Pass1234!',
      passwordHash: 'hashed:Pass1234!',
      firstName: 'Bypass',
      lastName: 'User',
      accountType: 'client',
    });

    beforeEach(() => {
      envMock.SKIP_OTP_VERIFICATION = true;
      redisStore.set(`pending:${bypassPhone}`, bypassPending);
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
      redisStore.set(`pending:${prodPhone}`, JSON.stringify({
        email: 'prod@test.ci', phone: prodPhone, password: 'Pass1234!',
        passwordHash: 'hashed:Pass1234!', firstName: 'Prod', lastName: 'User', accountType: 'client',
      }));
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

  it('returns requiresTwoFactor when 2FA is enabled', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'ref' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
    });

    const result = await authService.login(creds);
    expect(result).toMatchObject({ requiresTwoFactor: true, userId: prismaUser.id });
  });

  it('stores TOTP pending data in Redis when 2FA required', async () => {
    mockSupabaseAuth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 't', refresh_token: 'ref' }, user: supabaseUser },
      error: null,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...prismaUser,
      twoFactorEnabled: true,
      twoFactorSecret: 'SECRET',
    });

    await authService.login(creds);
    expect(redisStore.has(`totp_pending:${prismaUser.id}`)).toBe(true);
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

  it('sends SMS with new OTP', async () => {
    redisStore.set(`pending:${phone}`, JSON.stringify({ email: 'x@test.ci' }));
    await authService.resendOtp(phone);
    expect(sendSms).toHaveBeenCalledTimes(1);
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
});
