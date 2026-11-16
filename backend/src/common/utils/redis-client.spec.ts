// Régression : redisGet doit TOUJOURS renvoyer une chaîne (ou null), même si le
// client Upstash désérialise une valeur numérique (ex : OTP "123456" -> 123456).
// Sans cela, la comparaison stricte de l'OTP échouait (« Code invalide »).
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({ get: mockGet, set: mockSet, del: mockDel })),
}));
jest.mock('../../config/redis.config', () => ({ redisConfig: { url: 'https://test.upstash.io', token: 'tok' } }));
jest.mock('./logger', () => ({ logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { redisGet, redisSet, cacheGet, cacheSet, cacheDel } from './redis-client';

describe('redisGet — coercion en chaîne', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renvoie une chaîne même si le client désérialise en nombre (cas OTP)', async () => {
    mockGet.mockResolvedValueOnce(123456); // désérialisation Upstash : "123456" -> 123456
    const v = await redisGet('otp:+2250700000000');
    expect(typeof v).toBe('string');
    expect(v).toBe('123456');
  });

  it('préserve une chaîne avec zéro initial', async () => {
    mockGet.mockResolvedValueOnce('012345');
    expect(await redisGet('otp:x')).toBe('012345');
  });

  it('renvoie null si la clé est absente', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await redisGet('otp:absent')).toBeNull();
  });
});

// Un cache ne doit jamais faire échouer une requête : jeton en lecture seule
// (« NOPERM … 'set' »), panne réseau, quota dépassé…
describe('cache au mieux — cacheGet / cacheSet / cacheDel', () => {
  const noperm = new Error("Command failed: NOPERM this user has no permissions to run the 'set' command");
  beforeEach(() => jest.clearAllMocks());

  it('cacheSet n\'échoue pas quand Redis refuse l\'écriture', async () => {
    mockSet.mockRejectedValueOnce(noperm);
    await expect(cacheSet('website:stats', '{}', 60)).resolves.toBeUndefined();
  });

  it('cacheGet renvoie null quand Redis est injoignable', async () => {
    mockGet.mockRejectedValueOnce(new Error('fetch failed'));
    expect(await cacheGet('website:stats')).toBeNull();
  });

  it('cacheGet renvoie la valeur quand Redis répond', async () => {
    mockGet.mockResolvedValueOnce('{"a":1}');
    expect(await cacheGet('k')).toBe('{"a":1}');
  });

  it('cacheDel n\'échoue pas quand Redis refuse la suppression', async () => {
    mockDel.mockRejectedValueOnce(noperm);
    await expect(cacheDel('k')).resolves.toBeUndefined();
  });

  it('redisSet, lui, propage l\'erreur (données dont dépend la sécurité)', async () => {
    mockSet.mockRejectedValueOnce(noperm);
    await expect(redisSet('otp:x', '123456', 300)).rejects.toThrow('NOPERM');
  });
});

