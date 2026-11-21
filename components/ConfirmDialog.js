import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Spinner } from '@/components/Loading';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Emeza',
  cancelLabel = 'Reka',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            danger
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
      </div>
    </Modal>
  );
}
