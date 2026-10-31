'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AiBadge, Button, Card } from '@saathi/ui';
import type { Locale } from '@saathi/config';
import { trpc } from '@/lib/trpc';

export function AskSaathi() {
  const t = useTranslations('saathi');
  const locale = useLocale() as Locale;
  const [question, setQuestion] = useState('');
  const [showWhy, setShowWhy] = useState(false);

  const ask = trpc.saathi.ask.useMutation();

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask.mutate({ question, locale });
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('placeholder')}
          className="min-h-[48px] flex-1 rounded-md border border-border bg-surface px-3"
        />
        <Button type="submit" disabled={ask.isPending}>
          {t('ask')}
        </Button>
      </form>

      {ask.isPending ? <p className="mt-3 text-sm text-text-muted">{t('thinking')}</p> : null}

      {ask.data ? (
        <div className="mt-4 rounded-md border border-border bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap">{ask.data.answer}</p>
            <AiBadge onClick={() => setShowWhy((v) => !v)} />
          </div>

          {ask.data.citedClause ? (
            <p className="mt-2 text-xs font-medium text-brand">
              {t('source')}: {ask.data.citedClause}
            </p>
          ) : null}

          {showWhy ? (
            <div className="mt-3 rounded-md border border-border bg-surface p-3 text-xs text-text-muted">
              <p className="mb-1 font-semibold text-text">{t('whyTitle')}</p>
              <p>
                {t('modelUsed')}: <code>{ask.data.modelUsed}</code>
              </p>
              <p>
                {t('toolsUsed')}: <code>{ask.data.toolsUsed.join(', ') || '—'}</code>
              </p>
              <p>{ask.data.citedClause ? `${t('source')}: ${ask.data.citedClause}` : t('noCitation')}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
