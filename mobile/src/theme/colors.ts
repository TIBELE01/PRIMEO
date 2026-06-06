// Primeo brand palette — primary blue, secondary amber, CTA green, neutrals, status
export const colors = {
  // Primary — Primeo blue
  primary: {
    50:  '#EFF5FF',
    100: '#DBE8FE',
    200: '#BED4FD',
    300: '#91B6FB',
    400: '#5D8DF6',
    500: '#3A6BF0',
    600: '#1056E0', // brand primary
    700: '#0F45C7',
    800: '#1339A1',
    900: '#15347F',
  },

  // Secondary — amber
  secondary: {
    50:  '#FDF7EE',
    100: '#F9E8CC',
    200: '#F3CF95',
    300: '#ECB05C',
    400: '#E69434',
    500: '#E07F1A',
    600: '#D67309', // brand secondary
    700: '#B1570C',
    800: '#8D4511',
    900: '#743A12',
  },

  // CTA — action green
  cta: {
    50:  '#F3FCE8',
    100: '#E3F8CC',
    200: '#C8F09F',
    300: '#A3E468',
    400: '#82D43C',
    500: '#5BBD15', // brand CTA
    600: '#469A0E',
    700: '#36750F',
    800: '#2E5C12',
    900: '#284E14',
  },

  // Neutrals
  neutral: {
    0:   '#FFFFFF',
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E6EAF2',
    300: '#D3DAE6',
    400: '#9AA6B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F1729',
    1000: '#000000',
  },

  // Status colors
  status: {
    success: '#469A0E',
    successLight: '#F3FCE8',
    warning: '#D67309',
    warningLight: '#FDF7EE',
    error: '#D41313',
    errorLight: '#FEF2F2',
    info: '#1056E0',
    infoLight: '#EFF5FF',
  },

  // Booking status
  booking: {
    pending:   '#D67309',
    confirmed: '#469A0E',
    cancelled: '#D41313',
    completed: '#1056E0',
  },

  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
