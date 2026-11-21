import { MessageSquare, FileText, Facebook, User, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { timeAgo, formatDate } from '@/lib/utils';

function iconFor(action = '') {
  if (action === 'comment_approved') return { Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' };
  if (action === 'comment_rejected' || action === 'comment_failed')
    return { Icon: XCircle, cls: 'text-red-600 bg-red-100 dark:bg-red-900/40' };
  if (action === 'comment_published') return { Icon: Facebook, cls: 'text-brand-600 bg-blue-100 dark:bg-blue-900/40' };
  if (action.startsWith('comment_')) return { Icon: MessageSquare, cls: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' };
  if (action.startsWith('post_')) return { Icon: FileText, cls: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' };
  if (action.startsWith('facebook_')) return { Icon: Facebook, cls: 'text-brand-600 bg-blue-100 dark:bg-blue-900/40' };
  if (action.startsWith('profile_') || action.startsWith('account_'))
    return { Icon: User, cls: 'text-slate-600 bg-slate-100 dark:bg-slate-800' };
  return { Icon: Activity, cls: 'text-slate-600 bg-slate-100 dark:bg-slate-800' };
}

export default function ActivityItem({ log, detailed = false }) {
  const { Icon, cls } = iconFor(log.action);
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm">{log.description}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {detailed ? formatDate(log.createdAt) : timeAgo(log.createdAt)}
        </p>
      </div>
    </li>
  );
}
