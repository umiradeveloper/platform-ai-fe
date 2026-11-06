import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Umira AI', template: '%s · Umira AI' },
  description: 'AI Assistant Platform — PT Umira (Construction · Development · Investment)',
  icons: { icon: '/umira-mark.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#02475A' },
    { media: '(prefers-color-scheme: dark)', color: '#071A20' },
  ],
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
