'use client';

import { useState } from 'react';
import MemberTopNav from '@/components/shared/MemberTopNav';
import PageContainer from '@/components/shared/PageContainer';
import Avatar from '@/components/ui/Avatar';
import MonoNum from '@/components/ui/MonoNum';
import { TrophyIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useLeaderboard, type LeaderboardTimeframe } from '@/lib/mock/gamification';
import type { LeaderboardEntry } from '@/types';

const CLUB_SUBTITLE = 'Blockchain Club · ranked by XP and attendance streak.';
const HERO_STREAK_WEEKS = 7;

const PODIUM_COUNT = 3;
const WINNER_AVATAR_SIZE = 72;
const PODIUM_AVATAR_SIZE = 60;
const ROW_AVATAR_SIZE = 32;
const WINNER_BG = 'linear-gradient(180deg,#fefaf2,#ffffff)'; // yellow-50 → white
const WINNER_GLOW = 'shadow-[0_8px_24px_rgba(245,158,0,0.4)]';

const TIMEFRAMES: { value: LeaderboardTimeframe; label: string }[] = [
  { value: 'semester', label: 'Semester' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
];

const SEG_BASE = 'rounded-[8px] px-4 py-2 text-[13px] transition';
const SEG_ACTIVE = 'bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.06)]';
const SEG_INACTIVE = 'font-medium text-content-secondary hover:text-ink';

const TABLE_COLS =
  'grid min-w-[560px] grid-cols-[56px_1fr_120px_120px_100px] items-center gap-3';
const HEADER_CELL = 'font-mono text-[11px] uppercase tracking-[0.06em] text-content-secondary';

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}TH`;
  switch (n % 10) {
    case 1:
      return `${n}ST`;
    case 2:
      return `${n}ND`;
    case 3:
      return `${n}RD`;
    default:
      return `${n}TH`;
  }
}

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
          'rounded-lg border border-yellow-400 px-6 py-7 text-center shadow-elev-sm',
          className,
        )}
        style={{ background: WINNER_BG }}
      >
        <TrophyIcon size={24} className="mx-auto mb-2.5 text-yellow-500" />
        <Avatar
          seed={entry.avatarSeed}
          size={WINNER_AVATAR_SIZE}
          className={cn('mx-auto mb-3', WINNER_GLOW)}
        />
        <div className="mb-1 text-[17px] font-semibold leading-tight">{entry.handle}</div>
        <div className="font-mono text-[11px] text-yellow-700">{entry.streakWeeks} wk streak</div>
        <MonoNum className="mt-3.5 block text-[26px] font-bold leading-none tracking-[-0.5px]">
          {fmt(entry.xp)}
        </MonoNum>
      </div>
    );
  }
  return (
    <div className={cn('rounded-lg border border-line bg-white p-6 text-center', className)}>
      <div className="mb-3.5 font-mono text-[13px] font-bold text-content-secondary">
        {ordinal(entry.rank)}
      </div>
      <Avatar seed={entry.avatarSeed} size={PODIUM_AVATAR_SIZE} className="mx-auto mb-3" />
      <div className="mb-1 text-[15px] font-semibold leading-tight">{entry.handle}</div>
      <div className="font-mono text-[11px] text-content-secondary">
        {entry.streakWeeks} wk streak
      </div>
      <MonoNum className="mt-3.5 block text-[22px] font-bold leading-none tracking-[-0.5px]">
        {fmt(entry.xp)}
      </MonoNum>
    </div>
  );
}

function TableRow({ entry }: { entry: LeaderboardEntry }) {
  const you = entry.isYou;
  const txt = you ? 'text-blue-700' : '';
  return (
    <div
      className={cn(
        TABLE_COLS,
        'border-t border-line px-5',
        you ? 'bg-status-info-bg py-4' : 'py-3.5',
      )}
    >
      <MonoNum className={cn('text-[14px] font-bold', txt)}>{entry.rank}</MonoNum>
      <div className="flex items-center gap-3">
        <Avatar seed={entry.avatarSeed} size={ROW_AVATAR_SIZE} />
        <span className={cn('text-[14px] font-semibold', txt)}>
          {entry.handle}
          {you && ' · you'}
        </span>
      </div>
      <MonoNum className={cn('text-right text-[13px] font-semibold', txt)}>
        {entry.streakWeeks} wk
      </MonoNum>
      <MonoNum className={cn('text-right text-[13px] font-semibold', txt)}>{entry.tokens}</MonoNum>
      <MonoNum className={cn('text-right text-[13px] font-bold', txt)}>{fmt(entry.xp)}</MonoNum>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        <div className="h-44 rounded-lg border border-line bg-card-filled" />
        <div className="h-52 rounded-lg border border-line bg-card-filled" />
        <div className="h-44 rounded-lg border border-line bg-card-filled" />
      </div>
      <div className="h-72 rounded-card border border-line bg-card-filled" />
    </div>
  );
}

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('semester');
  const { data, isLoading } = useLeaderboard(timeframe);

  const entries = data ?? [];
  const podium = entries.slice(0, PODIUM_COUNT);
  const rows = entries.slice(PODIUM_COUNT);

  const podiumItems = [
    { entry: podium[0], winner: true, order: 'sm:order-2' },
    { entry: podium[1], winner: false, order: 'sm:order-1' },
    { entry: podium[2], winner: false, order: 'sm:order-3' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <MemberTopNav active="leaderboard" streakWeeks={HERO_STREAK_WEEKS} />

      <PageContainer className="py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-[30px] font-semibold leading-9 tracking-[-1px]">Leaderboard</h1>
            <p className="text-sm leading-5 text-content-secondary">{CLUB_SUBTITLE}</p>
          </div>
          <div className="flex gap-1.5 rounded-[12px] bg-card-filled p-[5px]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value)}
                aria-pressed={timeframe === tf.value}
                className={cn(SEG_BASE, timeframe === tf.value ? SEG_ACTIVE : SEG_INACTIVE)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton />
        ) : (
          <div className="animate-fade-in">
            {podium.length === PODIUM_COUNT && (
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

            <div className="overflow-x-auto rounded-card border border-line bg-white">
              <div>
                <div className={cn(TABLE_COLS, 'bg-card-filled px-5 py-3')}>
                  <span className={HEADER_CELL}>Rank</span>
                  <span className={HEADER_CELL}>Member</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>Streak</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>Tokens</span>
                  <span className={cn(HEADER_CELL, 'text-right')}>XP</span>
                </div>
                {rows.map((entry) => (
                  <TableRow key={entry.rank} entry={entry} />
                ))}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
