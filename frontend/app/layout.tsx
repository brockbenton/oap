import type { Metadata } from 'next';
import localFont from 'next/font/local';
import AppProviders from '@/components/providers/AppProviders';
import { APP_NAME } from '@/lib/constants';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMono-VariableFont_wght.ttf',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Soulbound onchain attendance — QR check-in, gasless tokens, and member stats.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-paper min-h-screen`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
