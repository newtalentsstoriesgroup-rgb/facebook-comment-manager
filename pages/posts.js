import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FileText, Plus, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import PostCard from '@/components/PostCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Modal, EmptyState, Pagination, StatusBadge } from '@/components/ui';
import { ListSkeleton, Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useComments } from '@/hooks/useComments';
import { createPost, updatePost, deletePost } from '@/lib/posts';
import { extractPostId, validatePost } from '@/lib/validation';
import { searchItems, paginate, pageCount } from '@/lib/utils';

const PAGE_SIZE = 9;
const EMPTY_FORM = { postUrl: '', postId: '', title: '', description: '' };

export default function PostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { posts, loading } = usePosts();
  const { comments } = useComments();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewPost, setViewPost] = useState(null);

  const commentsByPost = useMemo(() => {
    const map = {};
    comments.forEach((c) => {
      (map[c.postId] = map[c.postId] || []).push(c);
    });
    return map;
  }, [comments]);

  useEffect(() => setPage(1), [search, filter]);

  // /posts?new=1 ifungura ifishi nshya ako kanya
  useEffect(() => {
    if (router.isReady && router.query.new) {
      openNew();
      router.replace('/posts', undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.new]);

  const filtered = useMemo(() => {
    let list = searchItems(posts, search, ['title', 'description', 'postUrl', 'postId']);
    if (filter === 'withComments') list = list.filter((p) => (commentsByPost[p.id] || []).length > 0);
    if (filter === 'noComments') list = list.filter((p) => !(commentsByPost[p.id] || []).length);
    if (filter === 'noId') list = list.filter((p) => !p.postId);
    return list;
  }, [posts, search, filter, commentsByPost]);

  const pages = pageCount(filtered.length, PAGE_SIZE);
  const visible = paginate(filtered, Math.min(page, pages), PAGE_SIZE);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setIdTouched(false);
    setFormOpen(true);
  }

  function openEdit(post) {
    setEditing(post);
    setForm({
      postUrl: post.postUrl || '',
      postId: post.postId || '',
      title: post.title || '',
      description: post.description || '',
    });
    setErrors({});
    setIdTouched(true);
    setFormOpen(true);
  }

  const handleUrlChange = (value) => {
    setForm((f) => ({
      ...f,
      postUrl: value,
      postId: idTouched ? f.postId : extractPostId(value),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validatePost(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (editing) {
        await updatePost(user.uid, editing.id, form);
        toast.success('Inyandiko yahinduwe.');
      } else {
        await createPost(user.uid, form);
        toast.success('Inyandiko yongeweho.');
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Ntibyashobotse kubika inyandiko.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePost(user.uid, toDelete);
      toast.success('Inyandiko yasibwe.');
      setToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Ntibyashobotse gusiba inyandiko.');
    } finally {
      setDeleting(false);
    }
  };

  const viewComments = viewPost ? commentsByPost[viewPost.id] || [] : [];

  return (
    <Layout
      title="Inyandiko za Facebook"
      subtitle="Bika inyandiko ushaka gushyiraho ibitekerezo."
      actions={
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus className="h-4 w-4" /> Ongeraho inyandiko
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Shakisha inyandiko…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Inyandiko zose</option>
          <option value="withComments">Zifite ibitekerezo</option>
          <option value="noComments">Zitagira ibitekerezo</option>
          <option value="noId">Zitagira ID</option>
        </select>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={posts.length === 0 ? 'Nta nyandiko urongeraho' : 'Nta nyandiko ibonetse'}
          description={
            posts.length === 0
              ? 'Ongeraho ihuza ry\'inyandiko ya Facebook kugira ngo utangire.'
              : 'Gerageza guhindura ishakisha cyangwa muyunguruzo.'
          }
          action={
            posts.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={openNew}>
                <Plus className="h-4 w-4" /> Ongeraho inyandiko
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                commentCount={(commentsByPost[post.id] || []).length}
                onEdit={openEdit}
                onDelete={setToDelete}
                onViewComments={setViewPost}
              />
            ))}
          </div>
          <Pagination
            page={Math.min(page, pages)}
            pages={pages}
            total={filtered.length}
            onChange={setPage}
          />
        </>
      )}

      {/* Ifishi yo kongeraho / guhindura */}
      <Modal
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        title={editing ? 'Hindura inyandiko' : 'Ongeraho inyandiko'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Reka
            </button>
            <button type="submit" form="post-form" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner />} Bika
            </button>
          </>
        }
      >
        <form id="post-form" onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="p-url">Ihuza ry'inyandiko ya Facebook</label>
            <input
              id="p-url"
              className="input"
              value={form.postUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.facebook.com/..."
            />
            {errors.postUrl && <p className="mt-1 text-xs text-red-600">{errors.postUrl}</p>}
          </div>
          <div>
            <label className="label" htmlFor="p-id">ID y'inyandiko (Post ID)</label>
            <input
              id="p-id"
              className="input"
              value={form.postId}
              onChange={(e) => {
                setIdTouched(true);
                setForm((f) => ({ ...f, postId: e.target.value }));
              }}
              placeholder="Iyuzuzwa yonyine iyo bishoboka"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Gutangaza bisaba ID y'imibare (urugero 1234567890 cyangwa PAGEID_POSTID). Niba ihuza ritayitanga, uyishyiremo wowe ubwawe.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="p-title">Umutwe</label>
            <input
              id="p-title"
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={300}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>
          <div>
            <label className="label" htmlFor="p-desc">Ibisobanuro</label>
            <textarea
              id="p-desc"
              className="input min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={2000}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
          </div>
        </form>
      </Modal>

      {/* Ibitekerezo by'inyandiko */}
      <Modal
        open={!!viewPost}
        onClose={() => setViewPost(null)}
        title={`Ibitekerezo: ${viewPost?.title || ''}`}
        size="lg"
        footer={
          viewPost && (
            <Link href={`/comments?postId=${viewPost.id}`} className="btn btn-primary">
              Fungura mu bitekerezo
            </Link>
          )
        }
      >
        {viewComments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Iyi nyandiko nta bitekerezo ifite.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {viewComments.map((c) => (
              <li key={c.id} className="py-3">
                <StatusBadge status={c.status} />
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Siba inyandiko"
        confirmLabel="Siba"
        message={
          <>
            Urashaka gusiba inyandiko <strong>{toDelete?.title || toDelete?.postUrl}</strong>?{' '}
            Ibitekerezo byayo byose ({(commentsByPost[toDelete?.id] || []).length}) nabyo bizasibwa. Ibi ntibisubizwa inyuma.
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
