// Admin auth Zustand store — tracks authenticated admin user and session
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminRole } from '../types/user';

interface AdminUserState {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

interface AuthState {
  admin: AdminUserState | null;
  isAuthenticated: boolean;
  requiresTotp: boolean;
  tempToken: string | null;
  sessionStartedAt: number | null;
  setAdmin: (admin: AdminUserState) => void;
  setRequiresTotp: (tempToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      admin: null,
      isAuthenticated: false,
      requiresTotp: false,
      tempToken: null,
      sessionStartedAt: null,
      setAdmin: (admin) => set({ admin, isAuthenticated: true, requiresTotp: false, tempToken: null, sessionStartedAt: Date.now() }),
      setRequiresTotp: (tempToken) => set({ requiresTotp: true, tempToken }),
      logout: () => set({ admin: null, isAuthenticated: false, requiresTotp: false, tempToken: null, sessionStartedAt: null }),
    }),
    { name: 'primeo_admin_auth', partialize: state => ({ admin: state.admin, isAuthenticated: state.isAuthenticated }) }
  )
);
