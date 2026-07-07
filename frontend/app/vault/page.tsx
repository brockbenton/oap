'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMemberVault } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import LoadError from '@/components/shared/LoadError';
import { VaultToken } from '@/types';

const ALL_SEMESTERS = 'All semesters';

export default function VaultPage() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [semester, setSemester] = useState<string>(ALL_SEMESTERS);

  useEffect(() => {
    if (ready && !authenticated) router.replace('/');
  }, [ready, authenticated, router]);

  const address = (
    wallets.find((w) => w.walletClientType === 'privy')?.address ?? user?.wallet?.address
  )?.toLowerCase();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.memberVault(address ?? ''),
    queryFn: () => getMemberVault(address!),
    enabled: authenticated && !!address,
  });

  const semesters = useMemo(() => {
    const set = new Set((data?.tokens ?? []).map((t) => t.semester));
    return [ALL_SEMESTERS, ...Array.from(set)];
  }, [data]);

  const visible = useMemo(() => {
    const tokens = data?.tokens ?? [];
    return semester === ALL_SEMESTERS ? tokens : tokens.filter((t) => t.semester === semester);
  }, [data, semester]);

  if (!ready || !authenticated) return <FullPageSpinner />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
        <Link href="/" className="text-gray-400 hover:text-gray-700 mr-4" aria-label="Back">
          <BackArrow />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">My Vault</h1>
          <p className="text-xs text-gray-500">
            {data ? `${data.tokenCount} attendance token${data.tokenCount === 1 ? '' : 's'}` : 'Your attendance tokens'}
          </p>
        </div>
        {semesters.length > 2 && (
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <GridSkeleton />
        ) : error ? (
          <LoadError what="vault" onRetry={() => refetch()} />
        ) : (
          <div className="fade-in">
            {visible.length === 0 ? (
              <EmptyVault hasAny={(data?.tokenCount ?? 0) > 0} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {visible.map((token) => (
                  <TokenCard key={token.tokenId} token={token} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── components ───────────────────────────────────────────────────────────────

function TokenCard({ token }: { token: VaultToken }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="group rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.imageUrl}
            alt={token.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-white/90 text-3xl font-bold tabular-nums">#{token.meetingNumber}</span>
        )}
        {token.mintStatus !== 'CONFIRMED' && (
          <span
            className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              token.mintStatus === 'PENDING'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {token.mintStatus === 'PENDING' ? 'Minting…' : 'Failed'}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-gray-900 truncate" title={token.name}>
          {token.name}
        </p>
        <p className="text-xs text-gray-500">{formatDate(token.date)}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {token.semester}
          </span>
          <span className="text-[11px] text-gray-400 tabular-nums">Meeting #{token.meetingNumber}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyVault({ hasAny }: { hasAny: boolean }) {
  if (hasAny) {
    return <CenteredNote>No tokens for this semester.</CenteredNote>;
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12l2.25 2.25 4.5-4.5" />
        </svg>
      </div>
      <p className="text-gray-900 font-semibold">No attendance tokens yet</p>
      <p className="text-gray-500 text-sm mt-1 max-w-xs">
        Check in at a meeting to earn your first attendance token.
      </p>
      <Link
        href="/check-in"
        className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Scan QR Code
      </Link>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          <div className="aspect-square bg-gray-100 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CenteredNote({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <p className={`text-center py-20 text-sm ${tone === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
      {children}
    </p>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BackArrow() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
