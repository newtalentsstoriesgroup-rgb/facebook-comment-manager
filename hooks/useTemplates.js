import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeTemplates } from '@/lib/templates';
import { sortByDateDesc } from '@/lib/utils';

export function useTemplates() {
  const { user } = useAuth();
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    return subscribeTemplates(
      user.uid,
      (items) => {
        setRaw(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [user]);

  const templates = useMemo(() => sortByDateDesc(raw, 'createdAt'), [raw]);
  return { templates, loading };
}

export default useTemplates;
