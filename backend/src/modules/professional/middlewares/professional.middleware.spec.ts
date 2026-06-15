// Tests unitaires — requireKycApproved middleware

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockPrisma = {
  professionalProfile: {
    findUnique: jest.fn(),
  },
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

// ── Imports ───────────────────────────────────────────────────────────────────

import { requireKycApproved } from './professional.middleware';
import type { Request, Response, NextFunction } from 'express';
import type { TokenPayload } from '../../../common/middleware/jwt-auth.middleware';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(role: string, userId = 'user-1'): Partial<Request> {
  return { user: { sub: userId, email: 'u@test.ci', role } as TokenPayload };
}

function makeNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireKycApproved', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next with 401 when req.user is missing', async () => {
    const next = makeNext();
    await requireKycApproved({ user: undefined } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('bypasses KYC check for admin role', async () => {
    const next = makeNext();
    await requireKycApproved(makeReq('admin') as Request, {} as Response, next);
    expect(mockPrisma.professionalProfile.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(); // next() sans argument = passage
  });

  it('calls next (no error) for approved professional', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'approved' });
    const next = makeNext();
    await requireKycApproved(makeReq('professional_hebergement') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 for pending professional', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'pending' });
    const next = makeNext();
    await requireKycApproved(makeReq('professional_hotel') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns 403 for rejected professional', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'rejected' });
    const next = makeNext();
    await requireKycApproved(makeReq('restaurateur') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns 403 when professional has no profile (treated as pending)', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValue(null);
    const next = makeNext();
    await requireKycApproved(makeReq('professional_immobilier') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('propagates unexpected database errors to next', async () => {
    const dbError = new Error('DB connection lost');
    mockPrisma.professionalProfile.findUnique.mockRejectedValue(dbError);
    const next = makeNext();
    await requireKycApproved(makeReq('professional_hebergement') as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(dbError);
  });
});
