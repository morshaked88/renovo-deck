import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Renovo',
  description: 'Renovo Group — urban renewal developer and builder. HOMES INSPIRED BY YOU.',
};
export const viewport: Viewport = { themeColor: '#0a0a0a', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

// Apply the persisted language before first paint (no dir/lang flash).
const initLang = `try{var l=localStorage.getItem('renovo-lang');if(l==='en'){var d=document.documentElement;d.lang='en';d.dir='ltr'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/heebo-hebrew-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: initLang }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
