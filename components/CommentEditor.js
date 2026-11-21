import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui';
import { Spinner } from '@/components/Loading';
import {
  MAX_BULK_COMMENTS,
  MAX_COMMENT_LENGTH,
  validateCommentText,
} from '@/lib/validation';

// Igikorwa cyo kongeraho / guhindura igitekerezo.
// - initial: igitekerezo gihindurwa (null = gishya)
// - onSubmit({ postId, text }) cyangwa onSubmit({ postId, texts }) iyo ari byinshi
export default function CommentEditor({
  open,
  onClose,
  posts,
  initial = null,
  defaultPostId = '',
  defaultMultiple = false,
  templates = [],
  onSubmit,
}) {
  const [postId, setPostId] = useState('');
  const [text, setText] = useState('');
  const [multiple, setMultiple] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPostId(initial?.postId || defaultPostId || '');
    setText(initial?.text || '');
    setMultiple(!initial && defaultMultiple);
    setError('');
    setSaving(false);
  }, [open, initial, defaultPostId, defaultMultiple]);

  const lines = multiple ? text.split('\n').map((l) => l.trim()).filter(Boolean) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!postId) {
      setError('Hitamo inyandiko igitekerezo kigenewe.');
      return;
    }
    if (multiple) {
      if (!lines.length) return setError('Andika nibura igitekerezo kimwe.');
      if (lines.length > MAX_BULK_COMMENTS)
        return setError(`Ushobora kongeraho ibitekerezo ${MAX_BULK_COMMENTS} gusa icyarimwe.`);
      const bad = lines.map(validateCommentText).find(Boolean);
      if (bad) return setError(bad);
    } else {
      const msg = validateCommentText(text);
      if (msg) return setError(msg);
    }

    setSaving(true);
    try {
      await onSubmit(multiple ? { postId, texts: lines } : { postId, text });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Ntibyashobotse kubika. Ongera ugerageze.');
    } finally {
      setSaving(false);
    }
  };

  const title = initial ? 'Hindura igitekerezo' : multiple ? 'Ongeraho ibitekerezo byinshi' : 'Ongeraho igitekerezo';

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Reka
          </button>
          <button type="submit" form="comment-editor-form" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner />}
            Bika
          </button>
        </>
      }
    >
      <form id="comment-editor-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="ce-post">
            Inyandiko
          </label>
          {posts.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              Nta nyandiko ufite. <Link href="/posts" className="font-medium underline">Banza wongereho inyandiko</Link>.
            </p>
          ) : (
            <select
              id="ce-post"
              className="input"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            >
              <option value="">— Hitamo inyandiko —</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.postUrl}
                </option>
              ))}
            </select>
          )}
        </div>

        {!initial && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Ongeraho ibitekerezo byinshi icyarimwe
          </label>
        )}

        {templates.length > 0 && (
          <div>
            <label className="label" htmlFor="ce-tpl">Koresha icyitegererezo</label>
            <select
              id="ce-tpl"
              className="input"
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) {
                  const body = t.text.replace(/\{izina\}/gi, '').replace(/ +([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
                  setText((prev) => (multiple && prev.trim() ? `${prev.trim()}\n${body}` : body));
                }
                e.target.value = '';
              }}
            >
              <option value="">— Hitamo —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label" htmlFor="ce-text">
            {multiple ? 'Ibitekerezo (kimwe kuri buri murongo)' : 'Igitekerezo'}
          </label>
          <textarea
            id="ce-text"
            className="input min-h-[140px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={multiple ? 'Igitekerezo cya 1\nIgitekerezo cya 2\n…' : 'Andika igitekerezo hano…'}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {multiple
              ? `Ibitekerezo: ${lines.length} (byinshi: ${MAX_BULK_COMMENTS}). Bizabikwa nk'inyandikorugero.`
              : `${text.trim().length} / ${MAX_COMMENT_LENGTH}`}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
