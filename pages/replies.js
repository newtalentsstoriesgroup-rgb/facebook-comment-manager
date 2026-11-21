import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Reply, RefreshCw, Facebook, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Modal, EmptyState } from '@/components/ui';
import { ListSkeleton, Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useTemplates } from '@/hooks/useTemplates';
import { useFacebookAccount } from '@/hooks/useFacebookAccount';
import { fetchPostComments, sendReply, subscribeReplyLogs } from '@/lib/replies';
import { CATEGORIES, fillTemplate } from '@/lib/templates';
import { timeAgo } from '@/lib/utils';

export default function RepliesPage() {
  const { user } = useAuth();
  const { posts } = usePosts();
  const { templates } = useTemplates();
  const { connected, loading: fbLoading } = useFacebookAccount();

  const [postId, setPostId] = useState('');
  const [comments, setComments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [repliedIds, setRepliedIds] = useState(new Set());

  const [target, setTarget] = useState(null); // igitekerezo gisubizwa
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeReplyLogs(user.uid, (logs) =>
      setRepliedIds(new Set(logs.filter((l) => l.status === 'replied').map((l) => l.commentId)))
    );
  }, [user]);

  const usablePosts = useMemo(() => posts.filter((p) => p.postId), [posts]);

  const load = async () => {
    if (!postId) return toast.error('Banza uhitemo inyandiko.');
    setLoading(true);
    try {
      const data = await fetchPostComments(postId);
      setComments(data.comments);
    } catch (err) {
      setComments(null);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openReply = (c) => {
    setTarget(c);
    setText('');
  };

  const applyTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (t) setText(fillTemplate(t.text, target?.fromName));
  };

  const handleSend = async () => {
    if (!text.trim()) return toast.error('Andika igisubizo.');
    setSending(true);
    try {
      await sendReply(target.id, text.trim());
      toast.success('Igisubizo cyoherejwe kuri Facebook.');
      setTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout
      title="Gusubiza"
      subtitle="Subiza ibitekerezo by'abantu nyabo ku nyandiko zawe, nka Paji yawe."
    >
      {!fbLoading && !connected && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <Facebook className="h-4 w-4" /> Huza paji ya Facebook kugira ngo ubone gusoma no gusubiza.
          </span>
          <Link href="/settings" className="btn btn-primary btn-sm">Jya mu igenamiterere</Link>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <select className="input flex-1" value={postId} onChange={(e) => setPostId(e.target.value)}>
          <option value="">— Hitamo inyandiko —</option>
          {usablePosts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || p.postUrl}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={load} disabled={loading || !connected}>
          {loading ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Shakisha ibitekerezo
        </button>
      </div>
      {posts.length > 0 && usablePosts.length === 0 && (
        <p className="mb-4 text-xs text-amber-700 dark:text-amber-300">
          Nta nyandiko ifite ID ya Facebook. Hindura inyandiko ushyiremo ID y'imibare.
        </p>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : comments === null ? (
        <EmptyState
          icon={Reply}
          title="Hitamo inyandiko"
          description="Hitamo inyandiko hanyuma ukande 'Shakisha ibitekerezo' kugira ngo ubone ibyanditswe n'abantu."
        />
      ) : comments.length === 0 ? (
        <EmptyState icon={Reply} title="Nta bitekerezo by'abantu" description="Nta muntu uragira icyo yandika kuri iyi nyandiko." />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const replied = repliedIds.has(c.id);
            return (
              <li key={c.id} className="card p-4 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{c.fromName || 'Umuntu'}</p>
                  <span className="text-xs text-slate-500">{timeAgo(c.createdTime)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.message}</p>
                <div className="mt-3 flex justify-end border-t border-slate-100 pt-2 dark:border-slate-800">
                  {replied ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Cyamaze gusubizwa
                    </span>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => openReply(c)}>
                      <Reply className="h-3.5 w-3.5" /> Subiza
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!target}
        onClose={sending ? undefined : () => setTarget(null)}
        title="Subiza igitekerezo"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTarget(null)} disabled={sending}>
              Reka
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
              {sending && <Spinner />} Ohereza igisubizo
            </button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
              <p className="mb-1 text-xs font-semibold text-slate-500">{target.fromName || 'Umuntu'}</p>
              <p className="whitespace-pre-wrap break-words">{target.message}</p>
            </div>
            {templates.length > 0 && (
              <div>
                <label className="label" htmlFor="rp-tpl">Koresha icyitegererezo</label>
                <select id="rp-tpl" className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">— Hitamo —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {CATEGORIES[t.category] || ''} · {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="rp-text">Igisubizo cyawe</label>
              <textarea
                id="rp-text"
                className="input min-h-[120px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={8000}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kuri "Ohereza igisubizo", kizatangazwa ako kanya nka Paji yawe. Buri gitekerezo gisubizwa rimwe gusa.
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
