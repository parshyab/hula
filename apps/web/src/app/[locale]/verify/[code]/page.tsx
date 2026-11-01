'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';

export default function VerifyPage() {
  const t = useTranslations('verify');
  const params = useParams<{ code: string }>();
  const { data, isLoading } = trpc.documents.verify.useQuery({ code: params.code });

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        {isLoading || !data ? (
          <Skeleton className="mt-4 h-20 w-full" />
        ) : !data.valid ? (
          <p className="mt-4 rounded-md bg-surface-2 p-3 text-danger">{t('invalid')}</p>
        ) : (
          <div className="mt-4 grid gap-2 text-sm">
            <p className="inline-flex items-center gap-2 font-medium text-success">✓ {t('valid')}</p>
            <p className="font-medium">{data.title}</p>
            <p className="text-text-muted">{data.summary}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-text-muted">{t('issuedTo')}</p>
                <p className="font-medium">
                  {data.employeeName} ({data.empCode})
                </p>
              </div>
              <div>
                <p className="text-text-muted">{t('issuedOn')}</p>
                <p className="font-medium">{data.issuedAt.slice(0, 10)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
