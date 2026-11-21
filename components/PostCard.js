import { ExternalLink, Pencil, Trash2, MessageSquare, Hash } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PostCard({ post, commentCount = 0, onEdit, onDelete, onViewComments }) {
  return (
    <div className="card flex flex-col p-5 transition hover:shadow-md animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold">{post.title || 'Nta mutwe'}</h3>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="btn-icon" onClick={() => onEdit(post)} title="Hindura">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-icon hover:!text-red-600"
            onClick={() => onDelete(post)}
            title="Siba"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {post.description && (
        <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
          {post.description}
        </p>
      )}

      <a
        href={post.postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 truncate text-sm text-brand-600 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{post.postUrl}</span>
      </a>

      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <Hash className="h-3.5 w-3.5" />
        {post.postId ? (
          <span className="truncate">{post.postId}</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">ID ntiraboneka (yandike ukoresheje Hindura)</span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(post.createdAt)}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onViewComments(post)}>
          <MessageSquare className="h-3.5 w-3.5" />
          Ibitekerezo ({commentCount})
        </button>
      </div>
    </div>
  );
}
