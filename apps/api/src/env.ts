import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadEnv } from '@saathi/config';

// Load the monorepo-root .env before validating. The API may run from apps/api,
// so resolve the root explicitly rather than relying on cwd.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '../../../.env') });

export const env = loadEnv();
