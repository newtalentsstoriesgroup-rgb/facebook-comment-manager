import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  CheckCircle2,
  History,
  Settings,
  User,
  LogOut,
  X,
  Facebook,
  Reply,
  ClipboardList,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Ikibaho', icon: LayoutDashboard },
  { href: '/posts', label: 'Inyandiko', icon: FileText },
  { href: '/comments', label: 'Ibitekerezo', icon: MessageSquare },
  { href: '/approvals', label: 'Kwemeza', icon: CheckCircle2 },
  { href: '/replies', label: 'Gusubiza', icon: Reply },
  { href: '/templates', label: 'Ibyitegererezo', icon: ClipboardList },
  { href: '/auto-reply', label: 'Gusubiza ubwayo', icon: Bot },
  { href: '/history', label: 'Amateka', icon: History },
  { href: '/settings', label: 'Igenamiterere', icon: Settings },
  { href: '/profile', label: 'Umwirondoro', icon: User },
];

export default function Sidebar({ open, onClose }) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Facebook className="h-4 w-4" />
            </span>
            <span>FCM</span>
          </Link>
          <button type="button" className="btn-icon lg:hidden" onClick={onClose} aria-label="Funga">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            Sohoka
          </button>
        </div>
      </aside>
    </>
  );
}
