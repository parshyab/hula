import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match everything except API, static files and PWA assets.
  matcher: ['/((?!api|_next|_vercel|manifest.webmanifest|sw.js|.*\\..*).*)'],
};
