import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2, FileText, MessageSquare, ShieldCheck, Facebook } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/Loading';

const FEATURES = [
  { icon: FileText, title: 'Inyandiko', text: 'Bika amahuza y\'inyandiko za Facebook ukayacunga hamwe.' },
  { icon: MessageSquare, title: 'Ibitekerezo', text: 'Andika, hindura kandi utegure ibitekerezo mbere yo kubitangaza.' },
  { icon: CheckCircle2, title: 'Kwemeza', text: 'Wowe ubwawe wemeza buri gitekerezo mbere yo gutangazwa.' },
  { icon: ShieldCheck, title: 'Umutekano', text: 'Amakuru yawe ni ayawe wenyine. Nta wundi ushobora kuyabona.' },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  if (loading || user) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Head>
        <title>Facebook Comment Manager</title>
      </Head>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Facebook className="h-5 w-5" />
          </span>
          FCM
        </span>
        <div className="flex gap-2">
          <Link href="/login" className="btn btn-secondary">Injira</Link>
          <Link href="/register" className="btn btn-primary">Iyandikishe</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:pt-20">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Genzura ibitekerezo byawe kuri <span className="text-brand-600">Facebook</span> ahantu hamwe
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Tegura, wemeze kandi utangaze ibitekerezo kuri paji yawe ya Facebook ukoresheje Meta Graph API yemewe.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn btn-primary px-6 py-3">Tangira ubu</Link>
          <Link href="/login" className="btn btn-secondary px-6 py-3">Injira</Link>
        </div>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
