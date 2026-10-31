'use client';

import { useTranslations, useLocale } from 'next-intl';
import { LOCALES, LOCALE_LABELS, type Locale } from '@saathi/config';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { clearToken, getToken } from '@/lib/session';
import { useEffect, useState } from 'react';

export function Header() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => setSignedIn(!!getToken()), []);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/me" className="flex items-center gap-2 font-semibold text-brand">
          {/* Placeholder mark — never NRL's real logo. */}
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-brand text-brand-fg">
            স
          </span>
          {t('common.appName')}
        </Link>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="locale">
            {t('common.language')}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
            className="min-h-[40px] rounded-md border border-border bg-surface px-2 text-sm"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
          {signedIn ? (
            <button
              onClick={() => {
                clearToken();
                router.replace('/login');
              }}
              className="min-h-[40px] rounded-md border border-border px-3 text-sm hover:bg-surface-2"
            >
              {t('common.signOut')}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
