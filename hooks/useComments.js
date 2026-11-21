import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeComments } from '@/lib/comments';
import { countByStatus, sortByDateDesc } from '@/lib/utils';

// Ibitekerezo by'umukoresha, bihita bivugururwa (real-time).
export function useComments() {
  const { user } = useAuth();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    const unsub = subscribeComments(
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

  const comments = useMemo(() => sortByDateDesc(raw, 'createdAt'), [raw]);
  const counts = useMemo(() => countByStatus(comments), [comments]);

  return { comments, counts, loading, error };
}

export default useComments;
