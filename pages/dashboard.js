import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  MessageSquare,
  FilePen,
  Clock,
  CheckCircle2,
  Rocket,
  AlertTriangle,
  Plus,
  Facebook,
  History as HistoryIcon,
} from 'lucide-react';
import Layout from '@/components/Layout';
import StatCard from '@/components/StatCard';
import ActivityItem from '@/components/ActivityItem';
import { StatusBadge, EmptyState } from '@/components/ui';
import { ListSkeleton, StatSkeletons } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useComments } from '@/hooks/useComments';
import { usePosts } from '@/hooks/usePosts';
import { useFacebookAccount } from '@/hooks/useFacebookAccount';
import { subscribeActivity } from '@/lib/activity';
import { STATUS_META, STATUS_KEYS, timeAgo, toDate } from '@/lib/utils';

const BAR_COLORS = {
  draft: 'bg-slate-400',
  pending: 'bg-amber-500',
  approved: 'bg-blue-500',
  published: 'bg-emerald-500',
  rejected: 'bg-orange-500',
  failed: 'bg-red-500',
};

function lastSevenDays(comments) {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ date: d, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
  }
  comments.forEach((c) => {
    const created = toDate(c.createdAt);
    if (!created) return;
    const day = days.find((d) => {
      const next = new Date(d.date);
      next.setDate(next.getDate() + 1);
      return created >= d.date && created < next;
    });
    if (day) day.count += 1;
  });
  return days;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { comments, counts, loading: cLoading } = useComments();
  const { posts, loading: pLoading } = usePosts();
  const { connected, account, loading: fLoading } = useFacebookAccount();
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeActivity(
      user.uid,
      8,
      (items) => {
        setLogs(items);
        setLogsLoading(false);
      },
      () => {
        setLogsError(true);
        setLogsLoading(false);
      }
    );
  }, [user]);

  const postMap = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts]);
  const week = useMemo(() => lastSevenDays(comments), [comments]);
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const loading = cLoading || pLoading;

  const stats = [
    { label: 'Ibitekerezo byose', value: counts.total, icon: MessageSquare, color: 'blue' },
    { label: 'Inyandikorugero', value: counts.draft, icon: FilePen, color: 'slate' },
    { label: 'Biritegereje', value: counts.pending, icon: Clock, color: 'amber' },
    { label: 'Byemejwe', value: counts.approved, icon: CheckCircle2, color: 'blue' },
    { label: 'Byatangajwe', value: counts.published, icon: Rocket, color: 'green' },
    { label: 'Byananiranye', value: counts.failed, icon: AlertTriangle, color: 'red' },
    { label: 'Inyandiko za Facebook', value: posts.length, icon: FileText, color: 'purple' },
  ];

  return (
    <Layout title="Ikibaho" subtitle="Incamake y'ibikorwa byawe byose.">
      {!fLoading && !connected && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            {account?.connectionStatus === 'expired'
              ? 'Ihuza rya Facebook ryarangiye. Ongera uryubake kugira ngo ubone gutangaza.'
              : 'Ntabwo urahuza paji ya Facebook. Uzayihuza kugira ngo ubone gutangaza ibitekerezo.'}
          </span>
          <Link href="/settings" className="btn btn-primary btn-sm">Huza Facebook</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <StatSkeletons count={7} />
        ) : (
          stats.map((s) => <StatCard key={s.label} {...s} />)
        )}
        <div className="card flex flex-col justify-center gap-2 p-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ibikorwa byihuse</p>
          <Link href="/posts?new=1" className="btn btn-secondary btn-sm justify-start">
            <Plus className="h-3.5 w-3.5" /> Inyandiko nshya
          </Link>
          <Link href="/comments?new=1" className="btn btn-secondary btn-sm justify-start">
            <Plus className="h-3.5 w-3.5" /> Igitekerezo gishya
          </Link>
          <Link href="/approvals" className="btn btn-secondary btn-sm justify-start">
            <CheckCircle2 className="h-3.5 w-3.5" /> Kwemeza ({counts.pending})
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Ibitekerezo ukurikije imiterere</h2>
          {loading ? (
            <ListSkeleton rows={2} />
          ) : counts.total === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nta bitekerezo birabaho.</p>
          ) : (
            <ul className="space-y-3">
              {STATUS_KEYS.map((s) => {
                const pct = counts.total ? Math.round((counts[s] / counts.total) * 100) : 0;
                return (
                  <li key={s}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{STATUS_META[s].label}</span>
                      <span className="text-slate-500">
                        {counts[s]} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[s]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Ibitekerezo byanditswe mu minsi 7 ishize</h2>
          {loading ? (
            <ListSkeleton rows={2} />
          ) : (
            <div className="flex h-44 items-end justify-between gap-2">
              {week.map((d) => (
                <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs text-slate-500">{d.count}</span>
                  <div
                    className="w-full max-w-[36px] rounded-t-md bg-brand-500 transition-all duration-500"
                    style={{ height: `${(d.count / weekMax) * 100}%`, minHeight: d.count ? 4 : 2, opacity: d.count ? 1 : 0.25 }}
                  />
                  <span className="text-[10px] text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Ibitekerezo bya vuba</h2>
            <Link href="/comments" className="text-xs font-medium text-brand-600 hover:underline">Byose</Link>
          </div>
          {loading ? (
            <ListSkeleton rows={2} />
          ) : comments.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nta bitekerezo" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {comments.slice(0, 5).map((c) => (
                <li key={c.id} className="py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="truncate text-xs text-slate-500">
                      {postMap[c.postId]?.title || 'Inyandiko'}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{c.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Inyandiko za vuba</h2>
            <Link href="/posts" className="text-xs font-medium text-brand-600 hover:underline">Zose</Link>
          </div>
          {loading ? (
            <ListSkeleton rows={2} />
          ) : posts.length === 0 ? (
            <EmptyState icon={FileText} title="Nta nyandiko" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {posts.slice(0, 5).map((p) => (
                <li key={p.id} className="py-3">
                  <p className="truncate text-sm font-medium">{p.title || 'Nta mutwe'}</p>
                  <p className="truncate text-xs text-slate-500">{p.postUrl}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(p.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Ibikorwa bya vuba</h2>
            <Link href="/history" className="text-xs font-medium text-brand-600 hover:underline">Amateka</Link>
          </div>
          {logsLoading ? (
            <ListSkeleton rows={2} />
          ) : logsError ? (
            <p className="py-6 text-center text-sm text-amber-700 dark:text-amber-300">
              Amateka ntashobora kugaragara. Reba ko wakoze index ya Firestore (reba README).
            </p>
          ) : logs.length === 0 ? (
            <EmptyState icon={HistoryIcon} title="Nta bikorwa" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((l) => (
                <ActivityItem key={l.id} log={l} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
