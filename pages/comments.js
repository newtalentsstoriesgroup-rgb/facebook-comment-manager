import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { MessageSquare, Plus, ListPlus, Search, Check, Trash2, ThumbsUp, Facebook } from 'lucide-react';
import Layout from '@/components/Layout';
import CommentCard from '@/components/CommentCard';
import CommentEditor from '@/components/CommentEditor';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Modal, EmptyState, Pagination } from '@/components/ui';
import { ListSkeleton } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useComments } from '@/hooks/useComments';
import { usePosts } from '@/hooks/usePosts';
import { useTemplates } from '@/hooks/useTemplates';
import {
  createComment,
  createManyComments,
  updateComment,
  duplicateComment,
  deleteComment,
  submitForApproval,
  approveComment,
  bulkApprove,
  bulkDeleteDrafts,
} from '@/lib/comments';
import { STATUS_META, STATUS_KEYS, searchItems, paginate, pageCount } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function CommentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { comments, loading } = useComments();
  const { posts } = usePosts();
  const { templates } = useTemplates();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [postFilter, setPostFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  const [editor, setEditor] = useState({ open: false, comment: null, multiple: false });
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, items }
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const postMap = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts]);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.postId) setPostFilter(String(router.query.postId));
    if (router.query.new) {
      setEditor({ open: true, comment: null, multiple: false });
      router.replace('/comments', undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.postId, router.query.new]);

  useEffect(() => setPage(1), [search, status, postFilter]);

  const filtered = useMemo(() => {
    let list = comments;
    if (status !== 'all') list = list.filter((c) => c.status === status);
    if (postFilter !== 'all') list = list.filter((c) => c.postId === postFilter);
    return searchItems(list, search, ['text']);
  }, [comments, status, postFilter, search]);

  const pages = pageCount(filtered.length, PAGE_SIZE);
  const currentPage = Math.min(page, pages);
  const visible = paginate(filtered, currentPage, PAGE_SIZE);

  const selectedComments = useMemo(
    () => comments.filter((c) => selected.has(c.id)),
    [comments, selected]
  );
  const approvable = selectedComments.filter((c) => ['draft', 'pending', 'rejected'].includes(c.status));
  const deletableDrafts = selectedComments.filter((c) => c.status === 'draft');
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((c) => next.delete(c.id));
      else visible.forEach((c) => next.add(c.id));
      return next;
    });

  // ---------- Ibikorwa ----------
  const handleEditorSubmit = async (payload) => {
    if (editor.comment) {
      await updateComment(user.uid, editor.comment, payload);
      toast.success('Igitekerezo cyahinduwe.');
    } else if (payload.texts) {
      const n = await createManyComments(user.uid, payload);
      toast.success(`Ibitekerezo ${n} byongeweho.`);
    } else {
      await createComment(user.uid, payload);
      toast.success('Igitekerezo cyongeweho.');
    }
  };

  const runSingle = async (comment, fn, okMsg) => {
    setBusyId(comment.id);
    try {
      await fn();
      toast.success(okMsg);
    } catch (err) {
      console.error(err);
      toast.error('Igikorwa cyanze. Ongera ugerageze.');
    } finally {
      setBusyId(null);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.type === 'approve') {
        await approveComment(user.uid, confirm.items[0]);
        toast.success('Igitekerezo cyemejwe.');
      } else if (confirm.type === 'delete') {
        await deleteComment(user.uid, confirm.items[0]);
        toast.success('Igitekerezo cyasibwe.');
      } else if (confirm.type === 'bulkApprove') {
        const n = await bulkApprove(user.uid, confirm.items);
        toast.success(`Ibitekerezo ${n} byemejwe.`);
        setSelected(new Set());
      } else if (confirm.type === 'bulkDelete') {
        const n = await bulkDeleteDrafts(user.uid, confirm.items);
        toast.success(`Inyandikorugero ${n} zasibwe.`);
        setSelected(new Set());
      }
      setConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error('Igikorwa cyanze. Ongera ugerageze.');
    } finally {
      setBusy(false);
    }
  };

  const confirmText = () => {
    if (!confirm) return { title: '', message: '', label: 'Emeza', danger: false };
    switch (confirm.type) {
      case 'approve':
        return {
          title: 'Emeza igitekerezo',
          message: 'Urashaka kwemeza iki gitekerezo? Nyuma yo kucyemeza uzajya kuri "Kwemeza" kugira ngo ucyemererwe gutangazwa kuri Facebook.',
          label: 'Emeza',
          danger: false,
        };
      case 'delete':
        return { title: 'Siba igitekerezo', message: 'Urashaka gusiba iki gitekerezo? Ntibisubizwa inyuma.', label: 'Siba', danger: true };
      case 'bulkApprove':
        return {
          title: 'Emeza ibyahiswemo',
          message: `Ibitekerezo ${confirm.items.length} bizemezwa.`,
          label: 'Emeza',
          danger: false,
        };
      default:
        return {
          title: 'Siba inyandikorugero',
          message: `Inyandikorugero ${confirm.items.length} zizasibwa. Ibitekerezo bitari inyandikorugero ntibizasibwa.`,
          label: 'Siba',
          danger: true,
        };
    }
  };
  const ct = confirmText();

  return (
    <Layout
      title="Ibitekerezo"
      subtitle="Tegura ibitekerezo byawe mbere yo kubyemeza."
      actions={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setEditor({ open: true, comment: null, multiple: true })}
          >
            <ListPlus className="h-4 w-4" /> Byinshi
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditor({ open: true, comment: null, multiple: false })}
          >
            <Plus className="h-4 w-4" /> Igitekerezo gishya
          </button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Shakisha mu bitekerezo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Imiterere yose</option>
          {STATUS_KEYS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select className="input" value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
          <option value="all">Inyandiko zose</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || p.postUrl}
            </option>
          ))}
        </select>
      </div>

      {visible.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Hitamo ibiri kuri iyi paji
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-slate-500">Byahiswemo: {selected.size}</span>
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={!approvable.length}
                onClick={() => setConfirm({ type: 'bulkApprove', items: approvable })}
              >
                <Check className="h-3.5 w-3.5" /> Emeza ({approvable.length})
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={!deletableDrafts.length}
                onClick={() => setConfirm({ type: 'bulkDelete', items: deletableDrafts })}
              >
                <Trash2 className="h-3.5 w-3.5" /> Siba inyandikorugero ({deletableDrafts.length})
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
                Kuraho ibyahiswemo
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={comments.length === 0 ? 'Nta bitekerezo urongeraho' : 'Nta gitekerezo kibonetse'}
          description={
            comments.length === 0
              ? 'Ongeraho igitekerezo cya mbere kugira ngo utangire.'
              : 'Gerageza guhindura ishakisha cyangwa muyunguruzo.'
          }
          action={
            comments.length === 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditor({ open: true, comment: null, multiple: false })}
              >
                <Plus className="h-4 w-4" /> Igitekerezo gishya
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                post={postMap[c.postId]}
                selectable
                selected={selected.has(c.id)}
                onToggle={toggle}
                busy={busyId === c.id}
                onPreview={setPreview}
                onEdit={(comment) => setEditor({ open: true, comment, multiple: false })}
                onDuplicate={(comment) =>
                  runSingle(comment, () => duplicateComment(user.uid, comment), 'Cyakoporowe nk\'inyandikorugero.')
                }
                onSubmit={(comment) =>
                  runSingle(comment, () => submitForApproval(user.uid, comment), 'Cyoherejwe kwemezwa.')
                }
                onApprove={(comment) => setConfirm({ type: 'approve', items: [comment] })}
                onDelete={(comment) => setConfirm({ type: 'delete', items: [comment] })}
              />
            ))}
          </div>
          <Pagination page={currentPage} pages={pages} total={filtered.length} onChange={setPage} />
        </>
      )}

      <CommentEditor
        open={editor.open}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        posts={posts}
        templates={templates}
        initial={editor.comment}
        defaultPostId={postFilter !== 'all' ? postFilter : ''}
        defaultMultiple={editor.multiple}
        onSubmit={handleEditorSubmit}
      />

      {/* Kureba mbere (preview) */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Reba igitekerezo mbere"
        footer={
          preview && ['draft', 'pending', 'rejected'].includes(preview.status) ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>
                Funga
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => {
                  setConfirm({ type: 'approve', items: [preview] });
                  setPreview(null);
                }}
              >
                <Check className="h-4 w-4" /> Emeza
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>
              Funga
            </button>
          )
        }
      >
        {preview && (
          <div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Inyandiko: {postMap[preview.postId]?.title || postMap[preview.postId]?.postUrl || '—'}
            </p>
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                <Facebook className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
                  <p className="text-sm font-semibold">Paji yawe</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{preview.text}</p>
                </div>
                <div className="mt-1 flex gap-3 px-2 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Kunda</span>
                  <span>Subiza</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        danger={ct.danger}
        title={ct.title}
        message={ct.message}
        confirmLabel={ct.label}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </Layout>
  );
}
