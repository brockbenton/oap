'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import PageContainer from '@/components/shared/PageContainer';
import { Badge, MonoNum, ProgressBar } from '@/components/ui';
import type { BadgeProps } from '@/components/ui';
import { CheckIcon, GiftIcon, LockIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useLevel } from '@/lib/mock/gamification';
import { useRewards } from '@/lib/mock/rewards';
import type { Level, Reward } from '@/types';

const NUMBER_LOCALE = 'en-US';
const REWARD_ICON_SIZE = 20;
const CLAIMED_CHECK_SIZE = 16;
const LOADING_CARD_COUNT = 6;
const MOBILE_LOADING_ROW_COUNT = 4;
const PERCENT = 100;

const SECTION_HEADING = 'Rewards';
const INFO_TILE = {
  title: 'More rewards each semester',
  body: 'Organizers add new perks as the club grows.',
} as const;

const LEVEL_TIERS: ReadonlyArray<{ minLevel: number; name: string }> = [
  { minLevel: 1, name: 'Newcomer' },
  { minLevel: 4, name: 'Regular' },
  { minLevel: 6, name: 'Committed' },
  { minLevel: 7, name: 'Devoted' },
  { minLevel: 8, name: 'Dedicated' },
  { minLevel: 11, name: 'Veteran' },
  { minLevel: 15, name: 'Legend' },
];

function tierFor(level: number): string {
  let name = LEVEL_TIERS[0].name;
  for (const tier of LEVEL_TIERS) {
    if (level >= tier.minLevel) name = tier.name;
  }
  return name;
}

function formatNumber(value: number): string {
  return value.toLocaleString(NUMBER_LOCALE);
}

const ICON_TILE_BASE = 'grid h-11 w-11 flex-none place-items-center rounded-[12px]';
const CARD_BASE = 'rounded-tile p-[22px]';
const BUTTON_BASE =
  'flex h-[42px] w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition';
const BUTTON_READY = 'bg-green-500 text-white hover:bg-green-600 active:scale-[0.98]';
const BUTTON_DISABLED = 'cursor-not-allowed border border-line bg-white text-content-disabled';

const BANNER_GLOW = 'radial-gradient(circle, rgba(134,92,255,.4), transparent 70%)';
const BANNER_PROGRESS = 'linear-gradient(90deg, #6833ff, #26ddf9)';
const MOBILE_TITLE = 'text-[22px] font-semibold leading-[28px] tracking-[-0.5px]';

interface StatusMeta {
  card: string;
  iconTile: string;
  icon: ReactNode;
  badgeTone: BadgeProps['tone'];
  title: string;
}

const STATUS_META: Record<Reward['status'], StatusMeta> = {
  ready: {
    card: 'border border-green-300 bg-white',
    iconTile: 'bg-status-pos-bg text-status-pos',
    icon: <GiftIcon size={REWARD_ICON_SIZE} />,
    badgeTone: 'pos',
    title: 'text-ink',
  },
  locked: {
    card: 'border border-line bg-card-filled',
    iconTile: 'bg-white text-content-disabled',
    icon: <LockIcon size={REWARD_ICON_SIZE} />,
    badgeTone: 'neutral',
    title: 'text-ink',
  },
  claimed: {
    card: 'border border-line bg-card-filled',
    iconTile: 'bg-status-pos-bg text-status-pos',
    icon: <CheckIcon size={REWARD_ICON_SIZE} />,
    badgeTone: 'neutral',
    title: 'text-content-secondary',
  },
};

function badgeLabel(reward: Reward): string {
  switch (reward.status) {
    case 'ready':
      return 'READY';
    case 'claimed':
      return 'CLAIMED';
    case 'locked':
      return `LEVEL ${reward.requiredLevel}`;
  }
}

export default function RewardsPage() {
  const { data: level } = useLevel();
  const { data: rewardsData } = useRewards();
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => new Set());

  const rewards: Reward[] = (rewardsData ?? []).map((reward) =>
    claimedIds.has(reward.id) ? { ...reward, status: 'claimed' as const } : reward,
  );
  const availableToClaim = rewards.filter((reward) => reward.status === 'ready').length;

  const claim = (id: string) =>
    setClaimedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <MemberTopNav active="rewards" />
      <div className="hidden md:block">
        <PageContainer className="py-8">
          {level && rewardsData ? (
            <>
              <LevelBanner level={level} availableToClaim={availableToClaim} />
              <h2 className="mb-4 text-base font-semibold leading-none">{SECTION_HEADING}</h2>
              <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward) => (
                  <RewardCard key={reward.id} reward={reward} onClaim={claim} />
                ))}
                <InfoTile />
              </div>
            </>
          ) : (
            <LoadingState />
          )}
        </PageContainer>
      </div>
      <div className="px-5 pb-24 pt-4 md:hidden md:pb-0">
        <h1 className={cn('mb-3', MOBILE_TITLE)}>{SECTION_HEADING}</h1>
        {level && rewardsData ? (
          <>
            <MobileLevelBanner level={level} availableToClaim={availableToClaim} />
            <div className="flex flex-col gap-3">
              {rewards.map((reward) => (
                <MobileRewardRow key={reward.id} reward={reward} onClaim={claim} />
              ))}
            </div>
          </>
        ) : (
          <MobileLoadingState />
        )}
      </div>
      <MobileTabBar active="rewards" />
    </div>
  );
}

function LevelBanner({ level, availableToClaim }: { level: Level; availableToClaim: number }) {
  const progress = level.xpForNextLevel > 0 ? level.xpIntoLevel / level.xpForNextLevel : 0;
  const remaining = Math.max(0, level.xpForNextLevel - level.xpIntoLevel);
  const nextLevel = level.level + 1;

  return (
    <section className="relative mb-6 flex flex-col gap-6 overflow-hidden rounded-lg bg-ink px-7 py-[26px] text-white sm:flex-row sm:items-center sm:gap-7">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-52 w-52 rounded-full"
        style={{ background: BANNER_GLOW }}
      />
      <div className="grid h-16 w-16 flex-none place-items-center rounded-tile bg-white/10">
        <MonoNum className="text-2xl font-bold text-purple-300">{level.level}</MonoNum>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-xl font-semibold leading-tight">
          Level {level.level} · {tierFor(level.level)}
        </div>
        <div className="mb-2 max-w-[520px]">
          <ProgressBar value={progress} gradient />
        </div>
        <div className="font-mono text-[13px] tabular-nums text-white/70">
          {formatNumber(level.xpIntoLevel)} / {formatNumber(level.xpForNextLevel)} XP ·{' '}
          {formatNumber(remaining)} to Level {nextLevel} ({tierFor(nextLevel)})
        </div>
      </div>
      <div className="flex-none text-left sm:text-right">
        <div className="mb-1 font-mono text-xs text-white/60">Available to claim</div>
        <MonoNum className="text-2xl font-bold text-cyan">{availableToClaim}</MonoNum>
      </div>
    </section>
  );
}

function RewardCard({ reward, onClaim }: { reward: Reward; onClaim: (id: string) => void }) {
  const meta = STATUS_META[reward.status];

  return (
    <div className={cn(CARD_BASE, meta.card)}>
      <div className="mb-4 flex items-center justify-between">
        <div className={cn(ICON_TILE_BASE, meta.iconTile)}>{meta.icon}</div>
        <Badge tone={meta.badgeTone}>{badgeLabel(reward)}</Badge>
      </div>
      <h3 className={cn('mb-1.5 text-base font-semibold leading-[1.3]', meta.title)}>{reward.title}</h3>
      <p className="mb-[18px] text-[13px] leading-[19px] text-content-secondary">{reward.description}</p>
      <RewardAction reward={reward} onClaim={onClaim} />
    </div>
  );
}

function RewardAction({ reward, onClaim }: { reward: Reward; onClaim: (id: string) => void }) {
  if (reward.status === 'ready') {
    return (
      <button type="button" onClick={() => onClaim(reward.id)} className={cn(BUTTON_BASE, BUTTON_READY)}>
        Claim
      </button>
    );
  }
  if (reward.status === 'claimed') {
    return (
      <button type="button" disabled className={cn(BUTTON_BASE, BUTTON_DISABLED)}>
        <CheckIcon size={CLAIMED_CHECK_SIZE} /> Claimed
      </button>
    );
  }
  return (
    <button type="button" disabled className={cn(BUTTON_BASE, BUTTON_DISABLED)}>
      Level {reward.requiredLevel} required
    </button>
  );
}

function InfoTile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-line bg-white p-[22px] text-center text-content-secondary">
      <div className={cn(ICON_TILE_BASE, 'bg-status-info-bg font-mono text-[18px] font-bold text-blue-600')}>
        ?
      </div>
      <div className="text-sm font-semibold text-ink">{INFO_TILE.title}</div>
      <p className="text-xs leading-[17px]">{INFO_TILE.body}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-[132px] rounded-lg bg-card-filled" />
      <div className="mb-4 h-4 w-24 rounded bg-card-filled" />
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
          <div key={index} className="h-[184px] rounded-tile border border-line bg-card-filled" />
        ))}
      </div>
    </div>
  );
}

function MobileLevelBanner({ level, availableToClaim }: { level: Level; availableToClaim: number }) {
  const progress = level.xpForNextLevel > 0 ? level.xpIntoLevel / level.xpForNextLevel : 0;
  const remaining = Math.max(0, level.xpForNextLevel - level.xpIntoLevel);
  const nextLevel = level.level + 1;

  return (
    <section className="relative mb-4 overflow-hidden rounded-tile bg-ink p-[18px] text-white">
      <div
        className="pointer-events-none absolute -right-5 -top-[30px] h-[120px] w-[120px] rounded-full"
        style={{ background: BANNER_GLOW }}
      />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-base font-semibold leading-none">
          Level {level.level} · {tierFor(level.level)}
        </span>
        <span className="font-mono text-[13px] font-bold leading-none tabular-nums text-cyan">
          {availableToClaim} ready
        </span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full"
          style={{ width: `${progress * PERCENT}%`, background: BANNER_PROGRESS }}
        />
      </div>
      <div className="font-mono text-xs font-medium leading-none text-white/70">
        {formatNumber(remaining)} XP to Level {nextLevel}
      </div>
    </section>
  );
}

function MobileRewardRow({ reward, onClaim }: { reward: Reward; onClaim: (id: string) => void }) {
  const meta = STATUS_META[reward.status];

  return (
    <div className={cn('flex items-center gap-3.5 rounded-card p-4', meta.card)}>
      <div className={cn(ICON_TILE_BASE, meta.iconTile)}>{meta.icon}</div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-semibold leading-[1.2]', meta.title)}>{reward.title}</div>
        <div className="mt-1 text-[11px] leading-none text-content-secondary">
          Level {reward.requiredLevel}
        </div>
      </div>
      <MobileRewardTrailing reward={reward} onClaim={onClaim} />
    </div>
  );
}

function MobileRewardTrailing({ reward, onClaim }: { reward: Reward; onClaim: (id: string) => void }) {
  if (reward.status === 'ready') {
    return (
      <button
        type="button"
        onClick={() => onClaim(reward.id)}
        className={cn(
          'flex h-9 flex-none items-center justify-center rounded-full px-4 text-xs font-semibold transition',
          BUTTON_READY,
        )}
      >
        Claim
      </button>
    );
  }
  if (reward.status === 'claimed') {
    return (
      <span className="flex flex-none items-center gap-1 text-xs font-semibold text-content-secondary">
        <CheckIcon size={CLAIMED_CHECK_SIZE} /> Claimed
      </span>
    );
  }
  return <LockIcon size={REWARD_ICON_SIZE} className="flex-none text-content-disabled" />;
}

function MobileLoadingState() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-[110px] rounded-tile bg-card-filled" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: MOBILE_LOADING_ROW_COUNT }).map((_, index) => (
          <div key={index} className="h-[76px] rounded-card border border-line bg-card-filled" />
        ))}
      </div>
    </div>
  );
}
