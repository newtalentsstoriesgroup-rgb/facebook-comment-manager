import Link from 'next/link';
import { Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Header({ onMenu }) {
  const { user, profile } = useAuth();
  const { theme, mounted, toggleTheme } = useTheme();

  const name = profile?.displayName || user?.displayName || '';
  const initial = (name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button type="button" className="btn-icon lg:hidden" onClick={onMenu} aria-label="Fungura menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          aria-label="Hindura isura (umwijima/urumuri)"
          title={theme === 'dark' ? 'Urumuri' : 'Umwijima'}
        >
          {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initial}
            </span>
          )}
          <span className="hidden max-w-[180px] truncate text-sm font-medium sm:block">
            {user?.email}
          </span>
        </Link>
      </div>
    </header>
  );
}
