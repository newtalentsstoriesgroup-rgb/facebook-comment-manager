import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import { PageLoader, Spinner } from '@/components/Loading';
import { authErrorMessage } from '@/lib/validation';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  if (loading || user) return <PageLoader />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Ijambobanga rigomba kuba rifite nibura inyuguti 6.');
    if (password !== confirm) return toast.error('Amajambobanga ntabwo ahura.');
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim());
      toast.success('Konti yawe yarakozwe!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Fungura konti"
      subtitle="Uzuza amakuru akurikira kugira ngo utangire."
      footer={
        <>
          Usanzwe ufite konti?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Injira
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Izina</label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Izina ryawe"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Imeri</label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Ijambobanga</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Subiramo ijambobanga</label>
          <input
            id="confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner />}
          Iyandikishe
        </button>
      </form>
    </AuthLayout>
  );
}
