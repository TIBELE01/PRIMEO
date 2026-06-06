// Light theme object
import { colors } from '../colors';
import { spacing } from '../spacing';
import { typography } from '../typography';

export const lightTheme = {
  dark: false,
  colors: {
    primary:          colors.primary[600],
    primaryLight:     colors.primary[100],
    secondary:        colors.secondary[600],
    secondaryLight:   colors.secondary[100],

    background:       colors.neutral[50],
    surface:          colors.neutral[0],
    surfaceVariant:   colors.neutral[100],
    border:           colors.neutral[300],

    text:             colors.neutral[900],
    textSecondary:    colors.neutral[600],
    textDisabled:     colors.neutral[400],
    textInverse:      colors.neutral[0],

    success:          colors.status.success,
    successLight:     colors.status.successLight,
    warning:          colors.status.warning,
    warningLight:     colors.status.warningLight,
    error:            colors.status.error,
    errorLight:       colors.status.errorLight,
    info:             colors.status.info,
    infoLight:        colors.status.infoLight,

    tabBar:           colors.neutral[0],
    tabBarActive:     colors.primary[600],
    tabBarInactive:   colors.neutral[500],
    statusBar:        'dark-content' as const,

    card:             colors.neutral[0],
    shadow:           colors.neutral[900],
  },
  spacing,
  typography,
} as const;

export type Theme = typeof lightTheme;
