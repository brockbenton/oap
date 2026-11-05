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
import { colorNameForTopic } from '@/lib/tokenArt';
import { getLeaderboard, getMemberVault, getPersonalStats } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { useEmbeddedAddress } from '@/hooks/useProfile';
import type { LeaderboardEntry, MemberVault, PersonalStats, VaultToken } from '@/types';
import { CLUB_NAME } from '@/lib/constants';

const CHECK_IN_HREF = '/check-in';
const VAULT_HREF = '/vault';

// There is no member-facing "is a meeting live right now" endpoint (the QR is
// admin-gated), so the card is a standing entry point rather than a live claim.
const CHECK_IN_TITLE = 'Check in to a meeting';
const CHECK_IN_SUBTITLE = 'Scan the QR on the projector to mint your attendance token';
const SCAN_LABEL = '[ check in ]';

const STREAK_HINT = 'Consecutive meetings attended';
const ATTENDANCE_HINT = 'This semester';
const RANK_HINT = 'By tokens earned';

const HOME_TITLE = 'Home';
const VIEW_ALL = 'View all →';
const VAULT_PREVIEW_COUNT = 4;

const LEADERBOARD_TITLE = 'Leaderboard';
const LEADERBOARD_TIMEFRAME_LABEL = 'All time';
const LEADERBOARD_SUBTITLE = 'Ranked by tokens earned, then streak';
const LEADERBOARD_PREVIEW_COUNT = 3;
const LEADERBOARD_AVATAR_SIZE = 32;

const MINT_TITLE = 'Mint your first token';
const MINT_BODY =
  'Head to a meeting and scan the QR on the projector. Your attendance token appears here the moment you check in.';
const EMPTY_STREAK_HINT = 'Check in at a meeting to start one';
const EMPTY_VAULT_TITLE = 'Your vault is empty';
const EMPTY_VAULT_SUB = 'Tokens you earn will show up here';
const EMPTY_ATTENDANCE_HINT = 'Your attendance rate shows up here';

const SUBTLE_LIGHT = 'text-content-secondary';

const RECENT_TOKENS_TITLE = 'Recent tokens';
const MOBILE_TOKEN_COUNT = 2;
const STAT_PLACEHOLDER = '-';

const MOBILE_STATS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'streak', label: 'Streak' },
  { key: 'rank', label: 'Rank' },
] as const;

const TOKEN_DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };

const fmt = (n: number): string => n.toLocaleString('en-US');

function formatTokenDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', TOKEN_DATE_FORMAT);
}

export default function MemberHome() {
  const address = useEmbeddedAddress();

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
      <div className="min-h-screen bg-canvas">
        <MemberTopNav active="home" />
        <PageContainer className="py-12">
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
    return <EmptyHome semester={stats.currentSemester} />;
  }

  return (
    <PopulatedHome
      vault={vault}
      stats={stats}
      dataLoading={loading}
    />
  );
}

function HomeHeader({ semester }: { semester?: string | null }) {
  return (
    <div className="mb-8">
      <div className="mb-2 font-mono text-[13px] text-status-neutral">{CLUB_NAME}</div>
      <h1 className="text-[32px] font-medium leading-[38px]">{semester ?? HOME_TITLE}</h1>
    </div>
  );
}

interface PopulatedHomeProps {
  vault?: MemberVault;
  stats?: PersonalStats;
  dataLoading: boolean;
}

function PopulatedHome({ vault, stats, dataLoading }: PopulatedHomeProps) {
  const address = useEmbeddedAddress();
  const { data: board, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard(address),
    queryFn: () => getLeaderboard(address),
    enabled: !!address,
  });
  const rank = board?.find((entry) => entry.isYou)?.rankLabel;
  const loading = dataLoading || isLoading || !vault || !stats;

  return (
    <div className="min-h-screen bg-canvas">
      <MemberTopNav active="home" />
      <div className="hidden md:block">
        <PageContainer className="py-12">
          <HomeHeader semester={stats?.currentSemester} />
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
      <MobileHome rank={rank} vault={vault} stats={stats} />
      <MobileTabBar active="home" />
    </div>
  );
}

function MobileHome({
  rank,
  vault,
  stats,
}: {
  rank?: string;
  vault?: MemberVault;
  stats?: PersonalStats;
}) {
  const recent = (vault?.tokens ?? []).slice(0, MOBILE_TOKEN_COUNT);

  return (
    <div className="px-5 pb-24 pt-5 md:hidden md:pb-0">
      <h1 className="mb-4 text-[22px] font-medium leading-[28px]">
        {stats?.currentSemester ?? HOME_TITLE}
      </h1>
      <MobileCheckInCard />
      <MobileStatRow attendancePct={stats?.currentSemesterAttendancePct} rank={rank} streak={stats?.currentStreak} />
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold leading-none">{RECENT_TOKENS_TITLE}</div>
        <Link href={VAULT_HREF} className="text-xs font-semibold leading-none text-content-secondary transition-colors hover:text-content">
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
      color={colorNameForTopic(token.name)}
    />
  );
}

function MobileCheckInCard() {
  return (
    <div className="relative mb-4 overflow-hidden rounded-lg bg-raised p-5 text-content">
      <div className="relative mb-1 text-[17px] font-semibold leading-[1.3]">{CHECK_IN_TITLE}</div>
      <div className={cn('relative mb-4 text-[13px] leading-[18px]', SUBTLE_LIGHT)}>
        {CHECK_IN_SUBTITLE}
      </div>
      <Link
        href={CHECK_IN_HREF}
        className="relative flex h-11 w-full items-center justify-center rounded bg-green text-sm font-medium leading-none text-canvas transition-colors hover:bg-green-dim"
      >
        {SCAN_LABEL}
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
  rank?: string;
  streak?: number;
}) {
  const values: Record<(typeof MOBILE_STATS)[number]['key'], string> = {
    attendance: attendancePct === undefined ? STAT_PLACEHOLDER : `${attendancePct}%`,
    streak: streak === undefined ? STAT_PLACEHOLDER : `${streak}`,
    rank: rank ?? STAT_PLACEHOLDER,
  };

  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      {MOBILE_STATS.map((stat) => (
        <div
          key={stat.key}
          className="rounded border border-line bg-surface p-4 text-center"
        >
          <MonoNum className="text-[22px] font-medium leading-none">{values[stat.key]}</MonoNum>
          <div className="mt-2 text-[11px] font-medium leading-none text-content-secondary">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInCard() {
  return (
    <div className="relative flex flex-col gap-6 overflow-hidden rounded-lg bg-raised p-7 text-content sm:flex-row sm:items-center">
      <QrIcon size={32} className="flex-none text-content-secondary" />
      <div className="relative flex-1">
        <div className="mb-1 text-xl font-semibold leading-[1.3]">{CHECK_IN_TITLE}</div>
        <div className={cn('text-sm leading-5', SUBTLE_LIGHT)}>{CHECK_IN_SUBTITLE}</div>
      </div>
      <Link href={CHECK_IN_HREF} className="relative flex-none">
        <Button size="lg">
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
  rank?: string;
  streak: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile label="Attendance" value={`${attendancePct}%`} hint={ATTENDANCE_HINT} />
      <StatTile label="Streak" value={streak} hint={STREAK_HINT} />
      <StatTile label="Rank" value={rank ?? STAT_PLACEHOLDER} hint={RANK_HINT} />
    </div>
  );
}

function VaultPreview({ vault }: { vault: MemberVault }) {
  const preview = vault.tokens.slice(0, VAULT_PREVIEW_COUNT);

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-semibold">
          My Vault · {vault.tokenCount} {vault.tokenCount === 1 ? 'token' : 'tokens'}
        </div>
        <Link href={VAULT_HREF} className="text-[13px] font-medium text-content-secondary transition-colors hover:text-content">
          {VIEW_ALL}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    <div className="self-start rounded-lg border border-line bg-surface p-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-base font-semibold">{LEADERBOARD_TITLE}</div>
        <span className="font-mono text-xs text-content-secondary">
          {LEADERBOARD_TIMEFRAME_LABEL}
        </span>
      </div>
      <div className="mb-4 text-[13px] leading-[18px] text-content-secondary">
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
  return (
    <div
      className={cn(
        'grid grid-cols-[24px_32px_1fr_auto] items-center gap-3',
        highlighted
          ? '-mx-3 mt-2 rounded bg-raised px-3 py-3'
          : 'border-b border-line py-3',
      )}
    >
      <span className="font-mono text-sm font-medium text-content-secondary">{entry.rankLabel}</span>
      <Avatar seed={entry.avatarSeed} size={LEADERBOARD_AVATAR_SIZE} />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium leading-tight">
          {entry.handle}
          {highlighted && ' · you'}
        </div>
        <div className="mt-1 font-mono text-[11px] text-content-secondary">
          {entry.streak} in a row
        </div>
      </div>
      <MonoNum className="text-[13px] font-medium">
        {fmt(entry.tokens)}
      </MonoNum>
    </div>
  );
}

function EmptyHome({ semester }: { semester: string | null }) {
  return (
    <div className="min-h-screen bg-canvas">
      <MemberTopNav active="home" />
      <PageContainer className="py-12">
        <HomeHeader semester={semester} />

        <div className="relative mb-5 overflow-hidden rounded-lg bg-raised p-9 text-center text-content">
          <div className="relative">
            <div className="mx-auto mb-4 grid place-items-center">
              <QrIcon size={32} className="text-content-secondary" />
            </div>
            <h2 className="mb-2 text-2xl font-medium leading-[30px]">
              {MINT_TITLE}
            </h2>
            <p className={cn('mx-auto mb-6 max-w-[44ch] text-[15px] leading-[22px]', SUBTLE_LIGHT)}>
              {MINT_BODY}
            </p>
            <Link href={CHECK_IN_HREF} className="inline-block">
              <Button size="lg">
                {SCAN_LABEL}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Attendance"
            value={<span className="text-content-muted">0%</span>}
            hint={EMPTY_ATTENDANCE_HINT}
          />
          <StatTile
            label="Streak"
            value={<span className="text-content-muted">0</span>}
            hint={EMPTY_STREAK_HINT}
          />
          <div className="flex flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-line-strong bg-raised p-5 text-center">
            <div className="text-[13px] font-semibold leading-tight text-content">
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
        <div className="h-[132px] rounded-lg border border-line bg-raised" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-[120px] rounded-tile border border-line bg-raised" />
          <div className="h-[120px] rounded-tile border border-line bg-raised" />
          <div className="h-[120px] rounded-tile border border-line bg-raised" />
        </div>
        <div className="h-[220px] rounded-lg border border-line bg-raised" />
      </div>
      <div className="h-[440px] rounded-lg border border-line bg-raised" />
    </div>
  );
}
