import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-fg)',
              border: '1px solid rgba(148,163,184,0.3)',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
