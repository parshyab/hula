import type { Config } from 'tailwindcss';
import { colors, radius, motion } from './tokens';

/**
 * Shared Tailwind preset. Apps extend this so colours, radii and motion stay
 * consistent across web, kiosk and (later) WhatsApp preview surfaces. Semantic
 * colours map to the CSS variables in tokens.css so dark mode just works.
 */
const preset: Partial<Config> = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        // Semantic aliases backed by tokens.css variables.
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        brand: 'var(--color-primary)',
        'brand-fg': 'var(--color-primary-fg)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
      },
      borderRadius: { ...radius },
      transitionTimingFunction: { brand: motion.ease },
      transitionDuration: { brand: motion.base.replace('ms', '') },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        deva: ['var(--font-deva)', 'sans-serif'],
        beng: ['var(--font-beng)', 'sans-serif'],
      },
    },
  },
};

export default preset;
