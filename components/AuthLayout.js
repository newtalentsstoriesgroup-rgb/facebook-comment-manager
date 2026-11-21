import Head from 'next/head';
import Link from 'next/link';
import { Facebook } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Head>
        <title>{title} · FCM</title>
      </Head>
      <div className="w-full max-w-md animate-slide-up">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Facebook className="h-5 w-5" />
          </span>
          Facebook Comment Manager
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</p>
        )}
      </div>
    </div>
  );
}
