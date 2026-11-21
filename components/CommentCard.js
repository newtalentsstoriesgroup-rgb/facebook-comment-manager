import { Eye, Pencil, Copy, Trash2, Send, Check, X, Rocket, RotateCcw, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { Spinner } from '@/components/Loading';
import { formatDate, cn } from '@/lib/utils';

function IconBtn({ title, onClick, children, className = '', disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn('btn-icon', className)}
    >
      {children}
    </button>
  );
}

export default function CommentCard({
  comment,
  post,
  selectable = false,
  selected = false,
  onToggle,
  busy = false,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onPublish,
  onRetry,
}) {
  const { status } = comment;
  const editable = status !== 'published';

  return (
    <div
      className={cn(
        'card p-4 transition animate-fade-in',
        selected && 'ring-2 ring-brand-500/60'
      )}
    >
      <div className="flex gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.(comment.id)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            aria-label="Hitamo igitekerezo"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {post ? post.title || post.postUrl : 'Inyandiko yasibwe'}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{comment.text}</p>

          {status === 'failed' && comment.errorMessage && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {comment.errorMessage}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-400">
            {formatDate(comment.createdAt)}
            {comment.publishedAt ? ` · Cyatangajwe: ${formatDate(comment.publishedAt)}` : ''}
            {comment.facebookCommentId ? ` · FB ID: ${comment.facebookCommentId}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        {busy && <Spinner className="mr-2 text-brand-600" />}
        {onPreview && (
          <IconBtn title="Reba mbere" onClick={() => onPreview(comment)} disabled={busy}>
            <Eye className="h-4 w-4" />
          </IconBtn>
        )}
        {onEdit && editable && (
          <IconBtn title="Hindura" onClick={() => onEdit(comment)} disabled={busy}>
            <Pencil className="h-4 w-4" />
          </IconBtn>
        )}
        {onDuplicate && (
          <IconBtn title="Kopora nk'inyandikorugero" onClick={() => onDuplicate(comment)} disabled={busy}>
            <Copy className="h-4 w-4" />
          </IconBtn>
        )}
        {onSubmit && status === 'draft' && (
          <IconBtn title="Ohereza kwemezwa" onClick={() => onSubmit(comment)} disabled={busy}>
            <Send className="h-4 w-4" />
          </IconBtn>
        )}
        {onReject && status === 'pending' && (
          <IconBtn
            title="Anga"
            onClick={() => onReject(comment)}
            disabled={busy}
            className="hover:!text-orange-600"
          >
            <X className="h-4 w-4" />
          </IconBtn>
        )}
        {onApprove && ['draft', 'pending', 'rejected'].includes(status) && (
          <IconBtn
            title="Emeza"
            onClick={() => onApprove(comment)}
            disabled={busy}
            className="hover:!text-emerald-600"
          >
            <Check className="h-4 w-4" />
          </IconBtn>
        )}
        {onRetry && status === 'failed' && (
          <IconBtn title="Ongera ugerageze" onClick={() => onRetry(comment)} disabled={busy}>
            <RotateCcw className="h-4 w-4" />
          </IconBtn>
        )}
        {onPublish && status === 'approved' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onPublish(comment)}
            disabled={busy}
          >
            <Rocket className="h-3.5 w-3.5" />
            Tangaza
          </button>
        )}
        {onDelete && (
          <IconBtn title="Siba" onClick={() => onDelete(comment)} disabled={busy} className="hover:!text-red-600">
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        )}
      </div>
    </div>
  );
}
