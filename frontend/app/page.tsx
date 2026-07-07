'use client';

export const dynamic = 'force-dynamic';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import ConnectButton from '@/components/shared/ConnectButton';
import { APP_SHORT_NAME } from '@/lib/constants';

export default function Home() {
  const { ready, authenticated } = usePrivy();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">{APP_SHORT_NAME}</h1>
        <div className="flex items-center gap-4">
          {ready && authenticated && (
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">
              Admin
            </Link>
          )}
          <ConnectButton />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="max-w-md w-full space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Attendance Check-In</h2>
            <p className="text-gray-500 text-base">
              Scan the QR code at the meeting to earn your attendance token.
            </p>
          </div>

          {ready && !authenticated && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
              <p className="text-blue-800 text-sm font-medium">
                Sign in to check in to today&apos;s meeting and receive your attendance token.
              </p>
              <ConnectButton />
            </div>
          )}

          {ready && authenticated && (
            <div className="space-y-3">
              <Link
                href="/check-in"
                className="block w-full py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold text-center hover:bg-blue-700 transition-colors"
              >
                Scan QR Code
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/vault"
                  className="block py-3 px-6 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold text-center hover:bg-gray-50 transition-colors"
                >
                  My Vault
                </Link>
                <Link
                  href="/stats"
                  className="block py-3 px-6 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold text-center hover:bg-gray-50 transition-colors"
                >
                  My Stats
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
