// useAuth — convenience hook over the Zustand auth store
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const user         = useAuthStore((s) => s.user);
  const accessToken  = useAuthStore((s) => s.accessToken);
  const isLoading    = useAuthStore((s) => s.isLoading);
  const isHydrated   = useAuthStore((s) => s.isHydrated);
  const setUser      = useAuthStore((s) => s.setUser);
  const setTokens    = useAuthStore((s) => s.setTokens);
  const logout       = useAuthStore((s) => s.logout);

  return {
    user,
    accessToken,
    isLoading,
    isHydrated,
    isAuthenticated: !!accessToken,
    setUser,
    setTokens,
    logout,
  };
};
