import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import AppProviders from '@/components/providers/AppProviders';
import { APP_NAME } from '@/lib/constants';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME}: an onchain protocol for clubs: QR check-in, gasless soulbound tokens, and member stats.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} min-h-screen`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
