'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getPersonalStats } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { ATTENDANCE_GOOD_PCT, ATTENDANCE_OK_PCT } from '@/lib/constants';
import { PersonalStats } from '@/types';

export default function StatsPage() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.replace('/');
  }, [ready, authenticated, router]);

  const address = (
    wallets.find((w) => w.walletClientType === 'privy')?.address ?? user?.wallet?.address
  )?.toLowerCase();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.memberStats(address ?? ''),
    queryFn: () => getPersonalStats(address!),
    enabled: authenticated && !!address,
  });

  if (!ready || !authenticated) return <FullPageSpinner />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
        <Link href="/" className="text-gray-400 hover:text-gray-700 mr-4" aria-label="Back">
          <BackArrow />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">My Stats</h1>
          {data?.currentSemester && (
            <p className="text-xs text-gray-500">Current semester: {data.currentSemester}</p>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <StatsSkeleton />
        ) : error ? (
          <p className="text-center py-20 text-sm text-red-600">Couldn&apos;t load your stats. Please try again.</p>
        ) : !data || data.tokensEarned === 0 ? (
          <EmptyStats totalSessions={data?.totalSessions ?? 0} />
        ) : (
          <StatsBody stats={data} />
        )}
      </main>
    </div>
  );
}

// ── components ───────────────────────────────────────────────────────────────

function StatsBody({ stats }: { stats: PersonalStats }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm text-gray-500">All-time attendance</p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-gray-900">
              {stats.allTimeAttendancePct}
              <span className="text-2xl text-gray-400">%</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.tokensEarned} of {stats.totalSessions} meetings
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.foundingMember && <Badge tone="amber">Founding Member</Badge>}
            <Badge tone={stats.statusTier === 'Official Member' ? 'blue' : 'gray'}>{stats.statusTier}</Badge>
          </div>
        </div>
        <ProgressBar pct={stats.allTimeAttendancePct} />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Tokens earned" value={stats.tokensEarned} />
        <StatTile label="Current streak" value={stats.currentStreak} suffix={streakSuffix(stats.currentStreak)} />
        <StatTile label="Longest streak" value={stats.longestStreak} suffix={streakSuffix(stats.longestStreak)} />
        <StatTile label={`${stats.currentSemester ?? 'Semester'}`} value={`${stats.currentSemesterAttendancePct}%`} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent activity</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Last 30 days" value={stats.meetingsLast30Days} suffix={meetingSuffix(stats.meetingsLast30Days)} compact />
          <StatTile label="Last 90 days" value={stats.meetingsLast90Days} suffix={meetingSuffix(stats.meetingsLast90Days)} compact />
          <StatTile label="Last 180 days" value={stats.meetingsLast180Days} suffix={meetingSuffix(stats.meetingsLast180Days)} compact />
        </div>
      </section>

      {stats.lastSeen && (
        <p className="text-xs text-gray-400">Last checked in {formatDate(stats.lastSeen)}</p>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  compact,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
      <p className={`font-bold tabular-nums text-gray-900 ${compact ? 'text-2xl' : 'text-3xl'}`}>
        {value}
        {suffix && <span className="text-sm font-medium text-gray-400"> {suffix}</span>}
      </p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    pct >= ATTENDANCE_GOOD_PCT ? 'bg-green-500' : pct >= ATTENDANCE_OK_PCT ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="mt-6 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'blue' | 'gray' }) {
  const styles = {
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function EmptyStats({ totalSessions }: { totalSessions: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-gray-900 font-semibold">No attendance yet</p>
      <p className="text-gray-500 text-sm mt-1 max-w-xs">
        {totalSessions > 0
          ? `${totalSessions} meeting${totalSessions === 1 ? '' : 's'} held so far. Check in at the next one to start your streak.`
          : 'Check in at a meeting to start building your attendance stats.'}
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

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-gray-200 p-8 h-40 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-200 h-24 animate-pulse" />
        ))}
      </div>
    </div>
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

function streakSuffix(n: number): string {
  return n === 1 ? 'meeting' : 'meetings';
}

function meetingSuffix(n: number): string {
  return n === 1 ? 'meeting' : 'meetings';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
