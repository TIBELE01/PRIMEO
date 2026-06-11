// Tests du middleware mode maintenance — bascule 503, routes exemptées, cache.
import { Request, Response, NextFunction } from 'express';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const findUnique = jest.fn();

jest.mock('../../database/prisma.service', () => ({
  prisma: { platformConfig: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));
jest.mock('../utils/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { MAINTENANCE_MODE: false } }));

import { maintenanceGate, getMaintenanceState, invalidateMaintenanceCache } from './maintenance.middleware';
import { env } from '../../config/env.config';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(path: string): Request {
  return { path } as unknown as Request;
}

function makeRes(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) { res._status = code; return res; },
    json(body: unknown) { res._body = body; return res; },
  };
  return res as unknown as Response & { _status: number; _body: unknown };
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  invalidateMaintenanceCache();
  (env as { MAINTENANCE_MODE: boolean }).MAINTENANCE_MODE = false;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('maintenanceGate', () => {
  it('laisse passer quand le mode est inactif', async () => {
    findUnique.mockResolvedValue({ value: { enabled: false } });
    const res = makeRes();
    await maintenanceGate(makeReq('/api/properties'), res, next);
    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(0);
  });

  it('renvoie 503 avec message et estimatedEnd quand le mode est actif', async () => {
    findUnique.mockResolvedValue({
      value: { enabled: true, message: 'Mise à jour majeure', estimatedEnd: '2026-06-12T08:00:00.000Z' },
    });
    const res = makeRes();
    await maintenanceGate(makeReq('/api/properties'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(503);
    expect(res._body).toMatchObject({
      error: 'maintenance',
      message: 'Mise à jour majeure',
      estimatedEnd: '2026-06-12T08:00:00.000Z',
    });
  });

  it.each(['/api/health', '/api/maintenance', '/api/admin/users', '/api/webhooks/genius-pay', '/api-docs', '/'])(
    'exempte la route %s même en maintenance',
    async (path) => {
      findUnique.mockResolvedValue({ value: { enabled: true } });
      const res = makeRes();
      await maintenanceGate(makeReq(path), res, next);
      expect(next).toHaveBeenCalled();
      expect(res._status).toBe(0);
    },
  );

  it('active le mode via la variable d\'environnement même sans config en base', async () => {
    (env as { MAINTENANCE_MODE: boolean }).MAINTENANCE_MODE = true;
    findUnique.mockResolvedValue(null);
    const res = makeRes();
    await maintenanceGate(makeReq('/api/bookings'), res, next);
    expect(res._status).toBe(503);
  });

  it('ne bloque pas le trafic si la lecture DB échoue', async () => {
    findUnique.mockRejectedValue(new Error('connexion perdue'));
    const res = makeRes();
    await maintenanceGate(makeReq('/api/bookings'), res, next);
    expect(next).toHaveBeenCalled();
  });

  it('met l\'état en cache puis le rafraîchit après invalidation', async () => {
    findUnique.mockResolvedValue({ value: { enabled: false } });
    await getMaintenanceState();
    await getMaintenanceState();
    expect(findUnique).toHaveBeenCalledTimes(1); // 2e appel servi par le cache

    invalidateMaintenanceCache();
    findUnique.mockResolvedValue({ value: { enabled: true } });
    const state = await getMaintenanceState();
    expect(state.enabled).toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
