// Unit tests for useAuthStore — all storage and network I/O mocked
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import AFTER mocks so the module picks up the mocked dependencies
import { useAuthStore } from '../src/store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'koffi@test.ci',
  firstName: 'Koffi',
  lastName: 'Assi',
  phone: '+2250707001001',
  role: 'client' as const,
  isVerified: true,
  twoFactorEnabled: false,
};

function getState() {
  return useAuthStore.getState();
}

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    isHydrated: false,
  });
  jest.clearAllMocks();
}

// ── Synchronous setters ───────────────────────────────────────────────────────

describe('setUser', () => {
  beforeEach(resetStore);

  it('stores a user in state', () => {
    getState().setUser(mockUser);
    expect(getState().user).toEqual(mockUser);
  });

  it('clears user when called with null', () => {
    getState().setUser(mockUser);
    getState().setUser(null);
    expect(getState().user).toBeNull();
  });
});

describe('setTokens', () => {
  beforeEach(resetStore);

  it('stores access and refresh tokens', () => {
    getState().setTokens('access-123', 'refresh-456');
    expect(getState().accessToken).toBe('access-123');
    expect(getState().refreshToken).toBe('refresh-456');
  });
});

describe('setLoading', () => {
  beforeEach(resetStore);

  it('sets loading to true', () => {
    getState().setLoading(true);
    expect(getState().isLoading).toBe(true);
  });

  it('sets loading to false', () => {
    getState().setLoading(true);
    getState().setLoading(false);
    expect(getState().isLoading).toBe(false);
  });
});

// ── hydrate() ─────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  beforeEach(resetStore);

  it('sets isHydrated=true when no refresh token stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    await getState().hydrate();
    expect(getState().isHydrated).toBe(true);
    expect(getState().isLoading).toBe(false);
    expect(getState().user).toBeNull();
  });

  it('restores session when refresh token is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-refresh');
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: mockUser,
      },
    });

    await getState().hydrate();

    expect(getState().user).toEqual(mockUser);
    expect(getState().accessToken).toBe('new-access');
    expect(getState().refreshToken).toBe('new-refresh');
    expect(getState().isHydrated).toBe(true);
  });

  it('falls back to cached profile when server returns no user', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-refresh');
    mockedAxios.post.mockResolvedValueOnce({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockUser));

    await getState().hydrate();
    expect(getState().user).toEqual(mockUser);
  });

  it('handles accountType → role back-compat mapping', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-refresh');
    const userWithAccountType = { ...mockUser, role: undefined, accountType: 'client' };
    mockedAxios.post.mockResolvedValueOnce({
      data: { accessToken: 'a', refreshToken: 'r', user: userWithAccountType },
    });

    await getState().hydrate();
    expect(getState().user?.role).toBe('client');
  });

  it('clears state and marks hydrated when refresh fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('bad-token');
    mockedAxios.post.mockRejectedValueOnce(new Error('401 Unauthorized'));

    await getState().hydrate();

    expect(getState().user).toBeNull();
    expect(getState().accessToken).toBeNull();
    expect(getState().isHydrated).toBe(true);
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  beforeEach(() => {
    resetStore();
    useAuthStore.setState({ user: mockUser, accessToken: 'acc', refreshToken: 'ref' });
  });

  it('clears user and tokens from state immediately', async () => {
    mockedAxios.post.mockResolvedValueOnce({});
    await getState().logout();
    expect(getState().user).toBeNull();
    expect(getState().accessToken).toBeNull();
    expect(getState().refreshToken).toBeNull();
  });

  it('deletes tokens from SecureStore', async () => {
    mockedAxios.post.mockResolvedValueOnce({});
    await getState().logout();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(expect.stringContaining('Token'));
  });

  it('removes user profile from AsyncStorage', async () => {
    mockedAxios.post.mockResolvedValueOnce({});
    await getState().logout();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });

  it('does not throw when server logout call fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('network error'));
    await expect(getState().logout()).resolves.not.toThrow();
  });
});
