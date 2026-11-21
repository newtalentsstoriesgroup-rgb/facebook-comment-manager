import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { PageLoader } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';

// Layout y'impapuro zirinzwe: ireba ko umukoresha yinjiye, bitaribyo ikamwohereza kuri /login.
export default function Layout({ title, subtitle, actions, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  if (loading || !user) return <PageLoader />;

  return (
    <div className="min-h-screen">
      <Head>
        <title>{title ? `${title} · FCM` : 'FCM'}</title>
      </Head>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 animate-fade-in sm:px-6 lg:px-8">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
