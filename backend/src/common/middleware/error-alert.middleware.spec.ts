jest.mock('../../config/env.config', () => ({ env: { NODE_ENV: 'test' } }));
jest.mock('../utils/logger', () => ({ logger: { error: jest.fn() } }));

import { HttpError } from '../handlers/http-error.handler';
import { isExpectedError } from './error-alert.middleware';

describe('isExpectedError', () => {
  it('ignore les refus 4xx', () => {
    expect(isExpectedError(new HttpError(401, 'Non authentifié'))).toBe(true);
    expect(isExpectedError(new HttpError(404, 'Introuvable'))).toBe(true);
    expect(isExpectedError({ status: 413 })).toBe(true);
  });
  it('ignore un secteur désactivé (503 volontaire)', () => {
    expect(isExpectedError(new HttpError(503, 'Indisponible', { code: 'SECTOR_DISABLED' }))).toBe(true);
  });
  it('garde les vraies pannes', () => {
    expect(isExpectedError(new Error('boom'))).toBe(false);
    expect(isExpectedError(new HttpError(500, 'Erreur'))).toBe(false);
    expect(isExpectedError(new HttpError(503, 'Genius Pay injoignable'))).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});
