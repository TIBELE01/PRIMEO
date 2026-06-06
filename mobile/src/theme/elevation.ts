// Premium elevation (shadows) & radii tokens — Primeo Design System
import { ViewStyle } from 'react-native';

// Border radii — modern, rounded
export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Layered shadows tuned for iOS (shadow*) + Android (elevation)
export const shadows: Record<'sm' | 'md' | 'lg' | 'xl', ViewStyle> = {
  sm: {
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
  xl: {
    shadowColor: '#0F1729',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 16,
  },
};

// Colored glow shadows for brand CTAs
export const brandShadows: Record<'primary' | 'cta' | 'secondary', ViewStyle> = {
  primary: {
    shadowColor: '#1056E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
  },
  cta: {
    shadowColor: '#5BBD15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 18,
    elevation: 8,
  },
  secondary: {
    shadowColor: '#D67309',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
  },
};
