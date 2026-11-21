import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Bot, Plus, Trash2, Save, Facebook, ShieldAlert } from 'lucide-react';
import Layout from '@/components/Layout';
import { Spinner, Skeleton } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useTemplates } from '@/hooks/useTemplates';
import { useFacebookAccount } from '@/hooks/useFacebookAccount';
import {
  MAX_RULES,
  saveAutoReplyRules,
  setAutoReplyEnabled,
  subscribeAutoReplySettings,
  subscribeReplyLogs,
} from '@/lib/replies';
import { CATEGORIES } from '@/lib/templates';
import { sortByDateDesc, timeAgo } from '@/lib/utils';

const newRule = () => ({
  id: Math.random().toString(36).slice(2, 10),
  keywords: '',
  reply: '',
});

const STATUS_LABEL = {
  replied: ['Cyasubijwe', 'text-emerald-600'],
  failed: ['Cyananiranye', 'text-red-600'],
  skipped: ['Cyasimbutse', 'text-amber-600'],
  pending: ['Kiratunganywa', 'text-slate-500'],
};

export default function AutoReplyPage() {
  const { user } = useAuth();
  const { templates } = useTemplates();
  const { connected, loading: fbLoading } = useFacebookAccount();

  const [settings, setSettings] = useState(undefined); // undefined = bitarapakirwa
  const [rules, setRules] = useState([newRule()]);
  const [maxPerHour, setMaxPerHour] = useState(5);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [origin, setOrigin] = useState('');

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeAutoReplySettings(user.uid, (data) => setSettings(data), () => setSettings(null));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeReplyLogs(user.uid, (items) =>
      setLogs(sortByDateDesc(items.filter((l) => l.source === 'auto'), 'createdAt').slice(0, 15))
    );
  }, [user]);

  // Iyo amakuru ya Firestore ahageze kandi nta mpinduka ziracyabikwa, ahabwa imiterere (form).
  useEffect(() => {
    if (settings === undefined || dirty) return;
    if (settings) {
      setMaxPerHour(settings.maxPerHour || 5);
      setRules(
        (settings.rules || []).length
          ? settings.rules.map((r) => ({
              id: r.id || Math.random().toString(36).slice(2, 10),
              keywords: (r.keywords || []).join(', '),
              reply: r.reply || '',
            }))
          : [newRule()]
      );
    }
  }, [settings, dirty]);

  const enabled = settings?.enabled === true;

  const parsed = useMemo(
    () =>
      rules.map((r) => ({
        id: r.id,
        keywords: r.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        reply: r.reply.trim(),
      })),
    [rules]
  );
  const rulesValid = parsed.length > 0 && parsed.every((r) => r.keywords.length && r.reply);

  const update = (id, patch) => {
    setDirty(true);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    if (!rulesValid) return toast.error('Buri tegeko rigomba kugira amagambo n\'igisubizo.');
    const hourly = Math.min(20, Math.max(1, Math.floor(Number(maxPerHour) || 1)));
    setSaving(true);
    try {
      await saveAutoReplyRules(user.uid, !!settings, { maxPerHour: hourly, rules: parsed });
      setMaxPerHour(hourly);
      setDirty(false);
      toast.success('Amategeko yabitswe.');
    } catch (err) {
      console.error(err);
      toast.error('Ntibyashobotse kubika amategeko.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await setAutoReplyEnabled(!enabled);
      toast.success(!enabled ? 'Gusubiza ubwayo byatangiye.' : 'Gusubiza ubwayo byahagaritswe.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Layout
      title="Gusubiza ubwayo"
      subtitle="Subiza ubwayo ibitekerezo by'abantu bikubiyemo amagambo wahisemo."
    >
      {!fbLoading && !connected && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <Facebook className="h-4 w-4" /> Huza paji ya Facebook mbere.
          </span>
          <Link href="/settings" className="btn btn-primary btn-sm">Jya mu igenamiterere</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${enabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{enabled ? 'Irakora' : 'Ntikora'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dirty ? 'Banza ubike impinduka.' : 'Ikora ku nyandiko wongeyeho muri porogaramu gusa.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${enabled ? 'btn-danger' : 'btn-success'}`}
                onClick={handleToggle}
                disabled={toggling || dirty || !connected || (!enabled && !settings)}
              >
                {toggling && <Spinner />}
                {enabled ? 'Hagarika' : 'Tangira'}
              </button>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Amategeko</h2>
              <span className="text-xs text-slate-500">{rules.length}/{MAX_RULES}</span>
            </div>

            {settings === undefined ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-4">
                {rules.map((r, i) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Itegeko {i + 1}</span>
                      {rules.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon hover:!text-red-600"
                          title="Siba itegeko"
                          onClick={() => {
                            setDirty(true);
                            setRules((prev) => prev.filter((x) => x.id !== r.id));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <label className="label" htmlFor={`kw-${r.id}`}>Amagambo (atandukanyijwe n'akitso ",")</label>
                    <input
                      id={`kw-${r.id}`}
                      className="input"
                      placeholder="igiciro, ibiciro, angahe"
                      value={r.keywords}
                      onChange={(e) => update(r.id, { keywords: e.target.value })}
                    />
                    <div className="mb-1 mt-3 flex items-center justify-between">
                      <label className="label !mb-0" htmlFor={`rp-${r.id}`}>Igisubizo</label>
                      {templates.length > 0 && (
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                          defaultValue=""
                          onChange={(e) => {
                            const t = templates.find((x) => x.id === e.target.value);
                            if (t) update(r.id, { reply: t.text });
                            e.target.value = '';
                          }}
                        >
                          <option value="">Koresha icyitegererezo…</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {CATEGORIES[t.category] || ''} · {t.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <textarea
                      id={`rp-${r.id}`}
                      className="input min-h-[90px]"
                      maxLength={2000}
                      placeholder="Muraho {izina}, …"
                      value={r.reply}
                      onChange={(e) => update(r.id, { reply: e.target.value })}
                    />
                  </div>
                ))}

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={rules.length >= MAX_RULES}
                    onClick={() => {
                      setDirty(true);
                      setRules((prev) => [...prev, newRule()]);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Ongeraho itegeko
                  </button>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="label" htmlFor="max-h">Ibisubizo byinshi ku isaha</label>
                      <input
                        id="max-h"
                        type="number"
                        min={1}
                        max={20}
                        className="input w-28"
                        value={maxPerHour}
                        onChange={(e) => {
                          setDirty(true);
                          setMaxPerHour(e.target.value);
                        }}
                      />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                      {saving ? <Spinner /> : <Save className="h-4 w-4" />} Bika
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4 text-amber-600" /> Uko ikora n'imipaka
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-600 dark:text-slate-300">
              <li>Isubiza ibitekerezo by'abantu bya mbere gusa (si ibisubizo, kandi si ibya Paji ubwayo).</li>
              <li>Itegeko rya mbere ribonetse ni ryo rikora.</li>
              <li>Buri gitekerezo gisubizwa rimwe gusa.</li>
              <li>Umupaka w'ibisubizo ku isaha urubahirizwa (byinshi 20).</li>
              <li>Ikora ku nyandiko wongeyeho muri "Inyandiko" gusa, zifite ID y'imibare.</li>
              <li><code className="font-mono">{'{izina}'}</code> isimburwa n'izina rya mbere ry'uwanditse.</li>
            </ul>
            <p className="mt-3 break-all rounded-lg bg-slate-100 p-2 text-[11px] dark:bg-slate-800">
              Webhook URL: {origin}/api/facebook/webhook
            </p>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Ibisubizo bya vuba</h2>
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500">Nta bisubizo birabaho.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((l) => {
                  const [label, cls] = STATUS_LABEL[l.status] || STATUS_LABEL.pending;
                  return (
                    <li key={l.id} className="py-2 text-xs">
                      <span className={`font-semibold ${cls}`}>{label}</span>
                      <span className="ml-2 text-slate-400">{timeAgo(l.createdAt)}</span>
                      {l.error && <p className="mt-0.5 text-slate-500">{l.error}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
