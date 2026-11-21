import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className = '' }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />;
}

export function PageLoader({ label = 'Birimo gufunguka...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={cn('skeleton', className)} />;
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeletons({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="mb-4 h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </>
  );
}

export default Spinner;
