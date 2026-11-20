// Erreurs du client (JSON malformé, corps trop volumineux, upload refusé) → 4xx, jamais 500.
jest.mock('../utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
import { handleHttpError, HttpError } from './http-error.handler';

const run = (err: Error) => {
  const res: any = { statusCode: 0, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.sendFile = jest.fn();
  handleHttpError(err, { headers: { accept: 'application/json' }, path: '/x' } as any, res, jest.fn());
  return res;
};

describe('handleHttpError', () => {
  it('JSON malformé → 400', () => {
    const e = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 });
    expect(run(e).statusCode).toBe(400);
  });
  it('corps trop volumineux → 413', () => {
    expect(run(Object.assign(new Error('too large'), { type: 'entity.too.large', status: 413 })).statusCode).toBe(413);
  });
  it('HttpError conservée', () => {
    expect(run(new HttpError(404, 'Introuvable')).statusCode).toBe(404);
  });
  it('erreur inattendue → 500', () => {
    expect(run(new Error('boom')).statusCode).toBe(500);
  });
});
