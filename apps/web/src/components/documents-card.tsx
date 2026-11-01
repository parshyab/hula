'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@saathi/ui';
import { trpc } from '@/lib/trpc';

/** Download a base64 PDF the API returned, client-side (no file hosting needed). */
function downloadPdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DocumentsCard({ empCode }: { empCode: string }) {
  const t = useTranslations('documents');
  const [last, setLast] = useState<{ verifyCode: string } | null>(null);
  const generate = trpc.documents.generate.useMutation({
    onSuccess: (doc) => {
      downloadPdf(doc.filename, doc.pdfBase64);
      setLast({ verifyCode: doc.verifyCode });
    },
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <Button
        className="mt-3"
        variant="outline"
        disabled={generate.isPending}
        onClick={() => generate.mutate({ empCode, docType: 'SALARY_CERTIFICATE' })}
      >
        {t('request')}
      </Button>
      {last ? (
        <p className="mt-3 text-sm text-text-muted">
          {t('download')} · {t('verifyCode')}: <code className="text-brand">{last.verifyCode}</code>
        </p>
      ) : null}
    </Card>
  );
}
