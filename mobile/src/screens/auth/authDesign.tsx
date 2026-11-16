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
  bg: ['#F6F9FF', '#EAF0FC', '#DFE8FA'] as const,
  surface: '#EEF3FD', field: '#EAF0FC', text: '#0B1F4D', muted: '#4F5F82', placeholder: '#6E7EA3',
  line: '#B9C8E6', shadow: '#8FA9DB', highlight: '#FFFFFF', shape: ['#F4F8FF', '#D5E3FF'] as const,
  primaryLight: '#E0EAFF', ring: '#C9DAFF',
};
export const DARK_PALETTE = {
  bg: ['#0B1530', '#0A1228', '#07102A'] as const,
  surface: '#14213F', field: '#1A2A4F', text: '#F1F5FF', muted: '#B3C0DD', placeholder: '#8FA0C6',
  line: '#2C3F6B', shadow: '#000000', highlight: '#2A3D6C', shape: ['#1A3A8F', '#0F2257'] as const,
  primaryLight: '#1A2F63', ring: '#1E3A8A',
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

/** Fond : dégradé doux + grands cercles en relief (anneaux clairs, reflets blancs). */
export function AuthBackground({ forceLight = false }: { forceLight?: boolean } = {}) {
  const current = useAuthPalette().P;
  const P = forceLight ? LIGHT_PALETTE : current;
  const soft = { shadowColor: P.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 6 };
  const ring = (size: number, extra: object) => (
    // anneau extérieur bleu pâle + liseré blanc intérieur + disque dégradé
    <View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.07, borderColor: P.ring, ...soft }, extra]}>
      <LinearGradient colors={[...P.shape]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={{ flex: 1, borderRadius: size, borderWidth: 2, borderColor: P.highlight }} />
    </View>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...P.bg]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      {ring(W * 0.62, { top: -W * 0.24, left: -W * 0.22, opacity: 0.95 })}
      {/* sphère pleine à droite */}
      <LinearGradient colors={['#E8F0FF', '#BCD2FB']} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', width: W * 0.34, height: W * 0.34, borderRadius: W * 0.17, top: H * 0.18, right: -W * 0.12, borderWidth: 2, borderColor: P.highlight, opacity: 0.95, ...soft }} />
      {ring(W * 0.52, { bottom: -W * 0.2, left: -W * 0.22, opacity: 0.9 })}
      <LinearGradient colors={[...P.shape]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width: W * 0.95, height: W * 0.95, borderRadius: W * 0.475, bottom: -W * 0.5, right: -W * 0.42, borderWidth: W * 0.03, borderColor: P.ring, opacity: 0.85, ...soft }} />
    </View>
  );
}

/**
 * Relief néomorphique : lumière blanche en haut à gauche, ombre bleutée en bas à droite,
 * liseré blanc et dégradé interne très doux (effet verre dépoli).
 */
export function Neu({ radius = 24, style, innerStyle, children, depth = 1 }: {
  radius?: number; style?: object; innerStyle?: object; children?: React.ReactNode; depth?: number;
}) {
  const { P, isDark } = useAuthPalette();
  return (
    <View style={[{ borderRadius: radius, shadowColor: isDark ? '#3A5090' : '#FFFFFF', shadowOffset: { width: -5 * depth, height: -5 * depth }, shadowOpacity: isDark ? 0.25 : 1, shadowRadius: 10 * depth, elevation: 0 }, style]}>
      <View style={{ borderRadius: radius, backgroundColor: P.field, shadowColor: P.shadow, shadowOffset: { width: 6 * depth, height: 8 * depth }, shadowOpacity: 0.38, shadowRadius: 14 * depth, elevation: 8 * depth }}>
        <LinearGradient
          colors={isDark ? [P.field, P.surface] : ['#F5F8FF', P.field]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[{ borderRadius: radius, borderWidth: 1.5, borderColor: P.highlight }, innerStyle]}
        >
          {children}
        </LinearGradient>
      </View>
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
