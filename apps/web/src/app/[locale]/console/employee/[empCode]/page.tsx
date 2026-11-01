'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, EmptyState, Skeleton } from '@saathi/ui';
import { trpc } from '@/lib/trpc';
import { getToken } from '@/lib/session';
import { Link, useRouter } from '@/i18n/routing';

function downloadPdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const DOC_TYPES = ['SALARY_CERTIFICATE', 'SERVICE_CERTIFICATE', 'NOC'] as const;

export default function EmployeeDetailPage() {
  const t = useTranslations('console');
  const router = useRouter();
  const params = useParams<{ empCode: string }>();
  const empCode = params.empCode;
  const [issued, setIssued] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const { data, isLoading, error } = trpc.employees.serviceBook.useQuery({ empCode }, { retry: false });
  const generate = trpc.documents.generate.useMutation({
    onSuccess: (doc) => {
      downloadPdf(doc.filename, doc.pdfBase64);
      setIssued(doc.verifyCode);
    },
  });

  const forbidden = error?.data?.code === 'FORBIDDEN';

  return (
    <div className="grid gap-6">
      <Link href="/console/directory" className="text-sm font-medium text-brand hover:underline">
        ← {t('backToDirectory')}
      </Link>

      {forbidden ? (
        <Card>
          <EmptyState title={t('forbidden')} />
        </Card>
      ) : isLoading || !data ? (
        <Card>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Card>
      ) : (
        <>
          <Card>
            <h1 className="text-xl font-semibold">
              {data.employee.firstName} {data.employee.lastName}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {data.employee.empCode} · {data.employee.designation ?? '—'} · {data.employee.grade ?? '—'} ·{' '}
              {data.employee.unit ?? '—'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {DOC_TYPES.map((dt) => (
                <Button
                  key={dt}
                  variant="outline"
                  disabled={generate.isPending}
                  onClick={() => generate.mutate({ empCode, docType: dt })}
                >
                  {t('generate')}: {dt === 'SALARY_CERTIFICATE' ? t('salaryCert') : dt === 'SERVICE_CERTIFICATE' ? t('serviceCert') : t('noc')}
                </Button>
              ))}
            </div>
            {issued ? (
              <p className="mt-3 text-sm text-text-muted">
                {t('generate')} ✓ · {data.employee ? 'QR' : ''} code: <code className="text-brand">{issued}</code>
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">{t('serviceBook')}</h2>
            <ol className="mt-4 border-l-2 border-border pl-5">
              {data.entries.map((e) => (
                <li key={e.id} className="relative pb-6">
                  <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-brand bg-surface" />
                  <p className="text-xs font-medium text-brand">{e.entryType}</p>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-text-muted">
                    {e.effectiveDate.slice(0, 10)}
                    {e.detail ? ` · ${e.detail}` : ''}
                    {e.orderRef ? ` · ${e.orderRef}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}
