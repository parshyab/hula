import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { LOCALES } from '@saathi/config';
import { routing } from '@/i18n/routing';
import { Providers } from '../providers';
import { Header } from '@/components/header';
import { ServiceWorkerRegister } from '@/components/sw-register';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Saathi — HRMS',
  description: 'Agent-first HRMS for Numaligarh Refinery Limited',
  manifest: '/manifest.webmanifest',
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();
  setRequestLocale(locale);

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ServiceWorkerRegister />
            <Header />
            <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
