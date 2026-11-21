import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import { PageLoader, Spinner } from '@/components/Loading';
import { authErrorMessage } from '@/lib/validation';

export default function LoginPage() {
  const { user, loading, login, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  if (loading || user) return <PageLoader />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Murakaza neza!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Andika imeri yawe.');
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      toast.success('Twohereje ubutumwa bwo gusubiramo ijambobanga kuri imeri yawe.');
      setResetMode(false);
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={resetMode ? 'Subiramo ijambobanga' : 'Injira muri konti yawe'}
      subtitle={
        resetMode
          ? 'Andika imeri yawe tukoherereze ihuza ryo gushyiraho ijambobanga rishya.'
          : 'Andika imeri n\'ijambobanga byawe.'
      }
      footer={
        <>
          Nta konti ufite?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Iyandikishe
          </Link>
        </>
      }
    >
      <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
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
            placeholder="izina@urugero.com"
          />
        </div>
        {!resetMode && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label !mb-0" htmlFor="password">Ijambobanga</label>
              <button
                type="button"
                className="text-xs font-medium text-brand-600 hover:underline"
                onClick={() => setResetMode(true)}
              >
                Wibagiwe ijambobanga?
              </button>
            </div>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting && <Spinner />}
          {resetMode ? 'Ohereza ihuza' : 'Injira'}
        </button>
        {resetMode && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => setResetMode(false)}>
            Garuka ku kwinjira
          </button>
        )}
      </form>
    </AuthLayout>
  );
}
