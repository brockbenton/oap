'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import PageContainer from '@/components/shared/PageContainer';
import TokenCard from '@/components/shared/TokenCard';
import LoadError from '@/components/shared/LoadError';
import { Avatar, Button, MonoNum, StatTile } from '@/components/ui';
import { QrIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { gradientNameForTopic } from '@/lib/tokenArt';
import { getLeaderboard, getMemberVault, getPersonalStats } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { useDisplayName, useEmbeddedAddress } from '@/hooks/useProfile';
import type { LeaderboardEntry, MemberVault, PersonalStats, VaultToken } from '@/types';
import { APP_SHORT_NAME, CLUB_NAME } from '@/lib/constants';

const CHECK_IN_HREF = '/check-in';
const VAULT_HREF = '/vault';

// There is no member-facing "is a meeting live right now" endpoint (the QR is
// admin-gated), so the card is a standing entry point rather than a live claim.
const CHECK_IN_TITLE = 'Check in to a meeting';
const CHECK_IN_SUBTITLE = 'Scan the QR on the projector to mint your attendance token.';
const SCAN_LABEL = 'Scan QR code';

const STREAK_HINT = 'Consecutive meetings attended.';
const ATTENDANCE_HINT = 'This semester.';
const RANK_HINT = 'By tokens earned.';

const VIEW_ALL = 'View all →';
const VAULT_PREVIEW_COUNT = 4;

const LEADERBOARD_TITLE = 'Leaderboard';
const LEADERBOARD_TIMEFRAME_LABEL = 'All time';
const LEADERBOARD_SUBTITLE = 'Ranked by tokens earned, then streak.';
const LEADERBOARD_PREVIEW_COUNT = 3;
const LEADERBOARD_AVATAR_SIZE = 32;

const MINT_TITLE = 'Mint your first token';
const MINT_BODY =
  'Head to a meeting and scan the QR on the projector. Your attendance token appears here the moment you check in.';
const EMPTY_STREAK_HINT = 'Check in at a meeting to start one.';
const EMPTY_VAULT_TITLE = 'Your vault is empty';
const EMPTY_VAULT_SUB = 'Tokens you earn will show up here.';
const EMPTY_ATTENDANCE_HINT = 'Your attendance rate shows up here.';

const GLOW_CYAN = 'radial-gradient(circle, rgba(38,221,249,0.35), transparent 70%)';
const GLOW_CYAN_SOFT = 'radial-gradient(circle, rgba(38,221,249,0.3), transparent 70%)';
const GLOW_PURPLE_SOFT = 'radial-gradient(circle, rgba(104,51,255,0.3), transparent 70%)';
const SUBTLE_LIGHT = 'text-[rgba(218,229,247,0.7)]';

const CHECK_IN_EYEBROW = '● Check in';
const MOBILE_SCAN_LABEL = 'Scan to check in';
const RECENT_TOKENS_TITLE = 'Recent tokens';
const MOBILE_TOKEN_COUNT = 2;
const STAT_PLACEHOLDER = '—';

const MOBILE_STATS = [
  { key: 'attendance', label: 'Attendance', accent: false },
  { key: 'streak', label: 'Streak', accent: true },
  { key: 'rank', label: 'Rank', accent: false },
] as const;

const TOKEN_DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };

const fmt = (n: number): string => n.toLocaleString('en-US');

function formatTokenDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', TOKEN_DATE_FORMAT).toUpperCase();
}

export default function MemberHome() {
  const address = useEmbeddedAddress();
  const displayName = useDisplayName();

  const vaultQuery = useQuery({
    queryKey: queryKeys.memberVault(address ?? ''),
    queryFn: () => getMemberVault(address!),
    enabled: !!address,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.memberStats(address ?? ''),
    queryFn: () => getPersonalStats(address!),
    enabled: !!address,
  });

  if (vaultQuery.error || statsQuery.error) {
    return (
      <div className="min-h-screen bg-white">
        <MemberTopNav active="home" />
        <PageContainer className="py-8">
          <LoadError
            what="home"
            onRetry={() => {
              void vaultQuery.refetch();
              void statsQuery.refetch();
            }}
          />
        </PageContainer>
        <MobileTabBar active="home" />
      </div>
    );
  }

  const loading = !address || vaultQuery.isLoading || statsQuery.isLoading;
  const vault = vaultQuery.data;
  const stats = statsQuery.data;

  // A member with no confirmed tokens yet gets the new-member Home (frame 7b).
  if (!loading && vault && stats && vault.tokenCount === 0) {
    return <EmptyHome displayName={displayName} semester={stats.currentSemester} />;
  }

  return (
    <PopulatedHome
      displayName={displayName}
      vault={vault}
      stats={stats}
      dataLoading={loading}
    />
  );
}

function GreetingHeader({
  title,
  note,
  semester,
}: {
  title: string;
  note?: string;
  semester?: string | null;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2 font-mono text-[13px] uppercase tracking-[0.06em] text-status-neutral">
          {semester ? `${CLUB_NAME} · ${semester}` : CLUB_NAME}
        </div>
        <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-1px]">{title}</h1>
      </div>
      {note && <div className="font-mono text-[13px] text-content-secondary">{note}</div>}
    </div>
  );
}

interface PopulatedHomeProps {
  displayName: string;
  vault?: MemberVault;
  stats?: PersonalStats;
  dataLoading: boolean;
}

function PopulatedHome({ displayName, vault, stats, dataLoading }: PopulatedHomeProps) {
  const address = useEmbeddedAddress();
  const { data: board, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(address),
    queryFn: () => getLeaderboard(address),
    enabled: !!address,
  });
  const rank = board?.find((entry) => entry.isYou)?.rank;
  const loading = dataLoading || isLoading || !vault || !stats;

  return (
    <div className="min-h-screen bg-white">
      <MemberTopNav active="home" />
      <div className="hidden md:block">
        <PageContainer className="py-8">
          <GreetingHeader
            title={`Welcome back, ${displayName}`}
            semester={stats?.currentSemester}
          />
          {loading ? (
            <HomeSkeleton />
          ) : (
            <div className="grid animate-fade-in grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
              <div className="flex flex-col gap-5">
                <CheckInCard />
                <StatRow attendancePct={stats.currentSemesterAttendancePct} rank={rank} streak={stats.currentStreak} />
                <VaultPreview vault={vault} />
              </div>
              <LeaderboardPreview entries={board ?? []} />
            </div>
          )}
        </PageContainer>
      </div>
      <MobileHome displayName={displayName} rank={rank} vault={vault} stats={stats} />
      <MobileTabBar active="home" />
    </div>
  );
}

function MobileHome({
  displayName,
  rank,
  vault,
  stats,
}: {
  displayName: string;
  rank?: number;
  vault?: MemberVault;
  stats?: PersonalStats;
}) {
  const recent = (vault?.tokens ?? []).slice(0, MOBILE_TOKEN_COUNT);

  return (
    <div className="px-5 pb-24 pt-1.5 md:hidden md:pb-0">
      <h1 className="mb-4 text-[22px] font-semibold leading-[28px] tracking-[-0.5px]">
        Hey, {displayName} 👋
      </h1>
      <MobileCheckInCard />
      <MobileStatRow attendancePct={stats?.currentSemesterAttendancePct} rank={rank} streak={stats?.currentStreak} />
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold leading-none">{RECENT_TOKENS_TITLE}</div>
        <Link href={VAULT_HREF} className="text-xs font-semibold leading-none text-blue-500">
          All {vault?.tokenCount ?? 0} →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {recent.map((token) => (
          <VaultTokenCard key={token.tokenId} token={token} />
        ))}
      </div>
    </div>
  );
}

/** One real vault token rendered as a TokenCard. */
function VaultTokenCard({ token }: { token: VaultToken }) {
  return (
    <TokenCard
      editionNumber={token.meetingNumber}
      topic={token.name}
      date={formatTokenDate(token.date)}
      gradient={gradientNameForTopic(token.name)}
    />
  );
}

function MobileCheckInCard() {
  return (
    <div className="relative mb-4 overflow-hidden rounded-lg bg-ink p-5 text-white">
      <div
        className="pointer-events-none absolute -right-[30px] -top-[30px] h-[140px] w-[140px] rounded-full"
        style={{ background: GLOW_CYAN }}
      />
      <div className="relative mb-2 font-mono text-[11px] font-medium uppercase leading-none tracking-[0.06em] text-cyan">
        {CHECK_IN_EYEBROW}
      </div>
      <div className="relative mb-1 text-[17px] font-semibold leading-[1.3]">{CHECK_IN_TITLE}</div>
      <div className={cn('relative mb-4 text-[13px] leading-[18px]', SUBTLE_LIGHT)}>
        {CHECK_IN_SUBTITLE}
      </div>
      <Link
        href={CHECK_IN_HREF}
        className="relative flex h-[46px] w-full items-center justify-center rounded-full bg-cyan text-[15px] font-semibold leading-none text-ink transition active:scale-[0.98]"
      >
        {MOBILE_SCAN_LABEL}
      </Link>
    </div>
  );
}

function MobileStatRow({
  attendancePct,
  rank,
  streak,
}: {
  attendancePct?: number;
  rank?: number;
  streak?: number;
}) {
  const values: Record<(typeof MOBILE_STATS)[number]['key'], string> = {
    attendance: attendancePct === undefined ? STAT_PLACEHOLDER : `${attendancePct}%`,
    streak: streak === undefined ? STAT_PLACEHOLDER : `${streak}`,
    rank: rank ? `#${rank}` : STAT_PLACEHOLDER,
  };

  return (
    <div className="mb-4 grid grid-cols-3 gap-2.5">
      {MOBILE_STATS.map((stat) => (
        <div
          key={stat.key}
          className="rounded-[14px] border border-line bg-white p-3.5 text-center"
        >
          <MonoNum
            className={cn('text-[22px] font-bold leading-none', stat.accent && 'text-yellow-700')}
          >
            {values[stat.key]}
          </MonoNum>
          <div className="mt-1.5 text-[11px] font-medium leading-none text-content-secondary">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInCard() {
  return (
    <div className="relative flex flex-col gap-6 overflow-hidden rounded-lg bg-ink p-7 text-white sm:flex-row sm:items-center">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-[220px] w-[220px] rounded-full"
        style={{ background: GLOW_CYAN }}
      />
      <div className="relative grid h-[76px] w-[76px] flex-none place-items-center rounded-tile bg-white/10">
        <QrIcon size={34} className="text-cyan" />
      </div>
      <div className="relative flex-1">
        <div className="mb-1 text-xl font-semibold leading-[1.3]">{CHECK_IN_TITLE}</div>
        <div className={cn('text-sm leading-5', SUBTLE_LIGHT)}>{CHECK_IN_SUBTITLE}</div>
      </div>
      <Link href={CHECK_IN_HREF} className="relative flex-none">
        <Button variant="cyan" size="lg">
          {SCAN_LABEL}
        </Button>
      </Link>
    </div>
  );
}

function StatRow({
  attendancePct,
  rank,
  streak,
}: {
  attendancePct: number;
  rank?: number;
  streak: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile label="Attendance" value={`${attendancePct}%`} hint={ATTENDANCE_HINT} />
      <StatTile
        label="Streak"
        value={<span className="text-yellow-700">{streak}</span>}
        hint={STREAK_HINT}
      />
      <StatTile label="Rank" value={rank ? `#${rank}` : STAT_PLACEHOLDER} hint={RANK_HINT} />
    </div>
  );
}

function VaultPreview({ vault }: { vault: MemberVault }) {
  const preview = vault.tokens.slice(0, VAULT_PREVIEW_COUNT);

  return (
    <div className="rounded-lg border border-line bg-white p-[22px]">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="text-base font-semibold">
          My Vault · {vault.tokenCount} {vault.tokenCount === 1 ? 'token' : 'tokens'}
        </div>
        <Link href={VAULT_HREF} className="text-[13px] font-semibold text-blue-500">
          {VIEW_ALL}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {preview.map((token) => (
          <VaultTokenCard key={token.tokenId} token={token} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries.slice(0, LEADERBOARD_PREVIEW_COUNT);
  const you = entries.find((entry) => entry.isYou && entry.rank > LEADERBOARD_PREVIEW_COUNT);

  return (
    <div className="self-start rounded-lg border border-line bg-white p-[22px]">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-base font-semibold">{LEADERBOARD_TITLE}</div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-content-secondary">
          {LEADERBOARD_TIMEFRAME_LABEL}
        </span>
      </div>
      <div className="mb-[18px] text-[13px] leading-[18px] text-content-secondary">
        {LEADERBOARD_SUBTITLE}
      </div>
      <div className="flex flex-col">
        {top.map((entry) => (
          <LeaderboardRow key={entry.rank} entry={entry} />
        ))}
        {you && <LeaderboardRow entry={you} highlighted />}
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  highlighted,
}: {
  entry: LeaderboardEntry;
  highlighted?: boolean;
}) {
  const rankColor = highlighted
    ? 'text-blue-600'
    : entry.rank === 1
      ? 'text-yellow-600'
      : 'text-content-secondary';

  return (
    <div
      className={cn(
        'grid grid-cols-[24px_32px_1fr_auto] items-center gap-3',
        highlighted
          ? '-mx-3 mt-2 rounded-[12px] bg-status-info-bg px-3 py-3'
          : 'border-b border-line py-[11px]',
      )}
    >
      <span className={cn('font-mono text-sm font-bold', rankColor)}>{entry.rank}</span>
      <Avatar seed={entry.avatarSeed} size={LEADERBOARD_AVATAR_SIZE} />
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-[13px] font-semibold leading-tight',
            highlighted && 'text-blue-700',
          )}
        >
          {entry.handle}
          {highlighted && ' · you'}
        </div>
        <div
          className={cn(
            'mt-[3px] font-mono text-[11px]',
            highlighted ? 'text-blue-600' : 'text-content-secondary',
          )}
        >
          {entry.streak} streak
        </div>
      </div>
      <MonoNum className={cn('text-[13px] font-bold', highlighted && 'text-blue-700')}>
        {fmt(entry.tokens)}
      </MonoNum>
    </div>
  );
}

function EmptyHome({ displayName, semester }: { displayName: string; semester: string | null }) {
  return (
    <div className="min-h-screen bg-white">
      <MemberTopNav active="home" />
      <PageContainer className="py-8">
        <GreetingHeader title={`Welcome to ${APP_SHORT_NAME}, ${displayName} 👋`} semester={semester} />

        <div className="relative mb-5 overflow-hidden rounded-lg bg-ink p-9 text-center text-white">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full"
            style={{ background: GLOW_CYAN_SOFT }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 h-[240px] w-[240px] rounded-full"
            style={{ background: GLOW_PURPLE_SOFT }}
          />
          <div className="relative">
            <div className="mx-auto mb-[18px] grid h-[72px] w-[72px] place-items-center rounded-lg bg-white/10">
              <QrIcon size={34} className="text-cyan" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold leading-[30px] tracking-[-0.5px]">
              {MINT_TITLE}
            </h2>
            <p className={cn('mx-auto mb-6 max-w-[44ch] text-[15px] leading-[22px]', SUBTLE_LIGHT)}>
              {MINT_BODY}
            </p>
            <Link href={CHECK_IN_HREF} className="inline-block">
              <Button variant="cyan" size="lg">
                {SCAN_LABEL}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Attendance"
            value={<span className="text-content-disabled">0%</span>}
            hint={EMPTY_ATTENDANCE_HINT}
          />
          <StatTile
            label="Streak"
            value={<span className="text-content-disabled">0</span>}
            hint={EMPTY_STREAK_HINT}
          />
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-tile border border-dashed border-line-strong bg-card-filled p-5 text-center">
            <div className="text-[13px] font-semibold leading-tight text-ink">
              {EMPTY_VAULT_TITLE}
            </div>
            <div className="text-xs leading-[17px] text-content-secondary">{EMPTY_VAULT_SUB}</div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="h-[132px] rounded-lg border border-line bg-card-filled" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-[120px] rounded-tile border border-line bg-card-filled" />
          <div className="h-[120px] rounded-tile border border-line bg-card-filled" />
          <div className="h-[120px] rounded-tile border border-line bg-card-filled" />
        </div>
        <div className="h-[220px] rounded-lg border border-line bg-card-filled" />
      </div>
      <div className="h-[440px] rounded-lg border border-line bg-card-filled" />
    </div>
  );
}
