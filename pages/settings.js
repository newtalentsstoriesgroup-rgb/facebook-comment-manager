import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Facebook, Link2, Unlink, Moon, Sun, ShieldCheck, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Spinner, Skeleton } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useFacebookAccount } from '@/hooks/useFacebookAccount';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const FB_ERRORS = {
  denied: 'Wanze guha porogaramu uburenganzira kuri Facebook.',
  invalid_state: 'Igikorwa cyo guhuza cyarangiye cyangwa nticyemewe. Ongera ugerageze.',
  no_pages: 'Nta paji ya Facebook ubona ushinzwe. Ugomba kuba ushinzwe nibura paji imwe.',
  failed: 'Guhuza na Facebook byanze. Ongera ugerageze.',
  not_configured: 'Seriveri ntiramera neza (Facebook App ID/Secret). Reba README.',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, mounted, toggleTheme } = useTheme();
  const { account, connected, expired, loading } = useFacebookAccount();

  const [connecting, setConnecting] = useState(false);
  const [pages, setPages] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectingId, setSelectingId] = useState(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const handled = useRef(false);

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const data = await apiFetch('/api/facebook/pages');
      setPages(data.pages || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingPages(false);
    }
  };

  // Iyo Facebook isubije umukoresha kuri /settings?fb=select cyangwa ?fb_error=...
  useEffect(() => {
    if (!router.isReady || !user || handled.current) return;
    const { fb, fb_error: fbError } = router.query;
    if (!fb && !fbError) return;
    handled.current = true;
    if (fbError) toast.error(FB_ERRORS[fbError] || FB_ERRORS.failed);
    if (fb === 'select') loadPages();
    router.replace('/settings', undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, user, router.query]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await apiFetch('/api/facebook/connect', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      toast.error(err.message);
      setConnecting(false);
    }
  };

  const handleSelect = async (page) => {
    setSelectingId(page.id);
    try {
      await apiFetch('/api/facebook/pages', { method: 'POST', body: { pageId: page.id } });
      toast.success(`Paji "${page.name}" yahujwe neza.`);
      setPages(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSelectingId(null);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiFetch('/api/facebook/disconnect', { method: 'POST' });
      toast.success('Facebook yatandukanyijwe.');
      setDisconnectOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Layout title="Igenamiterere" subtitle="Genzura ihuza rya Facebook n'imiterere ya porogaramu.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Facebook className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Ihuza rya Facebook</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Meta Graph API yemewe — gutangaza ibitekerezo ukoresheje paji ushinzwe.
              </p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : pages ? (
            <div>
              <p className="mb-3 text-sm font-medium">Hitamo paji ushaka guhuza:</p>
              {pages.length === 0 ? (
                <p className="text-sm text-slate-500">Nta paji ibonetse.</p>
              ) : (
                <ul className="space-y-2">
                  {pages.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-slate-500">ID: {p.id}</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!!selectingId}
                        onClick={() => handleSelect(p)}
                      >
                        {selectingId === p.id && <Spinner />} Hitamo
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setPages(null)}>
                Reka
              </button>
            </div>
          ) : connected || expired ? (
            <div>
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-medium">{account.pageName}</p>
                <p className="mt-1 text-xs text-slate-500">Page ID: {account.pageId}</p>
                <p className="mt-1 text-xs text-slate-500">Yahujwe: {formatDate(account.connectedAt)}</p>
                <p className={`mt-2 text-sm font-medium ${expired ? 'text-red-600' : 'text-emerald-600'}`}>
                  {expired ? 'Ihuza ryarangiye — ongera uryubake.' : 'Rirakora'}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={handleConnect} disabled={connecting}>
                  {connecting ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                  {expired ? 'Ongera uhuze' : 'Hindura paji'}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setDisconnectOpen(true)}>
                  <Unlink className="h-4 w-4" /> Tandukanya
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Nta paji ya Facebook irahuzwa. Kanda hasi ukomeze kuri Facebook uhitemo paji ushinzwe.
              </p>
              <button type="button" className="btn btn-primary" onClick={handleConnect} disabled={connecting || loadingPages}>
                {connecting || loadingPages ? <Spinner /> : <Link2 className="h-4 w-4" />}
                Huza Facebook
              </button>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Ibimenyetso byo kwinjira (access tokens) bibikwa ku seriveri gusa, byifungishije ijambo ry'ibanga. Ntibigera bijya muri mushakisha yawe.
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Isura</h2>
          <button type="button" className="btn btn-secondary w-full" onClick={toggleTheme}>
            {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mounted && theme === 'dark' ? 'Koresha urumuri' : 'Koresha umwijima'}
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        danger
        loading={disconnecting}
        title="Tandukanya Facebook"
        confirmLabel="Tandukanya"
        message="Urashaka gutandukanya paji ya Facebook? Ibimenyetso byayo bizasibwa ku seriveri, kandi ntuzabasha gutangaza kugeza ongeye guhuza."
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectOpen(false)}
      />
    </Layout>
  );
}
