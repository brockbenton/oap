'use client';

export const dynamic = 'force-dynamic';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import CheckInFlow from '@/components/features/check-in/CheckInFlow';
import { ArrowLeft } from '@/components/ui/icons';

const PAGE_TITLE = 'Check in';
const BACK_HREF = '/';

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
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-ink" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center gap-3 border-b border-line px-6 py-4">
        <Link
          href={BACK_HREF}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-content-secondary transition hover:bg-[rgba(1,3,4,0.06)] hover:text-ink"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold tracking-[-0.2px] text-ink">{PAGE_TITLE}</h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <CheckInFlow key={flowKey} onRestart={handleRestart} />
        </div>
      </main>
    </div>
  );
}
