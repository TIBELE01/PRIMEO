// Design commun des écrans d'authentification (néo-/glassmorphique, charte Primeo) :
// palettes clair / sombre, thème adapté aux écrans existants, fond à formes abstraites
// et dégradé du bouton principal. Aucune logique métier.
import React from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type Theme } from '../../theme/ThemeProvider';

const { width: W, height: H } = Dimensions.get('window');

// Charte Primeo
export const BLUE = '#0055FF';
export const BLUE_LIGHT = '#4F8EF7';
export const ORANGE = '#FF6600';
export const RED = '#FF3333';
export const GREEN = '#00CC66';

export const LIGHT_PALETTE = {
  bg: ['#FFFFFF', '#F8FAFC', '#E3EDFF'] as const,
  surface: '#FFFFFF', field: '#F2F6FF', text: '#0B1F4D', muted: '#4F5F82', placeholder: '#7B8AAB',
  line: '#C9D6EE', shadow: '#7FA6E8', highlight: '#FFFFFF', shape: ['#BFD6FF', '#EAF1FF'] as const,
  primaryLight: '#E3EDFF',
};
export const DARK_PALETTE = {
  bg: ['#0B1530', '#0A1228', '#07102A'] as const,
  surface: '#14213F', field: '#1A2A4F', text: '#F1F5FF', muted: '#B3C0DD', placeholder: '#8FA0C6',
  line: '#2C3F6B', shadow: '#000000', highlight: '#243660', shape: ['#1A3A8F', '#0F2257'] as const,
  primaryLight: '#1A2F63',
};
export type AuthPalette = typeof LIGHT_PALETTE | typeof DARK_PALETTE;
export type AuthTheme = Theme & { auth: AuthPalette; isDark: boolean };

/** Palette courante (clair / sombre) + bascule du thème. */
export function useAuthPalette() {
  const { themeMode, setThemeMode } = useTheme();
  const system = useColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && system === 'dark');
  return {
    isDark,
    P: (isDark ? DARK_PALETTE : LIGHT_PALETTE) as AuthPalette,
    toggle: () => setThemeMode(isDark ? 'light' : 'dark'),
  };
}

/**
 * Thème au format des écrans existants, mais avec les couleurs de la charte Primeo
 * et un contraste garanti (texte, champs et consignes toujours lisibles, clair ou sombre).
 */
export function useAuthTheme(): AuthTheme {
  const { theme } = useTheme();
  const { P, isDark } = useAuthPalette();
  return {
    ...theme,
    auth: P,
    isDark,
    colors: {
      ...theme.colors,
      primary: BLUE,
      primaryLight: P.primaryLight,
      background: P.bg[1],
      surface: P.field,
      border: P.line,
      text: P.text,
      textSecondary: P.muted,
      textDisabled: P.placeholder,
      error: RED,
      errorLight: isDark ? 'rgba(255,51,51,0.16)' : 'rgba(255,51,51,0.09)',
      success: GREEN,
      successLight: isDark ? 'rgba(0,204,102,0.18)' : 'rgba(0,204,102,0.12)',
    },
  } as unknown as AuthTheme;
}

/** Fond : dégradé doux + formes abstraites floutées (derrière tout le contenu). */
export function AuthBackground({ forceLight = false }: { forceLight?: boolean } = {}) {
  const current = useAuthPalette().P;
  const P = forceLight ? LIGHT_PALETTE : current;
  const soft = { shadowColor: P.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...P.bg]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[...P.shape]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width: W * 0.75, height: W * 0.75, borderRadius: W * 0.375, top: -W * 0.3, left: -W * 0.25, opacity: 0.75, ...soft }} />
      <LinearGradient colors={[BLUE_LIGHT, BLUE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width: W * 0.34, height: W * 0.34, borderRadius: W * 0.17, top: H * 0.17, right: -W * 0.12, opacity: 0.25, ...soft }} />
      <LinearGradient colors={[...P.shape]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', width: W * 0.8, height: W * 0.55, borderRadius: W * 0.4, bottom: -W * 0.22, right: -W * 0.3, opacity: 0.7, transform: [{ rotate: '-18deg' }], ...soft }} />
      <View style={{ position: 'absolute', width: W * 0.3, height: W * 0.3, borderRadius: W * 0.15, bottom: H * 0.2, left: -W * 0.14, backgroundColor: P.highlight, opacity: 0.5, ...soft }} />
    </View>
  );
}

/** Dégradé bleu Primeo à placer en premier enfant d'un bouton principal (forme pilule). */
export function AuthButtonGradient() {
  return (
    <LinearGradient
      colors={[BLUE_LIGHT, BLUE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: 36 }]} pointerEvents="none"
    />
  );
}
