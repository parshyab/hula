'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@saathi/ui';
import { apiUrl } from '@/lib/trpc';
import { setToken } from '@/lib/session';
import { useRouter } from '@/i18n/routing';

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const [mobile, setMobile] = useState('9435000001'); // seeded demo user (HR)
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/otp/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = (await res.json()) as { devCode?: string };
      setDevCode(data.devCode ?? null);
      if (data.devCode) setOtp(data.devCode);
      setStep('verify');
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile, code: otp, pin }),
      });
      if (!res.ok) throw new Error('bad');
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      router.replace('/me');
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('subtitle')}</p>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1 text-sm">
            {t('mobile')}
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="min-h-[48px] rounded-md border border-border bg-surface px-3"
              inputMode="numeric"
            />
          </label>

          {step === 'request' ? (
            <Button onClick={requestOtp} disabled={busy}>
              {t('requestOtp')}
            </Button>
          ) : (
            <>
              {devCode ? (
                <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-text-muted">
                  {t('otpSentDev', { code: devCode })}
                </p>
              ) : null}
              <label className="grid gap-1 text-sm">
                {t('otp')}
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="min-h-[48px] rounded-md border border-border bg-surface px-3"
                  inputMode="numeric"
                />
              </label>
              <label className="grid gap-1 text-sm">
                {t('pin')}
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  type="password"
                  placeholder="1234"
                  className="min-h-[48px] rounded-md border border-border bg-surface px-3"
                  inputMode="numeric"
                />
              </label>
              <Button onClick={verify} disabled={busy}>
                {t('signIn')}
              </Button>
            </>
          )}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <hr className="my-5 border-border" />
        <p className="text-sm text-text-muted">{t('consoleHint')}</p>
        <a
          href={`${apiUrl}/auth/oidc/login`}
          className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-brand hover:underline"
        >
          {t('consoleLogin')} →
        </a>
      </Card>
    </div>
  );
}
