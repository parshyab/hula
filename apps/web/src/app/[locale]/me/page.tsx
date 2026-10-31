'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';
import { getToken } from '@/lib/session';
import { Link, useRouter } from '@/i18n/routing';
import { AskSaathi } from '@/components/ask-saathi';

export default function MePage() {
  const t = useTranslations('profile');
  const tn = useTranslations('nav');
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, isError } = trpc.me.profile.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  return (
    <div className="grid gap-6">
      <Card>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        {isLoading || !data ? (
          <div className="mt-4 grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label={t('empCode')} value={data.empCode} />
            <Field label="" value={`${data.firstName} ${data.lastName}`} />
            <Field label={t('designation')} value={data.designation ?? '—'} />
            <Field label={t('grade')} value={data.grade ?? '—'} />
            <Field label={t('unit')} value={data.unit ?? '—'} />
            <Field label={t('status')} value={data.status} />
            <Field label={t('pan')} value={data.panMasked ?? '—'} />
            <Field label={t('bank')} value={data.bankMasked ?? '—'} />
          </dl>
        )}
      </Card>

      <AskSaathi />

      <Link href="/activity" className="text-sm font-medium text-brand hover:underline">
        {tn('activity')} →
      </Link>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
