'use client';

import { useQuery } from '@tanstack/react-query';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import PageContainer from '@/components/shared/PageContainer';
import Avatar from '@/components/ui/Avatar';
import MonoNum from '@/components/ui/MonoNum';
import { TrophyIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { getLeaderboard } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { useEmbeddedAddress } from '@/hooks/useProfile';
import LoadError from '@/components/shared/LoadError';
import type { LeaderboardEntry } from '@/types';
import { CLUB_NAME } from '@/lib/constants';

const CLUB_SUBTITLE = `${CLUB_NAME} · ranked by tokens earned, then streak.`;
const PODIUM_COUNT = 3;
const WINNER_AVATAR_SIZE = 72;
const PODIUM_AVATAR_SIZE = 60;
const ROW_AVATAR_SIZE = 32;

const EMPTY_TEXT = 'No tokens minted yet. Check in at a meeting to get on the board.';

const TABLE_COLS =
  'grid min-w-[560px] grid-cols-[56px_1fr_120px_120px_100px] items-center gap-3';
const HEADER_CELL = 'font-mono text-xs uppercase tracking-[0.08em] text-content-secondary';

const MOBILE_PODIUM_AVATAR_SIZE = 44;
const MOBILE_WINNER_AVATAR_SIZE = 56;
const MOBILE_ROW_AVATAR_SIZE = 28;

const MOBILE_ROW_COLS = 'grid grid-cols-[24px_1fr_auto] items-center gap-2.5 px-3.5';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function PodiumCard({
  entry,
  winner,
  className,
}: {
  entry: LeaderboardEntry;
  winner: boolean;
  className?: string;
}) {
  if (winner) {
    return (
      <div
        className={cn(
          'rounded-lg border border-amber px-6 py-7 text-center',
          className,
        )}
      >
        <TrophyIcon size={24} className="mx-auto mb-2.5 text-status-warn" />
        <Avatar
          seed={entry.avatarSeed}
          size={WINNER_AVATAR_SIZE}
          className="mx-auto mb-3"
        />
        <div className="mb-1 text-[17px] font-semibold leading-tight">{entry.handle}</div>
        <div className="font-mono text-[11px] text-status-warn">{entry.streak} streak</div>
        <MonoNum className="mt-3.5 block text-[26px] font-bold leading-none">
          {fmt(entry.tokens)}
        </MonoNum>
      </div>
    );
  }
  return (
    <div className={cn('rounded-lg border border-line bg-surface p-6 text-center', className)}>
      <div className="mb-3.5 font-mono text-[13px] font-bold text-content-secondary">
        {entry.rankLabel}
      </div>
      <Avatar seed={entry.avatarSeed} size={PODIUM_AVATAR_SIZE} className="mx-auto mb-3" />
      <div className="mb-1 text-[15px] font-semibold leading-tight">{entry.handle}</div>
      <div className="font-mono text-[11px] text-content-secondary">
        {entry.streak} streak
      </div>
      <MonoNum className="mt-3.5 block text-[22px] font-bold leading-none">
        {fmt(entry.tokens)}
      </MonoNum>
    </div>
  );
}

function TableRow({ entry }: { entry: LeaderboardEntry }) {
  const you = entry.isYou;
  const txt = you ? 'text-cyan' : '';
  return (
    <div
      className={cn(
        TABLE_COLS,
        'border-t border-line px-5',
        you ? 'bg-status-info-bg py-4' : 'py-3.5',
      )}
    >
      <MonoNum className={cn('text-[14px] font-bold', txt)}>{entry.rankLabel}</MonoNum>
      <div className="flex items-center gap-3">
        <Avatar seed={entry.avatarSeed} size={ROW_AVATAR_SIZE} />
        <span className={cn('text-[14px] font-semibold', txt)}>
          {entry.handle}
          {you && ' · you'}
        </span>
      </div>
      <MonoNum className={cn('text-right text-[13px] font-semibold', txt)}>
        {entry.streak}
      </MonoNum>
      <MonoNum className={cn('text-right text-[13px] font-semibold', txt)}>
        {entry.attendancePct}%
      </MonoNum>
      <MonoNum className={cn('text-right text-[13px] font-bold', txt)}>{fmt(entry.tokens)}</MonoNum>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        <div className="h-44 rounded-lg border border-line bg-raised" />
        <div className="h-52 rounded-lg border border-line bg-raised" />
        <div className="h-44 rounded-lg border border-line bg-raised" />
      </div>
      <div className="h-72 rounded-card border border-line bg-raised" />
    </div>
  );
}

function MobilePodiumTile({ entry, winner }: { entry: LeaderboardEntry; winner: boolean }) {
  if (winner) {
    return (
      <div className="text-center">
        <Avatar
          seed={entry.avatarSeed}
          size={MOBILE_WINNER_AVATAR_SIZE}
          className="mx-auto mb-1.5"
        />
        <div className="truncate text-[13px] font-semibold leading-none">{entry.handle}</div>
        <MonoNum className="mt-1 block text-[14px] font-bold leading-none">{fmt(entry.tokens)}</MonoNum>
      </div>
    );
  }
  return (
    <div className="text-center">
      <Avatar
        seed={entry.avatarSeed}
        size={MOBILE_PODIUM_AVATAR_SIZE}
        className="mx-auto mb-1.5"
      />
      <div className="truncate text-[12px] font-semibold leading-none">{entry.handle}</div>
      <MonoNum className="mt-1 block text-[13px] font-bold leading-none">{fmt(entry.tokens)}</MonoNum>
      <div className="mt-[3px] font-mono text-[10px] font-bold text-content-secondary">
        {entry.rankLabel}
      </div>
    </div>
  );
}

function MobileRow({ entry, first }: { entry: LeaderboardEntry; first: boolean }) {
  const txt = entry.isYou ? 'text-cyan' : '';
  return (
    <div
      className={cn(
        MOBILE_ROW_COLS,
        !first && 'border-t border-line',
        entry.isYou ? 'bg-status-info-bg py-3' : 'py-[11px]',
      )}
    >
      <MonoNum className={cn('text-[13px] font-bold', txt)}>{entry.rankLabel}</MonoNum>
      <div className="flex min-w-0 items-center gap-[9px]">
        <Avatar seed={entry.avatarSeed} size={MOBILE_ROW_AVATAR_SIZE} />
        <span className={cn('truncate text-[13px] font-semibold', txt)}>{entry.handle}</span>
      </div>
      <MonoNum className={cn('text-[12px] font-bold', txt)}>{fmt(entry.tokens)}</MonoNum>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="mt-3.5 rounded-card border border-line bg-surface p-8 text-center text-sm text-content-secondary">
      {EMPTY_TEXT}
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div className="mt-3.5 animate-pulse">
      <div className="mb-3.5 grid grid-cols-3 items-end gap-2">
        <div className="h-28 rounded bg-raised" />
        <div className="h-32 rounded bg-raised" />
        <div className="h-28 rounded bg-raised" />
      </div>
      <div className="h-56 rounded border border-line bg-raised" />
    </div>
  );
}

export default function LeaderboardPage() {
  const address = useEmbeddedAddress();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.leaderboard(address),
    queryFn: () => getLeaderboard(address),
  });

  const entries = data ?? [];
  const hasPodium = entries.length >= PODIUM_COUNT;
  const podium = hasPodium ? entries.slice(0, PODIUM_COUNT) : [];
  const rows = hasPodium ? entries.slice(PODIUM_COUNT) : entries;

  const podiumItems = [
    { entry: podium[0], winner: true, order: 'sm:order-2' },
    { entry: podium[1], winner: false, order: 'sm:order-1' },
    { entry: podium[2], winner: false, order: 'sm:order-3' },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <MemberTopNav active="leaderboard" />

      <PageContainer className="hidden py-8 md:block">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-[30px] font-semibold leading-9">Leaderboard</h1>
            <p className="text-sm leading-5 text-content-secondary">{CLUB_SUBTITLE}</p>
          </div>
        </div>

        {error ? (
          <LoadError what="leaderboard" onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Skeleton />
        ) : entries.length === 0 ? (
          <EmptyBoard />
        ) : (
          <div className="animate-fade-in">
            {hasPodium && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
                {podiumItems.map(
                  ({ entry, winner, order }) =>
                    entry && (
                      <PodiumCard
                        key={entry.rank}
                        entry={entry}
                        winner={winner}
                        className={order}
                      />
                    ),
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-card border border-line bg-surface">
              <div>
                <div className={cn(TABLE_COLS, 'bg-raised px-5 py-3')}>
                  <span className={HEADER_CELL}>Rank</span>
                  <span className={HEADER_CELL}>Member</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>Streak</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>Attendance</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>Tokens</span>
                </div>
                {rows.map((entry) => (
                  <TableRow key={entry.rank} entry={entry} />
                ))}
              </div>
            </div>
          </div>
        )}
      </PageContainer>

      <div className="px-5 pb-24 pt-5 md:hidden">
        <h1 className="text-[22px] font-semibold leading-[28px]">Leaderboard</h1>

        {error ? (
          <LoadError what="leaderboard" onRetry={() => void refetch()} />
        ) : isLoading ? (
          <MobileSkeleton />
        ) : entries.length === 0 ? (
          <EmptyBoard />
        ) : (
          <div className="mt-3.5 animate-fade-in">
            {hasPodium && (
              <div className="mb-3.5 grid grid-cols-3 items-end gap-2">
                <MobilePodiumTile entry={podium[1]} winner={false} />
                <MobilePodiumTile entry={podium[0]} winner />
                <MobilePodiumTile entry={podium[2]} winner={false} />
              </div>
            )}

            <div className="overflow-hidden rounded border border-line bg-surface">
              {rows.map((entry, i) => (
                <MobileRow key={entry.rank} entry={entry} first={i === 0} />
              ))}
            </div>
          </div>
        )}
      </div>

      <MobileTabBar active="ranks" />
    </div>
  );
}
