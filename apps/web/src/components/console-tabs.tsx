'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

export function ConsoleTabs() {
  const t = useTranslations('console');
  const path = usePathname();
  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium ${
        path.startsWith(href) ? 'bg-brand text-brand-fg' : 'text-text hover:bg-surface-2'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex gap-2">
      <h1 className="mr-2 self-center text-lg font-semibold">{t('title')}</h1>
      {tab('/console/directory', t('directory'))}
      {tab('/console/approvals', t('approvals'))}
    </div>
  );
}
