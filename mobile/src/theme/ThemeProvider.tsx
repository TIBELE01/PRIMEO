// ThemeProvider — four theme modes (Clair, Sombre, Bleu, Auto) with AsyncStorage persistence
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useColorScheme, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme } from './themes/light';
import { darkTheme } from './themes/dark';
import { blueTheme } from './themes/blue';
import { STORAGE_KEYS } from '../constants/storageKeys';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'blue' | 'auto';
export type Theme = typeof lightTheme;

export interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Scales a base font size respecting the device accessibility font scale. */
  scaledFont: (baseSize: number) => number;
}

// ── Context ───────────────────────────────────────────────────────────────────

export const ThemeContext = createContext<ThemeContextValue>({
  theme:        lightTheme,
  themeMode:    'auto',
  setThemeMode: () => null,
  scaledFont:   (s) => s,
});

// ── Font scale helper (WCAG 1.4.4 — Text Resize) ─────────────────────────────

const MAX_FONT_SCALE = 1.4; // cap at 140 % to avoid layout breaks

function buildScaledFont() {
  const deviceScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  return (baseSize: number) => Math.round(baseSize * deviceScale);
}

// ── Theme selector ────────────────────────────────────────────────────────────

function resolveTheme(mode: ThemeMode, systemIsDark: boolean): Theme {
  if (mode === 'dark')  return darkTheme  as unknown as Theme;
  if (mode === 'blue')  return blueTheme  as unknown as Theme;
  if (mode === 'auto')  return systemIsDark ? (darkTheme as unknown as Theme) : lightTheme;
  return lightTheme;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme  = useColorScheme();
  const systemIsDark  = systemScheme === 'dark';

  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [scaledFont] = useState(() => buildScaledFont());

  // Restore persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE).then((stored) => {
      if (stored && ['light', 'dark', 'blue', 'auto'].includes(stored)) {
        setThemeModeState(stored as ThemeMode);
      }
    }).catch(() => null);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode).catch(() => null);
  }, []);

  const theme = resolveTheme(themeMode, systemIsDark);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, scaledFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
