import crypto from 'crypto';
import { computeHmacSha256, verifyHmacSignature, verifyTimestamp, checkNonce } from './webhook-verifier';

// ── Redis mock ────────────────────────────────────────────────────────────────

const store = new Map<string, string>();
jest.mock('./redis-client', () => ({
  redisGet: jest.fn(async (k: string) => store.get(k) ?? null),
  redisSet: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
}));
jest.mock('./logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

// ── computeHmacSha256 ─────────────────────────────────────────────────────────

describe('computeHmacSha256', () => {
  it('produces a deterministic hex digest', () => {
    const result = computeHmacSha256('hello', 'secret');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toBe(computeHmacSha256('hello', 'secret'));
  });

  it('produces different digests for different payloads', () => {
    expect(computeHmacSha256('a', 'secret')).not.toBe(computeHmacSha256('b', 'secret'));
  });

  it('produces different digests for different secrets', () => {
    expect(computeHmacSha256('hello', 'secret1')).not.toBe(computeHmacSha256('hello', 'secret2'));
  });

  it('accepts Buffer payload', () => {
    const buf = Buffer.from('hello');
    expect(computeHmacSha256(buf, 'secret')).toBe(computeHmacSha256('hello', 'secret'));
  });
});

// ── verifyHmacSignature ───────────────────────────────────────────────────────

describe('verifyHmacSignature', () => {
  const secret = 'test-secret';
  const payload = Buffer.from('{"event":"test"}');

  function sign(p: Buffer, s: string) {
    return crypto.createHmac('sha256', s).update(p).digest('hex');
  }

  it('returns true for a valid signature', () => {
    const sig = sign(payload, secret);
    expect(verifyHmacSignature(payload, sig, secret)).toBe(true);
  });

  it('returns true when signature is prefixed with sha256=', () => {
    const sig = 'sha256=' + sign(payload, secret);
    expect(verifyHmacSignature(payload, sig, secret)).toBe(true);
  });

  it('returns false for wrong secret', () => {
    const sig = sign(payload, 'wrong-secret');
    expect(verifyHmacSignature(payload, sig, secret)).toBe(false);
  });

  it('returns false for tampered payload', () => {
    const sig = sign(payload, secret);
    expect(verifyHmacSignature(Buffer.from('tampered'), sig, secret)).toBe(false);
  });

  it('returns false for malformed hex signature', () => {
    expect(verifyHmacSignature(payload, 'not-hex', secret)).toBe(false);
  });

  it('returns false for mismatched-length signature', () => {
    expect(verifyHmacSignature(payload, 'ab', secret)).toBe(false);
  });
});

// ── verifyTimestamp ───────────────────────────────────────────────────────────

describe('verifyTimestamp', () => {
  function nowSeconds() { return Math.floor(Date.now() / 1000); }

  it('accepts current timestamp (number)', () => {
    expect(verifyTimestamp(nowSeconds())).toBe(true);
  });

  it('accepts current timestamp (string)', () => {
    expect(verifyTimestamp(String(nowSeconds()))).toBe(true);
  });

  it('accepts timestamp slightly in the past (within 5 min)', () => {
    expect(verifyTimestamp(nowSeconds() - 60)).toBe(true);
  });

  it('accepts timestamp very slightly in the future (clock skew ≤ 60 s)', () => {
    expect(verifyTimestamp(nowSeconds() + 30)).toBe(true);
  });

  it('rejects old timestamp (> 5 min ago)', () => {
    expect(verifyTimestamp(nowSeconds() - 400)).toBe(false);
  });

  it('rejects timestamp too far in the future', () => {
    expect(verifyTimestamp(nowSeconds() + 120)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(verifyTimestamp(undefined)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(verifyTimestamp('')).toBe(false);
  });

  it('rejects NaN string', () => {
    expect(verifyTimestamp('not-a-number')).toBe(false);
  });
});

// ── checkNonce ────────────────────────────────────────────────────────────────

describe('checkNonce', () => {
  beforeEach(() => store.clear());

  it('returns true for a fresh nonce', async () => {
    expect(await checkNonce('nonce-001', 'gp')).toBe(true);
  });

  it('returns false for a replayed nonce', async () => {
    await checkNonce('nonce-002', 'gp');
    expect(await checkNonce('nonce-002', 'gp')).toBe(false);
  });

  it('isolates nonces by namespace', async () => {
    await checkNonce('nonce-003', 'gp');
    expect(await checkNonce('nonce-003', 'os')).toBe(true); // different namespace
  });

  it('uses default namespace when none provided', async () => {
    await checkNonce('nonce-004');
    expect(await checkNonce('nonce-004')).toBe(false);
  });
});
