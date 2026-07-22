import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sky Academy | اسكاي اكاديمي',
  description: 'منصة إدارة أكاديمية اسكاي - متابعة الطلاب والمدرسين والمصاريف والحضور والتقييمات',
  keywords: ['sky academy', 'اسكاي اكاديمي', 'إدارة الطلاب', 'تعليم', 'أكاديمية'],
  authors: [{ name: 'Sky Academy' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sky Academy',
  },
  openGraph: {
    title: 'Sky Academy | اسكاي اكاديمي',
    description: 'منصة إدارة أكاديمية اسكاي',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#ff6b00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        {children}
      </body>
    </html>
  );
}
