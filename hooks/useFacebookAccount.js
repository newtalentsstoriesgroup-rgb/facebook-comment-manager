import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeToDocument } from '@/lib/firestore';

// Imiterere y'ihuza rya Facebook (facebookAccounts/{uid}). Nta token irimo — ziba kuri seriveri gusa.
export function useFacebookAccount() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    const unsub = subscribeToDocument(
      'facebookAccounts',
      user.uid,
      (data) => {
        setAccount(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const connected = account?.connectionStatus === 'connected';
  const expired = account?.connectionStatus === 'expired';
  return { account, loading, connected, expired };
}

export default useFacebookAccount;
