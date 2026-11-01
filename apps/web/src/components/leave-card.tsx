'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, EmptyState } from '@saathi/ui';
import { trpc } from '@/lib/trpc';

const LEAVE_TYPES = ['CL', 'EL', 'HPL', 'MATERNITY', 'PATERNITY', 'SPECIAL'] as const;

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const d = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
  return d >= 0 ? Math.floor(d) + 1 : 0;
}

const STATUS_COLOR: Record<string, string> = {
  APPROVED: 'text-success',
  REJECTED: 'text-danger',
  SUBMITTED: 'text-accent',
  DRAFT: 'text-text-muted',
};

export function LeaveCard() {
  const t = useTranslations('leave');
  const utils = trpc.useUtils();
  const mine = trpc.leave.mine.useQuery();
  const submit = trpc.leave.submit.useMutation({
    onSuccess: () => {
      utils.leave.mine.invalidate();
      setFrom('');
      setTo('');
      setReason('');
    },
  });

  const [leaveType, setLeaveType] = useState<(typeof LEAVE_TYPES)[number]>('CL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const days = daysBetween(from, to);

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('request')}</h2>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (days > 0) submit.mutate({ leaveType, fromDate: from, toDate: to, days, reason: reason || undefined });
        }}
      >
        <label className="grid gap-1 text-sm">
          {t('type')}
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as (typeof LEAVE_TYPES)[number])}
            className="min-h-[44px] rounded-md border border-border bg-surface px-2"
          >
            {LEAVE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t('days')}
          <input readOnly value={days} className="min-h-[44px] rounded-md border border-border bg-surface-2 px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          {t('from')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-[44px] rounded-md border border-border bg-surface px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          {t('to')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-[44px] rounded-md border border-border bg-surface px-3" />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          {t('reason')}
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[44px] rounded-md border border-border bg-surface px-3" />
        </label>
        <Button type="submit" disabled={submit.isPending || days <= 0} className="sm:col-span-2">
          {t('submit')}
        </Button>
      </form>

      <h3 className="mt-5 text-sm font-semibold text-text-muted">{t('myRequests')}</h3>
      {!mine.data || mine.data.length === 0 ? (
        <EmptyState className="mt-2" title={t('none')} />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {mine.data.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {r.leaveType} · {r.days}d · {r.fromDate.slice(0, 10)}
                {r.citedClause ? <span className="text-text-muted"> · {r.citedClause}</span> : null}
              </span>
              <span className={STATUS_COLOR[r.status] ?? ''}>{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
