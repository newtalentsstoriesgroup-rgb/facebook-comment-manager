import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Mail, KeyRound, LogOut } from 'lucide-react';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/Loading';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/lib/validation';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const { user, profile, updateUserProfile, resetPassword, logout } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName || user?.displayName || '');
    setPhotoURL(profile?.photoURL || user?.photoURL || '');
  }, [profile, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (photoURL.trim() && !/^https?:\/\//i.test(photoURL.trim())) {
      return toast.error('Ihuza ry\'ifoto rigomba gutangirana na http:// cyangwa https://');
    }
    setSaving(true);
    try {
      await updateUserProfile({ displayName, photoURL });
      toast.success('Umwirondoro wabitswe.');
    } catch (err) {
      console.error(err);
      toast.error(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSending(true);
    try {
      await resetPassword(user.email);
      toast.success('Twohereje ihuza ryo guhindura ijambobanga kuri imeri yawe.');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Layout title="Umwirondoro" subtitle="Amakuru ya konti yawe.">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label" htmlFor="pr-email">Imeri</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input id="pr-email" className="input pl-9" value={user?.email || ''} disabled readOnly />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="pr-name">Izina</label>
              <input
                id="pr-name"
                className="input"
                value={displayName}
                maxLength={100}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="pr-photo">Ihuza ry'ifoto (bitegetswe)</label>
              <input
                id="pr-photo"
                className="input"
                value={photoURL}
                maxLength={2048}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner />} Bika impinduka
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="card p-6">
            <h2 className="mb-3 font-semibold">Konti</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">UID</dt>
                <dd className="break-all font-mono text-xs">{user?.uid}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Yafunguwe</dt>
                <dd>{formatDate(profile?.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="card space-y-2 p-6">
            <h2 className="mb-1 font-semibold">Umutekano</h2>
            <button type="button" className="btn btn-secondary w-full" onClick={handleReset} disabled={sending}>
              {sending ? <Spinner /> : <KeyRound className="h-4 w-4" />} Hindura ijambobanga
            </button>
            <button type="button" className="btn btn-secondary w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sohoka
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
