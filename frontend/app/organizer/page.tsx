'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import OrganizerTopNav from '@/components/shared/OrganizerTopNav';
import PageContainer from '@/components/shared/PageContainer';
import { Button, Card, StatTile } from '@/components/ui';
import type { StatTileProps } from '@/components/ui';
import { PlusIcon } from '@/components/ui/icons';
import { getAdminMe, getAdminOverview, listAdminSessions } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import { TOKEN_GRADIENTS } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';
import type { AdminOverview, SessionWithCount } from '@/types';

// The backend has no clubs surface: club identity (name/handle/logo), meeting cadence and the
// next scheduled meeting aren't persisted, so they're sample and mirror the design frame. Every
// figure inside the stat row, the recent-meetings table and the tokens total is real admin data.
const CLUB = {
  name: 'Blockchain Club',
  handle: 'oap.xyz/c/blockchain-club',
  logo: '◆',
  gradient: TOKEN_GRADIENTS.blue,
} as const;

const MEETING_CADENCE = 'Weekly · Thursdays';
const MEMBERS_HINT = 'Across the club';
const AVG_HINT = 'Avg per meeting';
const TOKENS_HINT = 'Across all meetings';

const NEXT_MEETING = {
  topic: 'Rollups Deep Dive',
  when: 'Thu Apr 18 · 6:00 PM · Room 214',
  blurb: "Draft the topic, then open the meeting when everyone's seated to reveal the check-in QR.",
} as const;

const RUN_ROUTE = '/organizer/run';
const RECENT_MEETINGS_LIMIT = 3;

const STAT_GRID = 'grid grid-cols-2 gap-4 md:grid-cols-4';
const BODY_GRID = 'grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]';
const PANEL_PADDING = 'p-[22px]';
const PANEL_TITLE = 'text-[16px] font-semibold leading-none text-ink';
const TABLE_GRID = 'grid grid-cols-[1fr_auto_auto] gap-3';
const TABLE_HEAD = 'font-mono text-[11px] uppercase tracking-[0.06em] text-content-secondary';
const RATE_COL = 'w-[70px]';
const BTN_H = 'h-11';
const PLUS_ICON_SIZE = 15;

export default function OrganizerDashboardPage() {
  const { ready, authenticated, user } = usePrivy();

  const { data: me, isLoading: meLoading, isError: meError, error: meErr } = useQuery({
    queryKey: queryKeys.adminMe(user?.id),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminMe(token);
    },
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
    staleTime: 0,
    gcTime: 0,
  });

  const isAdmin = me?.isAdmin === true;

  const overviewQuery = useQuery({
    queryKey: queryKeys.adminOverview(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminOverview(token);
    },
    enabled: ready && authenticated && isAdmin,
    retry: retryUnlessForbidden,
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.adminSessions(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminSessions(token);
    },
    enabled: ready && authenticated && isAdmin,
    retry: retryUnlessForbidden,
  });

  if (!ready || (authenticated && meLoading)) {
    return (
      <GateShell>
        <Spinner />
      </GateShell>
    );
  }

  if (!authenticated) {
    return <SignInGate />;
  }

  if (meError || !isAdmin) {
    const forbidden = meErr instanceof ApiRequestError && meErr.status === 403;
    return <AccessGate forbidden={forbidden || !isAdmin} />;
  }

  const loading = overviewQuery.isLoading || sessionsQuery.isLoading;
  const failed = overviewQuery.isError || sessionsQuery.isError;

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <OrganizerTopNav active="overview" />
      <PageContainer className="py-8">
        <ClubHeader />
        {loading ? (
          <DashboardSkeleton />
        ) : failed || !overviewQuery.data || !sessionsQuery.data ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-content-secondary">
              We couldn&apos;t load the dashboard right now. Please try again.
            </p>
          </Card>
        ) : (
          <DashboardBody overview={overviewQuery.data} sessions={sessionsQuery.data} />
        )}
      </PageContainer>
    </div>
  );
}

// ── club header ──────────────────────────────────────────────────────────────

function ClubHeader() {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div
          className="grid h-14 w-14 flex-none place-items-center rounded-card text-[22px] font-bold text-white"
          style={{ background: CLUB.gradient }}
          aria-hidden="true"
        >
          {CLUB.logo}
        </div>
        <div>
          <h1 className="mb-1.5 text-[26px] font-semibold leading-[30px] tracking-[-0.8px] text-ink">
            {CLUB.name}
          </h1>
          <div className="font-mono text-[12px] font-medium leading-none text-content-secondary">
            {CLUB.handle}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Button type="button" variant="outline" className={cn(BTN_H, 'px-5')}>
          Invite members
        </Button>
        <Button type="button" variant="primary" className={cn(BTN_H, 'px-[22px]')}>
          <PlusIcon size={PLUS_ICON_SIZE} />
          Start a meeting
        </Button>
      </div>
    </div>
  );
}

// ── dashboard body ───────────────────────────────────────────────────────────

function DashboardBody({ overview, sessions }: { overview: AdminOverview; sessions: SessionWithCount[] }) {
  // One attendance token is minted per confirmed check-in, so total headcount across every
  // session is the club's tokens-minted count.
  const tokensMinted = overview.series.reduce((sum, point) => sum + point.headcount, 0);

  const { wow } = overview;
  const avgDelta: StatTileProps['delta'] =
    wow && wow.headcountDelta !== 0
      ? {
          text: `${Math.abs(wow.headcountDelta)} vs last meeting`,
          tone: wow.headcountDelta > 0 ? 'pos' : 'neg',
        }
      : undefined;

  const tiles: StatTileProps[] = [
    { label: 'Members', value: overview.totalMembers, hint: MEMBERS_HINT },
    { label: 'Meetings held', value: overview.totalSessions, hint: MEETING_CADENCE },
    { label: 'Avg attendance', value: overview.avgHeadcount, delta: avgDelta, hint: AVG_HINT },
    { label: 'Tokens minted', value: tokensMinted.toLocaleString(), hint: TOKENS_HINT },
  ];

  const rateByOnchainId = new Map(overview.series.map((point) => [point.sessionIdOnchain, point.attendanceRate]));
  const recent = [...sessions]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, RECENT_MEETINGS_LIMIT)
    .map((session) => ({
      session,
      rate:
        rateByOnchainId.get(session.sessionId) ??
        (overview.totalMembers > 0
          ? Math.round((session.attendeeCount / overview.totalMembers) * 100)
          : 0),
    }));

  return (
    <>
      <div className={cn(STAT_GRID, 'mb-6')}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <div className={BODY_GRID}>
        <Card className={PANEL_PADDING}>
          <div className={cn(PANEL_TITLE, 'mb-[18px]')}>Recent meetings</div>
          <div className={cn(TABLE_GRID, TABLE_HEAD, 'border-b border-line pb-2.5')}>
            <span>Topic</span>
            <span className="text-right">Checked in</span>
            <span className={cn('text-right', RATE_COL)}>Rate</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-content-secondary">No meetings yet.</p>
          ) : (
            recent.map(({ session, rate }, index) => (
              <div
                key={session.id}
                className={cn(
                  TABLE_GRID,
                  'items-center py-[13px]',
                  index < recent.length - 1 && 'border-b border-line',
                )}
              >
                <div>
                  <div className="text-[14px] font-semibold leading-[1.2] text-ink">{session.name}</div>
                  <div className="mt-1 font-mono text-[11px] font-medium leading-none text-content-secondary">
                    {formatMeetingDate(session.date)}
                  </div>
                </div>
                <span className="text-right font-mono text-[14px] font-semibold leading-none text-ink">
                  {session.attendeeCount}
                </span>
                <span
                  className={cn(
                    'text-right font-mono text-[13px] font-semibold leading-none text-green-600',
                    RATE_COL,
                  )}
                >
                  {rate}%
                </span>
              </div>
            ))
          )}
        </Card>

        <Card className={PANEL_PADDING}>
          <div className={cn(PANEL_TITLE, 'mb-4')}>Next meeting</div>
          <div className="mb-4 rounded-[14px] bg-status-info-bg p-[18px]">
            <div className="mb-1.5 text-[16px] font-semibold leading-[1.2] text-blue-700">
              {NEXT_MEETING.topic}
            </div>
            <div className="font-mono text-[12px] font-medium leading-none text-blue-600">
              {NEXT_MEETING.when}
            </div>
          </div>
          <p className="mb-4 text-[13px] leading-[20px] text-content-secondary">{NEXT_MEETING.blurb}</p>
          <Link href={RUN_ROUTE} className="block">
            <Button type="button" variant="primary" className={cn(BTN_H, 'w-full')}>
              Open meeting
            </Button>
          </Link>
        </Card>
      </div>
    </>
  );
}

// ── gate + loading states ──────────────────────────────────────────────────────

function GateShell({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-[#fbfbfc] px-6">{children}</div>;
}

function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-ink" />;
}

function SignInGate() {
  const { login } = usePrivy();
  return (
    <GateShell>
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">Organizer console</h1>
        <p className="mb-6 text-sm text-content-secondary">
          Sign in with an organizer account to manage your club.
        </p>
        <Button type="button" variant="primary" className="w-full" onClick={login}>
          Sign in
        </Button>
      </Card>
    </GateShell>
  );
}

function AccessGate({ forbidden }: { forbidden: boolean }) {
  return (
    <GateShell>
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">Organizer access required</h1>
        <p className="mb-6 text-sm text-content-secondary">
          {forbidden
            ? "This account doesn't have organizer access to this club."
            : "We couldn't verify your organizer access. Please try again."}
        </p>
        <Link href="/" className="block">
          <Button type="button" variant="outline" className="w-full">
            Back to app
          </Button>
        </Link>
      </Card>
    </GateShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className={STAT_GRID}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-tile border border-line bg-white" />
        ))}
      </div>
      <div className={BODY_GRID}>
        <div className="h-64 animate-pulse rounded-lg border border-line bg-white" />
        <div className="h-64 animate-pulse rounded-lg border border-line bg-white" />
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatMeetingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
