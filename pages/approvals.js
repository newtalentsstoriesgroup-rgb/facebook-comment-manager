import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle2, Check, Facebook, AlertTriangle, Rocket } from 'lucide-react';
import Layout from '@/components/Layout';
import CommentCard from '@/components/CommentCard';
import CommentEditor from '@/components/CommentEditor';
import ConfirmDialog from '@/components/ConfirmDialog';
import { EmptyState, Modal, Pagination, StatusBadge } from '@/components/ui';
import { ListSkeleton, Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useComments } from '@/hooks/useComments';
import { usePosts } from '@/hooks/usePosts';
import { useFacebookAccount } from '@/hooks/useFacebookAccount';
import {
  updateComment,
  approveComment,
  rejectComment,
  bulkApprove,
  deleteComment,
  retryComment,
  publishComment,
} from '@/lib/comments';
import { cn, formatDate, paginate, pageCount, sortByDateDesc } from '@/lib/utils';

const PAGE_SIZE = 10;
const MAX_BULK_PUBLISH = 30; // byinshi muri buri gikorwa
const BULK_DELAY_MS = 15000; // akanya hagati y'ibitangazwa (munsi y'umupaka wa 5/umunota)
// Iyo ikosa ni rimwe muri ibi, gutangaza byose birahagarara (ntibyakosorwa no gukomeza).
const STOP_CODES = ['expired', 'not_connected', 'permission', 'rate_limit', 'blocked', 'api_error'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TABS = [
  { key: 'pending', label: 'Biritegereje' },
  { key: 'approved', label: 'Byemejwe (byo gutangaza)' },
  { key: 'history', label: 'Amateka yo kwemeza' },
];

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { comments, counts, loading } = useComments();
  const { posts } = usePosts();
  const { connected, expired, account, loading: fbLoading } = useFacebookAccount();

  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, items }
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bulk, setBulk] = useState(null); // { running, total, done, ok, failed, message }
  const cancelRef = useRef(false);

  const postMap = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts]);

  const list = useMemo(() => {
    if (tab === 'pending') return comments.filter((c) => c.status === 'pending');
    if (tab === 'approved') return comments.filter((c) => c.status === 'approved');
    return sortByDateDesc(
      comments.filter((c) => ['approved', 'rejected', 'published', 'failed'].includes(c.status)),
      'updatedAt'
    );
  }, [comments, tab]);

  const pages = pageCount(list.length, PAGE_SIZE);
  const currentPage = Math.min(page, pages);
  const visible = paginate(list, currentPage, PAGE_SIZE);

  const selectedPending = list.filter((c) => selected.has(c.id) && c.status === 'pending');
  const selectedApproved = list.filter((c) => selected.has(c.id) && c.status === 'approved');
  const allApproved = useMemo(() => comments.filter((c) => c.status === 'approved'), [comments]);
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  const switchTab = (key) => {
    setTab(key);
    setPage(1);
    setSelected(new Set());
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((c) => next.delete(c.id));
      else visible.forEach((c) => next.add(c.id));
      return next;
    });

  const runConfirm = async () => {
    if (!confirm) return;
    const item = confirm.items[0];
    setBusy(true);
    try {
      switch (confirm.type) {
        case 'approve':
          await approveComment(user.uid, item);
          toast.success('Igitekerezo cyemejwe.');
          break;
        case 'reject':
          await rejectComment(user.uid, item);
          toast.success('Igitekerezo cyanzwe.');
          break;
        case 'delete':
          await deleteComment(user.uid, item);
          toast.success('Igitekerezo cyasibwe.');
          break;
        case 'bulkApprove': {
          const n = await bulkApprove(user.uid, confirm.items);
          toast.success(`Ibitekerezo ${n} byemejwe.`);
          setSelected(new Set());
          break;
        }
        case 'publish': {
          setBusyId(item.id);
          await publishComment(item.id);
          toast.success('Igitekerezo cyatangajwe kuri Facebook!');
          break;
        }
        default:
          break;
      }
      setConfirm(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Igikorwa cyanze.');
      setConfirm(null);
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  };

  // Gutangaza ibyemejwe byinshi: bitangazwa KIMWE KIMWE, hari akanya hagati yabyo.
  const startBulk = async () => {
    const items = confirm.items.slice(0, MAX_BULK_PUBLISH);
    setConfirm(null);
    cancelRef.current = false;
    let ok = 0;
    let failed = 0;
    let done = 0;
    let message = '';
    setBulk({ running: true, total: items.length, done, ok, failed, message });

    for (let i = 0; i < items.length; i += 1) {
      if (cancelRef.current) {
        message = 'Wahagaritse. Ibitaratangazwa bigumye "Cyemejwe".';
        break;
      }
      try {
        await publishComment(items[i].id);
        ok += 1;
      } catch (err) {
        failed += 1;
        message = err.message;
        if (STOP_CODES.includes(err.code)) {
          done += 1;
          setBulk({ running: true, total: items.length, done, ok, failed, message });
          message = `Byahagaze: ${err.message}`;
          break;
        }
      }
      done += 1;
      setBulk({ running: true, total: items.length, done, ok, failed, message });
      if (i < items.length - 1 && !cancelRef.current) await sleep(BULK_DELAY_MS);
    }

    setBulk({ running: false, total: items.length, done, ok, failed, message });
    setSelected(new Set());
  };

  const handleRetry = async (comment) => {
    setBusyId(comment.id);
    try {
      await retryComment(user.uid, comment);
      toast.success('Igitekerezo cyasubijwe mu byemejwe.');
    } catch (err) {
      console.error(err);
      toast.error('Igikorwa cyanze.');
    } finally {
      setBusyId(null);
    }
  };

  const publishBlocked = !fbLoading && !connected;

  const dialog = (() => {
    if (!confirm) return { title: '', message: '', label: 'Emeza', danger: false };
    switch (confirm.type) {
      case 'approve':
        return { title: 'Emeza igitekerezo', message: 'Urashaka kwemeza iki gitekerezo? Kizabasha gutangazwa nyuma.', label: 'Emeza', danger: false };
      case 'reject':
        return { title: 'Anga igitekerezo', message: 'Urashaka kwanga iki gitekerezo?', label: 'Anga', danger: true };
      case 'delete':
        return { title: 'Siba igitekerezo', message: 'Urashaka gusiba iki gitekerezo? Ntibisubizwa inyuma.', label: 'Siba', danger: true };
      case 'bulkApprove':
        return { title: 'Emeza ibyahiswemo', message: `Ibitekerezo ${confirm.items.length} bizemezwa.`, label: 'Emeza', danger: false };
      case 'bulkPublish':
        return {
          title: 'Tangaza ibitekerezo byinshi',
          message: (
            <>
              <p>
                Ibitekerezo <strong>{Math.min(confirm.items.length, MAX_BULK_PUBLISH)}</strong> bigiye gutangazwa{' '}
                <strong>kimwe kimwe</strong> kuri <strong>{account?.pageName || 'paji yawe'}</strong>, hari amasegonda{' '}
                {BULK_DELAY_MS / 1000} hagati ya buri kimwe. Ntibishobora gusubizwa inyuma n'iyi porogaramu.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Ugomba kugumana iyi paji ifunguye kugeza birangiye. Biramutse bigize ikibazo gikomeye, birahagarara.
              </p>
            </>
          ),
          label: 'Yego, tangaza byose',
          danger: false,
        };
      default:
        return {
          title: 'Tangaza kuri Facebook',
          message: (
            <>
              <p>
                Iki gitekerezo kigiye gutangazwa <strong>ako kanya kandi kigaragare ku</strong> {' '}
                <strong>{account?.pageName || 'paji yawe'}</strong> kuri Facebook. Ntibishobora gusubizwa inyuma n'iyi porogaramu.
              </p>
              <p className="mt-2 rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">{confirm.items[0]?.text}</p>
            </>
          ),
          label: 'Yego, tangaza',
          danger: false,
        };
    }
  })();

  const cardActions = (c) => ({
    onPreview: undefined,
    onEdit: c.status === 'pending' || c.status === 'approved' ? setEditing : undefined,
    onReject: (x) => setConfirm({ type: 'reject', items: [x] }),
    onApprove: (x) => setConfirm({ type: 'approve', items: [x] }),
    onPublish: publishBlocked ? undefined : (x) => setConfirm({ type: 'publish', items: [x] }),
    onRetry: handleRetry,
    onDelete: tab === 'history' ? undefined : (x) => setConfirm({ type: 'delete', items: [x] }),
  });

  return (
    <Layout title="Kwemeza" subtitle="Wowe ubwawe wemeza ibitekerezo mbere yo kubitangaza kuri Facebook.">
      {publishBlocked && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <span className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            {expired
              ? 'Ihuza rya Facebook ryarangiye. Ongera uryubake kugira ngo ubone gutangaza.'
              : 'Huza paji ya Facebook kugira ngo ubone gutangaza ibyemejwe.'}
          </span>
          <Link href="/settings" className="btn btn-primary btn-sm">Jya mu igenamiterere</Link>
        </div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
              tab === t.key
                ? 'bg-white shadow-sm dark:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            {t.label}
            {t.key === 'pending' && counts.pending > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                {counts.pending}
              </span>
            )}
            {t.key === 'approved' && counts.approved > 0 && (
              <span className="ml-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                {counts.approved}
              </span>
            )}
          </button>
        ))}
      </div>

      {(tab === 'pending' || tab === 'approved') && visible.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Hitamo ibiri kuri iyi paji
          </label>
          {selectedPending.length > 0 && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => setConfirm({ type: 'bulkApprove', items: selectedPending })}
            >
              <Check className="h-3.5 w-3.5" /> Emeza ibyahiswemo ({selectedPending.length})
            </button>
          )}
          {tab === 'approved' && !publishBlocked && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!selectedApproved.length || bulk?.running}
                onClick={() => setConfirm({ type: 'bulkPublish', items: selectedApproved })}
              >
                <Rocket className="h-3.5 w-3.5" /> Tangaza ibyahiswemo ({selectedApproved.length})
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!allApproved.length || bulk?.running}
                onClick={() => setConfirm({ type: 'bulkPublish', items: allApproved })}
              >
                <Rocket className="h-3.5 w-3.5" /> Tangaza byose byemejwe ({Math.min(allApproved.length, MAX_BULK_PUBLISH)})
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'approved' && visible.length > 0 && (
        <p className="mb-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Gutangaza byinshi bikorwa kimwe kimwe, hari akanya hagati yabyo (byinshi {MAX_BULK_PUBLISH} buri gihe), kandi buri gikorwa gisaba kwemeza. Hari n'umupaka w'ibitekerezo 5 ku munota kugira ngo hirindwe spam.
        </p>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={
            tab === 'pending'
              ? 'Nta gitekerezo gitegereje'
              : tab === 'approved'
              ? 'Nta gitekerezo cyemejwe'
              : 'Nta mateka ahari'
          }
          description={
            tab === 'pending'
              ? 'Ibitekerezo wohereje kwemezwa bizagaragara hano.'
              : tab === 'approved'
              ? 'Ibitekerezo wemeje bizagaragara hano kugira ngo ubitangaze.'
              : 'Ibitekerezo wemeje, wanze cyangwa watangaje bizagaragara hano.'
          }
          action={
            <Link href="/comments" className="btn btn-secondary">
              Jya mu bitekerezo
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((c) => (
              <div key={c.id}>
                {tab === 'history' && (
                  <p className="mb-1 flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                    <StatusBadge status={c.status} />
                    {c.approvedAt && <span>Cyemejwe: {formatDate(c.approvedAt)}</span>}
                    <span>Cyavuguruwe: {formatDate(c.updatedAt)}</span>
                  </p>
                )}
                <CommentCard
                  comment={c}
                  post={postMap[c.postId]}
                  selectable={tab === 'pending' || tab === 'approved'}
                  selected={selected.has(c.id)}
                  onToggle={toggle}
                  busy={busyId === c.id}
                  {...cardActions(c)}
                />
              </div>
            ))}
          </div>
          <Pagination page={currentPage} pages={pages} total={list.length} onChange={setPage} />
        </>
      )}

      <CommentEditor
        open={!!editing}
        onClose={() => setEditing(null)}
        posts={posts}
        initial={editing}
        onSubmit={async (payload) => {
          await updateComment(user.uid, editing, payload);
          toast.success('Igitekerezo cyahinduwe.');
        }}
      />

      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        danger={dialog.danger}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.label}
        onConfirm={() => (confirm?.type === 'bulkPublish' ? startBulk() : runConfirm())}
        onCancel={() => setConfirm(null)}
      />

      <Modal
        open={!!bulk}
        onClose={bulk?.running ? undefined : () => setBulk(null)}
        title="Gutangaza ibitekerezo byinshi"
        footer={
          bulk?.running ? (
            <button type="button" className="btn btn-danger" onClick={() => { cancelRef.current = true; }}>
              Hagarika
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setBulk(null)}>
              Funga
            </button>
          )
        }
      >
        {bulk && (
          <div className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${bulk.total ? (bulk.done / bulk.total) * 100 : 0}%` }}
              />
            </div>
            <p className="flex items-center gap-2 text-sm">
              {bulk.running && <Spinner className="text-brand-600" />}
              {bulk.done} / {bulk.total} · Byatangajwe: {bulk.ok} · Byananiranye: {bulk.failed}
            </p>
            {bulk.running && (
              <p className="text-xs text-slate-500">Ntufunge iyi paji kugeza birangiye.</p>
            )}
            {bulk.message && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {bulk.message}
              </p>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
