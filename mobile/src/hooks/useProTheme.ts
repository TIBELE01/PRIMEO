// Returns brand colors for the current professional role.
// Blue for hébergement/hôtel, green for immobilier, red for restaurant.
import { useAuthStore } from '../store/authStore';

export interface ProTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  tabBarActive: string;
}

const THEMES: Record<string, ProTheme> = {
  professional_hebergement: {
    primary: '#1056E0',
    primaryLight: '#EFF4FF',
    primaryDark: '#0A3DA6',
    tabBarActive: '#1056E0',
  },
  professional_hotel: {
    primary: '#1056E0',
    primaryLight: '#EFF4FF',
    primaryDark: '#0A3DA6',
    tabBarActive: '#1056E0',
  },
  professional_immobilier: {
    primary: '#16A34A',
    primaryLight: '#F0FDF4',
    primaryDark: '#166534',
    tabBarActive: '#16A34A',
  },
  restaurateur: {
    primary: '#DC2626',
    primaryLight: '#FEF2F2',
    primaryDark: '#991B1B',
    tabBarActive: '#DC2626',
  },
};

const DEFAULT_THEME: ProTheme = THEMES.professional_hebergement;

export function useProTheme(): ProTheme {
  const role = useAuthStore((s) => s.user?.role);
  return (role ? THEMES[role] : undefined) ?? DEFAULT_THEME;
}

export function getProTheme(role?: string): ProTheme {
  return (role ? THEMES[role] : undefined) ?? DEFAULT_THEME;
}
