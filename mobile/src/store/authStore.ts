// Zustand auth store — session state, silent restore, secure token management
import { create } from 'zustand';
import { secureStore as SecureStore } from '../services/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_URL } from '../constants/config';
import { safeJsonParse } from '../utils/safeJson';

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'client'
  | 'professional_hebergement'
  | 'professional_hotel'
  | 'professional_immobilier'
  | 'restaurateur'
  | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  /** Statut du compte : active | pending | suspended | banned */
  status?: string;
  /** Statut KYC pour les comptes professionnels : pending | approved | rejected */
  kycStatus?: string | null;
  /** Motif de rejet KYC, présent uniquement si kycStatus === 'rejected' */
  kycRejectionReason?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean; // true once the startup session restore attempt has finished

  // Synchronous setters — used by login flow and API interceptor
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (v: boolean) => void;

  // Async actions
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user:         null,
  accessToken:  null,
  refreshToken: null,
  isLoading:    false,
  isHydrated:   false,

  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
  setLoading: (isLoading) => set({ isLoading }),

  // ── Silent session restore ────────────────────────────────────────────────
  hydrate: async () => {
    set({ isHydrated: false, isLoading: true });
    try {
      const storedRefresh = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!storedRefresh) {
        set({ isHydrated: true, isLoading: false });
        return;
      }

      // Refresh access token silently (direct axios — bypass apiClient interceptors)
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
        user?: User;
      }>(`${API_URL}/api/auth/refresh`, { refreshToken: storedRefresh });

      // Persist new tokens securely
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);

      // Restore user — prefer server response, fall back to cached profile
      let user: User | null = data.user ?? null;
      if (!user) {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        user = safeJsonParse<User | null>(cached, null);
      }
      // Back-compat: older API responses used accountType instead of role
      const rawUser = user as unknown as Record<string, unknown>;
      if (user && !user.role && rawUser.accountType) {
        user = { ...user, role: rawUser.accountType as User['role'] };
      }
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
      }

      set({
        user,
        accessToken:  data.accessToken,
        refreshToken: data.refreshToken,
        isHydrated:   true,
        isLoading:    false,
      });
    } catch {
      // Refresh failed — treat as logged-out; purge stale tokens
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => null);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => null);
      set({ user: null, accessToken: null, refreshToken: null, isHydrated: true, isLoading: false });
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: async () => {
    // Read current token synchronously before clearing state
    const currentToken = get().accessToken;

    // Clear local state immediately — this is the first thing so the UI
    // switches to PublicTabs right away without waiting for any I/O.
    set({ user: null, accessToken: null, refreshToken: null, isLoading: false });

    // Fire-and-forget server invalidation — never block on network
    if (currentToken) {
      axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { headers: { Authorization: `Bearer ${currentToken}` }, timeout: 5000 },
      ).catch(() => null);
    }

    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => null),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => null),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE).catch(() => null),
    ]);
  },
}));
