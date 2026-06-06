// Dark theme object
import { colors } from '../colors';
import { spacing } from '../spacing';
import { typography } from '../typography';

export const darkTheme = {
  dark: true,
  colors: {
    primary:          colors.primary[400],
    primaryLight:     colors.primary[900],
    secondary:        colors.secondary[500],
    secondaryLight:   colors.secondary[900],

    background:       colors.neutral[900],
    surface:          colors.neutral[800],
    surfaceVariant:   colors.neutral[700],
    border:           colors.neutral[600],

    text:             colors.neutral[50],
    textSecondary:    colors.neutral[400],
    textDisabled:     colors.neutral[600],
    textInverse:      colors.neutral[900],

    success:          colors.cta[400],
    successLight:     colors.cta[900],
    warning:          colors.secondary[500],
    warningLight:     colors.secondary[900],
    error:            '#EF5350',
    errorLight:       '#B71C1C',
    info:             '#42A5F5',
    infoLight:        '#0D47A1',

    tabBar:           colors.neutral[800],
    tabBarActive:     colors.primary[400],
    tabBarInactive:   colors.neutral[500],
    statusBar:        'light-content' as const,

    card:             colors.neutral[800],
    shadow:           colors.neutral[1000],
  },
  spacing,
  typography,
} as const;

export type DarkTheme = typeof darkTheme;
