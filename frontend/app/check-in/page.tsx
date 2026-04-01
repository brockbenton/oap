'use client';

export const dynamic = 'force-dynamic';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import CheckInFlow from '@/components/features/check-in/CheckInFlow';

export default function CheckInPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const [flowKey, setFlowKey] = useState(0);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/');
    }
  }, [ready, authenticated, router]);

  const handleRestart = useCallback(() => {
    setFlowKey((k) => k + 1);
  }, []);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Check In</h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <CheckInFlow key={flowKey} onRestart={handleRestart} />
        </div>
      </main>
    </div>
  );
}
