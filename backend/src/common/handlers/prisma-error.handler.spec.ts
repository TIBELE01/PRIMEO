import { Prisma } from '@prisma/client';
import { handlePrismaError } from './prisma-error.handler';
import { HttpError } from './http-error.handler';

function run(err: Error) {
  const res = { setHeader: jest.fn() } as any;
  const next = jest.fn();
  handlePrismaError(err, {} as any, res, next);
  return { res, err: next.mock.calls[0][0] as HttpError };
}

describe('handlePrismaError — coupure de la base', () => {
  it('base injoignable (P1001) : 503 + Retry-After', () => {
    const { res, err } = run(new Prisma.PrismaClientKnownRequestError('down', { code: 'P1001', clientVersion: 'x' }));
    expect(err.statusCode).toBe(503);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });
  it('pool de connexions saturé (P2024) : 503', () => {
    expect(run(new Prisma.PrismaClientKnownRequestError('pool', { code: 'P2024', clientVersion: 'x' })).err.statusCode).toBe(503);
  });
  it('échec d\'initialisation du client : 503', () => {
    expect(run(new Prisma.PrismaClientInitializationError('init', 'x')).err.statusCode).toBe(503);
  });
  it('doublon (P2002) : 409 inchangé', () => {
    expect(run(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })).err.statusCode).toBe(409);
  });
});
