// Shared flat ESLint config for the Saathi monorepo.
// Kept intentionally lean for Phase 0: TypeScript rules only. The Next.js app
// layers its own `next lint` on top of this.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/storybook-static/**',
      '**/*.config.*',
      '**/prisma/generated/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
