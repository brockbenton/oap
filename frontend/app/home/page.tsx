'use client';

import Link from 'next/link';
import MemberTopNav from '@/components/shared/MemberTopNav';
import PageContainer from '@/components/shared/PageContainer';
import TokenCard from '@/components/shared/TokenCard';
import { Avatar, Button, MonoNum, StatTile } from '@/components/ui';
import { QrIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import type { GradientName } from '@/lib/tokenArt';
import {
  useLeaderboard,
  useLevel,
  useRank,
  type LeaderboardTimeframe,
  type RankSummary,
} from '@/lib/mock/gamification';
import type { Level, LeaderboardEntry } from '@/types';

/** Flip to false to preview the new-member empty Home (frame 7b). Real vault wiring lands in M5. */
const HAS_TOKENS = true;

const CLUB_EYEBROW = "Blockchain Club · Spring '26";
const GREETING = 'Welcome back, alex.eth';
const EMPTY_GREETING = 'Welcome to OAP, riley.eth 👋';
const NEXT_MEETING = 'Next meeting · Thu 6:00 PM';
const STREAK_WEEKS = 7;

const CHECK_IN_HREF = '/check-in';
const VAULT_HREF = '/vault';

const LIVE_TITLE = 'Meeting is live — check in now';
const LIVE_SUBTITLE = 'Week 8 · MEV & Flashbots · Room 214';
const SCAN_LABEL = 'Scan QR code';

const STREAK_HINT = 'Personal best. Miss a week to reset.';
const RANK_DELTA_SUFFIX = 'this week';

const VAULT_TOKEN_COUNT = 23;
const VIEW_ALL = 'View all →';

const LEADERBOARD_TITLE = 'Leaderboard';
const LEADERBOARD_TIMEFRAME: LeaderboardTimeframe = 'semester';
const LEADERBOARD_TIMEFRAME_LABEL = 'This semester';
const LEADERBOARD_SUBTITLE = 'Ranked by attendance streak & XP.';
const LEADERBOARD_PREVIEW_COUNT = 3;
const LEADERBOARD_AVATAR_SIZE = 32;

const NEXT_REWARD = { level: 7, title: 'Club hoodie raffle entry', xpToGo: 720 };

const MINT_TITLE = 'Mint your first token';
const MINT_BODY =
  'Head to a meeting and scan the QR on the projector. Your attendance token appears here the moment you check in.';
const EMPTY_STREAK_HINT = 'Check in this week to start one.';
const EMPTY_VAULT_TITLE = 'Your vault is empty';
const EMPTY_VAULT_SUB = 'Tokens you earn will show up here.';
const EMPTY_LEVEL: Level = { level: 1, xp: 0, xpIntoLevel: 0, xpForNextLevel: 500 };

const GLOW_CYAN = 'radial-gradient(circle, rgba(38,221,249,0.35), transparent 70%)';
const GLOW_CYAN_SOFT = 'radial-gradient(circle, rgba(38,221,249,0.3), transparent 70%)';
const GLOW_PURPLE_SOFT = 'radial-gradient(circle, rgba(104,51,255,0.3), transparent 70%)';
const SUBTLE_LIGHT = 'text-[rgba(218,229,247,0.7)]';

interface SampleToken {
  editionNumber: number;
  topic: string;
  date: string;
  gradient: GradientName;
}

const SAMPLE_TOKENS: SampleToken[] = [
  { editionNumber: 128, topic: 'Solidity', date: 'APR 04', gradient: 'blue' },
  { editionNumber: 87, topic: 'ZK Proofs', date: 'MAR 28', gradient: 'purple' },
  { editionNumber: 204, topic: 'DeFi', date: 'MAR 21', gradient: 'green' },
  { editionNumber: 61, topic: 'L2 Rollups', date: 'MAR 14', gradient: 'orange' },
];

const fmt = (n: number): string => n.toLocaleString('en-US');

export default function HomePage() {
  return HAS_TOKENS ? <PopulatedHome /> : <EmptyHome />;
}

function GreetingHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2 font-mono text-[13px] uppercase tracking-[0.06em] text-status-neutral">
          {CLUB_EYEBROW}
        </div>
        <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-1px]">{title}</h1>
      </div>
      {note && <div className="font-mono text-[13px] text-content-secondary">{note}</div>}
    </div>
  );
}

function PopulatedHome() {
  const { data: level } = useLevel();
  const { data: rank } = useRank();
  const { data: board, isLoading } = useLeaderboard(LEADERBOARD_TIMEFRAME);
  const loading = isLoading || !level || !rank || !board;

  return (
    <div className="min-h-screen bg-white">
      <MemberTopNav active="home" streakWeeks={STREAK_WEEKS} />
      <PageContainer className="py-8">
        <GreetingHeader title={GREETING} note={NEXT_MEETING} />
        {loading ? (
          <HomeSkeleton />
        ) : (
          <div className="grid animate-fade-in grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
            <div className="flex flex-col gap-5">
              <CheckInCard />
              <StatRow level={level} rank={rank} />
              <VaultPreview />
            </div>
            <LeaderboardPreview entries={board} />
          </div>
        )}
      </PageContainer>
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
        <div className="mb-1 text-xl font-semibold leading-[1.3]">{LIVE_TITLE}</div>
        <div className={cn('text-sm leading-5', SUBTLE_LIGHT)}>{LIVE_SUBTITLE}</div>
      </div>
      <Link href={CHECK_IN_HREF} className="relative flex-none">
        <Button variant="cyan" size="lg">
          {SCAN_LABEL}
        </Button>
      </Link>
    </div>
  );
}

function StatRow({ level, rank }: { level: Level; rank: RankSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile
        label="Level"
        value={level.level}
        progress={level.xpIntoLevel / level.xpForNextLevel}
        progressHint={`${fmt(level.xpIntoLevel)} / ${fmt(level.xpForNextLevel)} XP`}
      />
      <StatTile
        label="Streak"
        value={<span className="text-yellow-700">{STREAK_WEEKS} wk</span>}
        hint={STREAK_HINT}
      />
      <StatTile
        label="Rank"
        value={`#${rank.rank}`}
        delta={{ text: `up ${rank.delta} ${RANK_DELTA_SUFFIX}`, tone: 'pos' }}
      />
    </div>
  );
}

function VaultPreview() {
  return (
    <div className="rounded-lg border border-line bg-white p-[22px]">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="text-base font-semibold">My Vault · {VAULT_TOKEN_COUNT} tokens</div>
        <Link href={VAULT_HREF} className="text-[13px] font-semibold text-blue-500">
          {VIEW_ALL}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {SAMPLE_TOKENS.map((token) => (
          <TokenCard
            key={token.editionNumber}
            editionNumber={token.editionNumber}
            topic={token.topic}
            date={token.date}
            gradient={token.gradient}
          />
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
      <NextRewardChip />
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
          {entry.streakWeeks} wk streak
        </div>
      </div>
      <MonoNum className={cn('text-[13px] font-bold', highlighted && 'text-blue-700')}>
        {fmt(entry.xp)}
      </MonoNum>
    </div>
  );
}

function NextRewardChip() {
  return (
    <div className="mt-5 border-t border-line pt-[18px]">
      <div className="mb-3 text-[13px] font-semibold">Next reward at Level {NEXT_REWARD.level}</div>
      <div className="flex items-center gap-3 rounded-[12px] bg-status-rew-bg p-3">
        <div className="grid h-9 w-9 flex-none place-items-center rounded-md bg-purple-500 text-white">
          ★
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight text-purple-700">
            {NEXT_REWARD.title}
          </div>
          <div className="mt-[3px] font-mono text-[11px] text-purple-600">
            {fmt(NEXT_REWARD.xpToGo)} XP to go
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyHome() {
  return (
    <div className="min-h-screen bg-white">
      <MemberTopNav active="home" />
      <PageContainer className="py-8">
        <GreetingHeader title={EMPTY_GREETING} />

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
            label="Level"
            value={EMPTY_LEVEL.level}
            progress={EMPTY_LEVEL.xpIntoLevel / EMPTY_LEVEL.xpForNextLevel}
            progressHint={`${EMPTY_LEVEL.xpIntoLevel} / ${EMPTY_LEVEL.xpForNextLevel} XP`}
          />
          <StatTile
            label="Streak"
            value={<span className="text-content-disabled">0 wk</span>}
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
