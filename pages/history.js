import { useCallback, useEffect, useMemo, useState } from 'react';
import { History as HistoryIcon, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import ActivityItem from '@/components/ActivityItem';
import { EmptyState } from '@/components/ui';
import { ListSkeleton, Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { fetchActivityPage } from '@/lib/activity';
import { searchItems } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const loadFirst = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchActivityPage(user.uid, null, PAGE_SIZE);
      setItems(res.items);
      setCursor(res.cursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchActivityPage(user.uid, cursor, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.cursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = useMemo(() => searchItems(items, search, ['description', 'action']), [items, search]);

  return (
    <Layout title="Amateka" subtitle="Ibikorwa byose wakoze kuri konti yawe.">
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Shakisha mu mateka…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <div className="card p-6 text-center text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            Amateka ntashoboye gufungurwa. Birashoboka ko index ya Firestore itarakorwa (activityLogs: userId + createdAt). Reba README.
          </p>
          <button type="button" className="btn btn-secondary mt-4" onClick={loadFirst}>
            Ongera ugerageze
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nta mateka ahari"
          description="Ibikorwa ukora bizagaragara hano."
        />
      ) : (
        <>
          <ul className="card divide-y divide-slate-100 px-5 dark:divide-slate-800">
            {filtered.map((log) => (
              <ActivityItem key={log.id} log={log} detailed />
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 text-center">
              <button type="button" className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Spinner />} Ongera ugaragaze
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
