// useAuth: hook exposing auth store state and login/logout helpers
import { useAuthStore } from '../stores/authStore';
import { authService } from '../lib/auth';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useAuth = () => {
  const { admin, isAuthenticated, requiresTotp, tempToken, setAdmin, setRequiresTotp, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    if (res.requiresTwoFactor && res.tempToken) {
      setRequiresTotp(res.tempToken);
      router.push('/2fa');
    } else if (res.accessToken && res.admin) {
      authService.persistToken(res.accessToken);
      setAdmin(res.admin as Parameters<typeof setAdmin>[0]);
      router.push('/dashboard');
    }
    return res;
  }, [setAdmin, setRequiresTotp, router]);

  const verifyTotp = useCallback(async (token: string) => {
    if (!tempToken) throw new Error('No temp token');
    const res = await authService.verifyTotp({ token, tempToken });
    if (res.admin) setAdmin(res.admin as Parameters<typeof setAdmin>[0]);
    router.push('/dashboard');
    return res;
  }, [tempToken, setAdmin, router]);

  const logout = useCallback(() => {
    storeLogout();
    authService.logout();
  }, [storeLogout]);

  return { admin, isAuthenticated, requiresTotp, login, verifyTotp, logout };
};
