import { Request, Response, NextFunction } from 'express';
import { idempotency } from './idempotency.middleware';

// ── Redis mock ────────────────────────────────────────────────────────────────

const store = new Map<string, string>();

jest.mock('../utils/redis-client', () => ({
  redisGet: jest.fn(async (k: string) => store.get(k) ?? null),
  redisSet: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
}));
jest.mock('../utils/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

import { redisGet, redisSet } from '../utils/redis-client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    user: { sub: 'user-123' },
    method: 'POST',
    path: '/bookings',
    ...overrides,
  } as unknown as Request;
}

function makeRes(): jest.Mocked<Response> & { _body: unknown; _status: number } {
  const res = {
    _body: undefined as unknown,
    _status: 200,
    statusCode: 200,
    status: jest.fn().mockReturnThis() as jest.MockedFunction<Response['status']>,
    json: jest.fn(function (this: { _body: unknown }, body: unknown) { this._body = body; return this; }),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    res._status = code;
    return res as unknown as Response;
  });
  return res as unknown as jest.Mocked<Response> & { _body: unknown; _status: number };
}

const next: NextFunction = jest.fn();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('idempotency middleware', () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('calls next when no Idempotency-Key header', async () => {
    const req = makeReq();
    const res = makeRes();
    await idempotency(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('calls next when user is not authenticated', async () => {
    const req = makeReq({ headers: { 'idempotency-key': 'key-abc' }, user: undefined });
    const res = makeRes();
    await idempotency(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for a key exceeding max length', async () => {
    const req = makeReq({ headers: { 'idempotency-key': 'x'.repeat(129) } });
    const res = makeRes();
    await idempotency(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and caches response for a fresh key', async () => {
    const req = makeReq({ headers: { 'idempotency-key': 'fresh-key-001' } });
    const res = makeRes();
    await idempotency(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Simulate controller writing a response
    res.statusCode = 201;
    res.json({ id: 'booking-1' });
    expect(redisSet).toHaveBeenCalledWith(
      'idempotency:user-123:fresh-key-001',
      expect.stringContaining('"id":"booking-1"'),
      86_400,
    );
  });

  it('replays cached response without calling next', async () => {
    const cached = JSON.stringify({ statusCode: 201, body: { id: 'booking-2' } });
    store.set('idempotency:user-123:cached-key', cached);

    const req = makeReq({ headers: { 'idempotency-key': 'cached-key' } });
    const res = makeRes();
    await idempotency(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'booking-2' });
  });

  it('fails open when Redis throws on read', async () => {
    (redisGet as jest.Mock).mockRejectedValueOnce(new Error('redis down'));
    const req = makeReq({ headers: { 'idempotency-key': 'any-key' } });
    const res = makeRes();
    await idempotency(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not cache non-2xx responses', async () => {
    const req = makeReq({ headers: { 'idempotency-key': 'fail-key' } });
    const res = makeRes();
    await idempotency(req, res, next);

    res.statusCode = 422;
    res.json({ message: 'Unprocessable' });
    expect(redisSet).not.toHaveBeenCalled();
  });
});
