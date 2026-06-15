// Blue theme — alternative color scheme (ocean blue, WCAG AA compliant)
import { spacing } from '../spacing';
import { typography } from '../typography';

export const blueTheme = {
  dark: false,
  colors: {
    // Primary — deep blue (#0D47A1 on white = 10.2:1 contrast ✓)
    primary:        '#0D47A1',
    primaryLight:   '#E3F2FD',
    secondary:      '#D67309',
    secondaryLight: '#FDF7EE',

    background:     '#F0F4FF',
    surface:        '#FFFFFF',
    surfaceVariant: '#E8EEF9',
    border:         '#BBDEFB',

    text:           '#0D1B4B',   // #0D1B4B on #F0F4FF = 14.5:1 ✓
    textSecondary:  '#37474F',   // #37474F on #F0F4FF = 8.1:1 ✓
    textDisabled:   '#78909C',
    textInverse:    '#FFFFFF',

    success:        '#469A0E',
    successLight:   '#F3FCE8',
    warning:        '#D67309',
    warningLight:   '#FDF7EE',
    error:          '#D41313',
    errorLight:     '#FEF2F2',
    info:           '#0277BD',
    infoLight:      '#E1F5FE',

    tabBar:         '#FFFFFF',
    tabBarActive:   '#0D47A1',
    // #64748B sur blanc ≈ 4.7:1 (WCAG AA) — #78909C échouait (~3.4:1).
    tabBarInactive: '#64748B',
    statusBar:      'dark-content' as const,

    card:   '#FFFFFF',
    shadow: '#0D1B4B',
  },
  spacing,
  typography,
} as const;

export type BlueTheme = typeof blueTheme;
