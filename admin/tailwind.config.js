/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Primeo brand palette ──────────────────────────────────────────
        primary: {
          50:  '#eff5ff',
          100: '#dbe8fe',
          200: '#bed4fd',
          300: '#91b6fb',
          400: '#5d8df6',
          500: '#3a6bf0',
          600: '#1056e0', // brand primary (Primeo blue)
          700: '#0f45c7',
          800: '#1339a1',
          900: '#15347f',
          950: '#0f2150',
        },
        secondary: {
          50:  '#fdf7ee',
          100: '#f9e8cc',
          200: '#f3cf95',
          300: '#ecb05c',
          400: '#e69434',
          500: '#e07f1a',
          600: '#d67309', // brand secondary (amber)
          700: '#b1570c',
          800: '#8d4511',
          900: '#743a12',
        },
        cta: {
          50:  '#f3fce8',
          100: '#e3f8cc',
          200: '#c8f09f',
          300: '#a3e468',
          400: '#82d43c',
          500: '#5bbd15', // brand CTA (action green)
          600: '#469a0e',
          700: '#36750f',
          800: '#2e5c12',
          900: '#284e14',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fde0e0',
          200: '#fbc6c6',
          300: '#f79e9e',
          400: '#f06868',
          500: '#e53a3a',
          600: '#d41313', // brand danger
          700: '#b11010',
          800: '#921414',
          900: '#791717',
        },
        // Legacy alias so existing `gold-*` classes keep working
        gold: {
          400: '#ecb05c',
          500: '#d67309',
          600: '#b1570c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        // Premium multi-layer shadows
        sm: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.08)',
        DEFAULT: '0 1px 3px rgba(16,24,40,.08), 0 4px 8px -2px rgba(16,24,40,.06)',
        md: '0 4px 8px -2px rgba(16,24,40,.08), 0 12px 24px -6px rgba(16,24,40,.12)',
        lg: '0 8px 16px -6px rgba(16,24,40,.10), 0 24px 48px -12px rgba(16,24,40,.18)',
        xl: '0 32px 64px -16px rgba(16,24,40,.28)',
        primary: '0 10px 28px -6px rgba(16,86,224,.42)',
        cta: '0 10px 28px -6px rgba(91,189,21,.45)',
        card: '0 1px 3px rgba(16,24,40,.06), 0 8px 24px -8px rgba(16,24,40,.10)',
        'card-hover': '0 8px 16px -6px rgba(16,24,40,.10), 0 24px 48px -12px rgba(16,24,40,.18)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(.4,0,.2,1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.4,0,.2,1) both',
        'fade-in': 'fade-in .4s ease both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
