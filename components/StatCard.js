import { Skeleton } from '@/components/Loading';

const COLORS = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
};

export default function StatCard({ label, value, icon: Icon, color = 'blue', loading = false }) {
  return (
    <div className="card p-5 transition hover:shadow-md animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${COLORS[color]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      )}
    </div>
  );
}
