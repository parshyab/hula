'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, EmptyState, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';
import { getToken } from '@/lib/session';
import { Link, useRouter } from '@/i18n/routing';
import { ConsoleTabs } from '@/components/console-tabs';

export default function DirectoryPage() {
  const t = useTranslations('console');
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = trpc.employees.list.useQuery({ query }, { retry: false });
  const forbidden = error?.data?.code === 'FORBIDDEN';

  return (
    <div>
      <ConsoleTabs />
      <Card>
        {forbidden ? (
          <EmptyState title={t('forbidden')} />
        ) : (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="min-h-[48px] w-full rounded-md border border-border bg-surface px-3"
            />
            {isLoading ? (
              <div className="mt-4 grid gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {(data ?? []).map((e) => (
                  <li key={e.empCode} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {e.firstName} {e.lastName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {e.empCode} · {e.designation ?? '—'} · {e.unit ?? '—'}
                      </p>
                    </div>
                    <Link
                      href={`/console/employee/${e.empCode}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {t('open')} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
