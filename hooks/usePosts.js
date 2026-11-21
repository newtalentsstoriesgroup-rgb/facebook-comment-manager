import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribePosts } from '@/lib/posts';
import { sortByDateDesc } from '@/lib/utils';

export function usePosts() {
  const { user } = useAuth();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    const unsub = subscribePosts(
      user.uid,
      (items) => {
        setRaw(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const posts = useMemo(() => sortByDateDesc(raw, 'createdAt'), [raw]);
  return { posts, loading, error };
}

export default usePosts;
