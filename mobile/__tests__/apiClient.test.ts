// Tests du client API axios — intercepteur de requête (injection du JWT).
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../src/services/api/client';
import { STORAGE_KEYS } from '../src/constants/storageKeys';

// Accès à l'intercepteur de requête enregistré (premier handler)
const requestFulfilled = (apiClient.interceptors.request as unknown as {
  handlers: Array<{ fulfilled: (c: any) => Promise<any> }>;
}).handlers[0].fulfilled;

function fakeConfig() {
  const headers: Record<string, string> = {};
  return { headers: { set: (k: string, v: string) => { headers[k] = v; } }, _captured: headers } as any;
}

describe('apiClient — intercepteur de requête', () => {
  afterEach(() => jest.clearAllMocks());

  it('injecte le header Authorization quand un token est présent', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('jwt-abc');
    const cfg = fakeConfig();
    await requestFulfilled(cfg);
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    expect(cfg._captured['Authorization']).toBe('Bearer jwt-abc');
  });

  it('n\'ajoute pas de header Authorization sans token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    const cfg = fakeConfig();
    await requestFulfilled(cfg);
    expect(cfg._captured['Authorization']).toBeUndefined();
  });

  it('expose une instance configurée (baseURL /api, timeout)', () => {
    expect(apiClient.defaults.baseURL).toMatch(/\/api$/);
    expect(apiClient.defaults.timeout).toBeGreaterThan(0);
  });
});
