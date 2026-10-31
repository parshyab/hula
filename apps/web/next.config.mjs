import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TS source; Next transpiles them.
  transpilePackages: ['@saathi/ui', '@saathi/config'],
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
