/**
 * Design tokens for Saathi. The primary is a teal/deep-green that nods to
 * Assam's tea gardens. Tokens are the single source — Tailwind theme and the
 * CSS variables in tokens.css are both derived from these values.
 *
 * Never use NRL's real logo or brand colours; this is a neutral placeholder set.
 */
export const colors = {
  // Teal / deep-green primary ramp.
  primary: {
    50: '#edfaf6',
    100: '#d2f2e8',
    200: '#a6e5d2',
    300: '#6fd1b6',
    400: '#39b596',
    500: '#179a7d',
    600: '#0d7c66',
    700: '#0c6353',
    800: '#0d4f44',
    900: '#0c4139',
    950: '#042520',
  },
  // Warm sand accent for highlights (e.g. "what changed" diffs).
  accent: {
    400: '#e0b15a',
    500: '#cf9a3b',
    600: '#b07e28',
  },
} as const;

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
} as const;

export const spacing = {
  // Minimum touch targets per the design direction.
  touch: '48px',
  touchKiosk: '72px',
} as const;

export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const tokens = { colors, radius, spacing, motion } as const;
