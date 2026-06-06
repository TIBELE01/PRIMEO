// Typography — font sizes, weights, line heights
export const fontSize = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold:'800',
} as const;

export const lineHeight = {
  tight:  1.2,
  normal: 1.5,
  relaxed:1.75,
} as const;

export const fontFamily = {
  sans:       'System',
  sansBold:   'System',
  mono:       'Courier',
} as const;

export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
} as const;

export type Typography = typeof typography;
