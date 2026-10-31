'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AiBadge, Card, EmptyState, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';
import { getToken } from '@/lib/session';
import { useRouter } from '@/i18n/routing';

export default function ActivityPage() {
  const t = useTranslations('activity');
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = trpc.audit.feed.useQuery({ limit: 25 }, { retry: false });

  const forbidden = error?.data?.code === 'FORBIDDEN';

  return (
    <Card>
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('subtitle')}</p>

      {forbidden ? (
        <EmptyState className="mt-4" title={t('hrOnly')} />
      ) : isLoading ? (
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState className="mt-4" title={t('empty')} />
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {data.map((e) => (
            <li key={e.hash} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {e.action}
                  {e.resourceId ? <span className="text-text-muted"> · {e.resourceId}</span> : null}
                </p>
                <p className="text-xs text-text-muted">
                  {e.actorType === 'agent' ? t('agent') : t('human')} · {new Date(e.createdAt).toLocaleString()}
                  {e.citedClause ? ` · ${e.citedClause}` : ''}
                </p>
              </div>
              {e.actorType === 'agent' ? <AiBadge /> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
