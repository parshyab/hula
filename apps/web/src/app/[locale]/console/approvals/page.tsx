'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, EmptyState, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';
import { getToken } from '@/lib/session';
import { useRouter } from '@/i18n/routing';
import { ConsoleTabs } from '@/components/console-tabs';

export default function ApprovalsPage() {
  const t = useTranslations('console');
  const tl = useTranslations('leave');
  const router = useRouter();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = trpc.leave.inbox.useQuery(undefined, { retry: false });
  const decide = trpc.leave.decide.useMutation({ onSuccess: () => utils.leave.inbox.invalidate() });
  const forbidden = error?.data?.code === 'FORBIDDEN';

  return (
    <div>
      <ConsoleTabs />
      <Card>
        {forbidden ? (
          <EmptyState title={t('forbidden')} />
        ) : isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState title={t('inboxEmpty')} />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.employeeName} <span className="text-text-muted">· {r.empCode}</span>
                    </p>
                    <p className="text-sm text-text-muted">
                      {r.leaveType} · {r.days}d · {r.fromDate.slice(0, 10)} → {r.toDate.slice(0, 10)}
                      {r.unit ? ` · ${r.unit}` : ''}
                    </p>
                    {r.reason ? <p className="mt-1 text-sm">“{r.reason}”</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, decision: 'APPROVED' })}
                    >
                      {t('approve')}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, decision: 'REJECTED' })}
                    >
                      {t('reject')}
                    </Button>
                  </div>
                </div>
                {decide.data && decide.variables?.id === r.id ? (
                  <p className="mt-2 text-xs text-text-muted">
                    {t('rule')} {decide.data.eligibility.clauseRef}: {decide.data.eligibility.reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-text-muted">{tl('submitted')} → {t('approve')}/{t('reject')}</p>
    </div>
  );
}
