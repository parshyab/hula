'use client';

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@saathi/api/trpc';

export const trpc = createTRPCReact<AppRouter>();

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
