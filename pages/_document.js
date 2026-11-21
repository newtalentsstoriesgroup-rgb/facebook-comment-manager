import { Html, Head, Main, NextScript } from 'next/document';

// Iyi script ishyiraho "dark" mbere y'uko paji yishushanya, kugira ngo nta flash ibaho.
const themeScript = `(function(){try{var t=localStorage.getItem('fcm-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function Document() {
  return (
    <Html lang="rw">
      <Head>
        <meta name="description" content="Facebook Comment Manager — genzura ibitekerezo byawe kuri Facebook." />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
