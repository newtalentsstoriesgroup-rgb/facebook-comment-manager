import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Search, Copy, Pencil, Trash2, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Modal, EmptyState } from '@/components/ui';
import { ListSkeleton, Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { useTemplates } from '@/hooks/useTemplates';
import {
  CATEGORIES,
  CATEGORY_KEYS,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedStarterTemplates,
} from '@/lib/templates';
import { searchItems } from '@/lib/utils';

const EMPTY = { title: '', category: 'reply', text: '' };

export default function TemplatesPage() {
  const { user } = useAuth();
  const { templates, loading } = useTemplates();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    let list = templates;
    if (category !== 'all') list = list.filter((t) => t.category === category);
    return searchItems(list, search, ['title', 'text']);
  }, [templates, category, search]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setFormOpen(true);
  };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ title: t.title, category: t.category, text: t.text });
    setError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Andika umutwe w\'icyitegererezo.');
    if (!form.text.trim()) return setError('Andika umwandiko.');
    if (form.text.trim().length > 8000) return setError('Umwandiko ni muremure cyane.');
    setSaving(true);
    try {
      if (editing) await updateTemplate(user.uid, editing.id, form);
      else await createTemplate(user.uid, form);
      toast.success('Icyitegererezo cyabitswe.');
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError('Ntibyashobotse kubika.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTemplate(user.uid, toDelete);
      toast.success('Icyitegererezo cyasibwe.');
      setToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Ntibyashobotse gusiba.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedStarterTemplates(user.uid);
      toast.success('Ibyitegererezo by\'ibanze byongeweho.');
    } catch (err) {
      console.error(err);
      toast.error('Ntibyashobotse kongeraho.');
    } finally {
      setSeeding(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Byakoporowe.');
    } catch {
      toast.error('Ntibyashobotse gukoporora.');
    }
  };

  return (
    <Layout
      title="Ibyitegererezo"
      subtitle="Tegura ibitekerezo by'umwimerere: gusubiza, gushimira, gusobanura, kongeraho amakuru no gutumira abantu nyabo kwandika ibyabo."
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Spinner /> : <Sparkles className="h-4 w-4" />} Ibyitegererezo by'ibanze
          </button>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Gishya
          </button>
        </>
      }
    >
      <p className="mb-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Ushobora gukoresha <code className="font-mono">{'{izina}'}</code> mu mwandiko: izasimbuzwa izina rya mbere ry'uwanditse igitekerezo mu gihe usubiza.
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Shakisha…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">Ibyiciro byose</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {CATEGORIES[k]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={templates.length === 0 ? 'Nta cyitegererezo ufite' : 'Nta kibonetse'}
          description={
            templates.length === 0
              ? 'Ongeraho ibyitegererezo by\'ibanze cyangwa wandike ibyawe.'
              : 'Gerageza guhindura ishakisha cyangwa icyiciro.'
          }
          action={
            templates.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Spinner /> : <Sparkles className="h-4 w-4" />} Ongeraho ibyitegererezo by'ibanze
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <div key={t.id} className="card flex flex-col p-4 animate-fade-in">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{t.title}</h3>
                  <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {CATEGORIES[t.category] || t.category}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="btn-icon" title="Kopora" onClick={() => copy(t.text)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" className="btn-icon" title="Hindura" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-icon hover:!text-red-600"
                    title="Siba"
                    onClick={() => setToDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="line-clamp-5 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                {t.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        title={editing ? 'Hindura icyitegererezo' : 'Icyitegererezo gishya'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Reka
            </button>
            <button type="submit" form="tpl-form" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner />} Bika
            </button>
          </>
        }
      >
        <form id="tpl-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="tpl-title">Umutwe</label>
            <input
              id="tpl-title"
              className="input"
              maxLength={100}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="tpl-cat">Icyiciro</label>
            <select
              id="tpl-cat"
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {CATEGORIES[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tpl-text">Umwandiko</label>
            <textarea
              id="tpl-text"
              className="input min-h-[140px]"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Muraho {izina}, …"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        loading={deleting}
        title="Siba icyitegererezo"
        confirmLabel="Siba"
        message={<>Urashaka gusiba icyitegererezo <strong>{toDelete?.title}</strong>?</>}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
