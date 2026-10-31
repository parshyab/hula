import type { Config } from 'tailwindcss';
import preset from '@saathi/ui/tailwind-preset';

const config: Config = {
  presets: [preset as Partial<Config>],
  content: [
    './src/**/*.{ts,tsx}',
    // Pull class names out of the shared component library too.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
