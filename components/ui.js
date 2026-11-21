import { useEffect } from 'react';
import { X, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_META, cn } from '@/lib/utils';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.cls
      )}
    >
      {meta.label}
    </span>
  );
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl animate-slide-up dark:bg-slate-900 sm:rounded-2xl',
          SIZES[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Funga">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>
        Paji {page} / {pages} · Byose: {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Garuka
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Komeza <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
