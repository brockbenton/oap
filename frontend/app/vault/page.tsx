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
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import PageContainer from '@/components/shared/PageContainer';
import TokenCard from '@/components/shared/TokenCard';
import TokenDetailModal, { type TokenDetailData } from '@/components/shared/TokenDetailModal';
import { IconButton } from '@/components/ui';
import { GRADIENT_NAMES } from '@/lib/tokenArt';
import type { GradientName } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';
import { VaultToken } from '@/types';

const ALL_SEMESTERS = 'All semesters';
const ALL_LABEL = 'All';
const TOKENS_LABEL = 'tokens';
const RARE_LABEL = 'rare';
const CLUB_LABEL = 'club';
const MORE_TOKENS_LABEL = 'more tokens';
const MINT_PENDING_LABEL = 'Minting…';
const MINT_FAILED_LABEL = 'Failed';

/** How many tokens the grid previews before collapsing the rest behind a "+N more" tile. */
const MAX_VISIBLE_TOKENS = 9;

/** "Recent" previews the newest tokens; 6 matches the mobile frame's visible grid. */
const RECENT_TOKEN_LIMIT = 6;

const MOBILE_FILTER_ALL = 'all' as const;
const MOBILE_FILTER_RARE = 'rare' as const;
const MOBILE_FILTER_RECENT = 'recent' as const;

const MOBILE_FILTERS = [
  { key: MOBILE_FILTER_ALL, label: 'All' },
  { key: MOBILE_FILTER_RARE, label: 'Rare' },
  { key: MOBILE_FILTER_RECENT, label: 'Recent' },
] as const;

type MobileFilter = (typeof MOBILE_FILTERS)[number]['key'];

const CLUB_COUNT = 1;
/** Real vault data carries no rarity signal yet, so the rare tally is always zero. */
const RARE_TOKEN_COUNT = 0;

const TONE_NEUTRAL = 'neutral' as const;
const TONE_INFO = 'info' as const;

const CLUB_NAME = 'Blockchain Club';
const CHAIN_NAME = 'Base';
const TOKEN_STANDARD = 'ERC-721 · soulbound';
const SAMPLE_XP = 180;
const SAMPLE_EDITION_OF = 240;
const SAMPLE_TX_HASH = '0x9f2c7ab41d6e8305c1a4b7e0f93d2685a4c1de07f8b3629045ac1d7e6b0f2a3c';
const SEASON_TRAIT_LABEL = 'Season';
const STATIC_TRAITS: TokenDetailData['traits'] = [
  { label: 'Rarity', value: 'Common', tone: TONE_NEUTRAL },
  { label: 'Check-in', value: 'On-time', tone: TONE_INFO },
];

const CHIP_BASE = 'rounded-full px-3.5 py-2 text-xs transition';
const CHIP_ACTIVE = 'bg-ink font-semibold text-white';
const CHIP_INACTIVE = 'border border-line font-medium text-content-secondary hover:text-ink';
const MINT_BADGE_BASE =
  'pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold';
const MORE_TILE_CLASSES =
  'flex h-full min-h-[172px] flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-line-strong bg-card-filled text-content-secondary transition hover:border-content-secondary';

export default function VaultPage() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();
  const [semester, setSemester] = useState<string>(ALL_SEMESTERS);
  const [sortDesc, setSortDesc] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<VaultToken | null>(null);
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>(MOBILE_FILTER_ALL);

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

  const sorted = useMemo(() => {
    const arr = [...visible];
    arr.sort((a, b) => {
      const cmp = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortDesc ? cmp : -cmp;
    });
    return arr;
  }, [visible, sortDesc]);

  const shown = showAll ? sorted : sorted.slice(0, MAX_VISIBLE_TOKENS);
  const overflow = sorted.length - shown.length;

  const allByRecent = useMemo(
    () =>
      [...(data?.tokens ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [data],
  );

  const mobileTokens = useMemo(() => {
    if (mobileFilter === MOBILE_FILTER_RARE) return []; // no rarity signal in vault data yet
    if (mobileFilter === MOBILE_FILTER_RECENT) return allByRecent.slice(0, RECENT_TOKEN_LIMIT);
    return allByRecent;
  }, [allByRecent, mobileFilter]);

  const actualSemesters = semesters.filter((s) => s !== ALL_SEMESTERS);
  const hasMultipleSemesters = actualSemesters.length > 1;
  const tokenCount = data?.tokenCount ?? 0;

  const chips = [
    { key: ALL_SEMESTERS, label: `${ALL_LABEL} ${tokenCount}` },
    ...(hasMultipleSemesters ? actualSemesters.map((s) => ({ key: s, label: s })) : []),
  ];

  const headerStats = data
    ? [
        { value: data.tokenCount, label: TOKENS_LABEL },
        { value: RARE_TOKEN_COUNT, label: RARE_LABEL },
        { value: CLUB_COUNT, label: CLUB_LABEL },
      ]
    : [];

  if (!ready || !authenticated) return <FullPageSpinner />;

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfc]">
      <MemberTopNav active="vault" />

      <main className="hidden flex-1 py-8 md:block">
        <PageContainer>
          <div className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[30px] font-semibold leading-9 tracking-[-1px]">My Vault</h1>
              {data && (
                <div className="mt-2 flex flex-wrap gap-5">
                  {headerStats.map((stat) => (
                    <span key={stat.label} className="text-[13px] font-medium text-content-secondary">
                      <b className="font-mono text-ink tabular-nums">{stat.value}</b> {stat.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {data && (
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setSemester(chip.key)}
                    className={cn(CHIP_BASE, semester === chip.key ? CHIP_ACTIVE : CHIP_INACTIVE)}
                  >
                    {chip.label}
                  </button>
                ))}
                <IconButton
                  label={sortDesc ? 'Sort oldest first' : 'Sort newest first'}
                  onClick={() => setSortDesc((v) => !v)}
                  className="h-9 w-9 border border-line text-content-secondary"
                >
                  <SortIcon />
                </IconButton>
              </div>
            )}
          </div>

          {isLoading ? (
            <GridSkeleton />
          ) : error ? (
            <LoadError what="vault" onRetry={() => refetch()} />
          ) : sorted.length === 0 ? (
            <EmptyVault hasAny={tokenCount > 0} />
          ) : (
            <div className="fade-in grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {shown.map((token) => (
                <div key={token.tokenId} className="relative">
                  <TokenCard
                    editionNumber={token.meetingNumber}
                    topic={token.name}
                    date={formatCardDate(token.date)}
                    gradient={gradientNameFor(token.name)}
                    rarity={null}
                    onClick={() => setSelected(token)}
                  />
                  {token.mintStatus !== 'CONFIRMED' && <MintStatusBadge status={token.mintStatus} />}
                </div>
              ))}
              {overflow > 0 && (
                <button type="button" onClick={() => setShowAll(true)} className={MORE_TILE_CLASSES}>
                  <span className="font-mono text-[22px] font-bold text-content-disabled">+{overflow}</span>
                  <span className="text-xs font-medium">{MORE_TOKENS_LABEL}</span>
                </button>
              )}
            </div>
          )}
        </PageContainer>
      </main>

      <main className="flex-1 px-5 pb-24 pt-1 md:hidden">
        <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.5px]">My Vault</h1>
        {data && (
          <p className="mt-1.5 font-mono text-xs font-medium tabular-nums text-content-secondary">
            {tokenCount} {TOKENS_LABEL} · {RARE_TOKEN_COUNT} {RARE_LABEL}
          </p>
        )}

        {data && (
          <div className="mb-4 mt-3 flex gap-2">
            {MOBILE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setMobileFilter(filter.key)}
                className={cn(CHIP_BASE, mobileFilter === filter.key ? CHIP_ACTIVE : CHIP_INACTIVE)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <GridSkeleton />
        ) : error ? (
          <LoadError what="vault" onRetry={() => refetch()} />
        ) : mobileTokens.length === 0 ? (
          <EmptyVault hasAny={tokenCount > 0} />
        ) : (
          <div className="fade-in grid grid-cols-2 gap-3">
            {mobileTokens.map((token) => (
              <div key={token.tokenId} className="relative">
                <TokenCard
                  editionNumber={token.meetingNumber}
                  topic={token.name}
                  date={formatCardDate(token.date)}
                  gradient={gradientNameFor(token.name)}
                  rarity={null}
                  onClick={() => setSelected(token)}
                />
                {token.mintStatus !== 'CONFIRMED' && <MintStatusBadge status={token.mintStatus} />}
              </div>
            ))}
          </div>
        )}
      </main>

      <TokenDetailModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        token={selected ? toDetail(selected) : null}
      />

      <MobileTabBar active="vault" />
    </div>
  );
}

// ── mapping ──────────────────────────────────────────────────────────────────

function toDetail(token: VaultToken): TokenDetailData {
  return {
    editionNumber: token.meetingNumber,
    editionOf: SAMPLE_EDITION_OF,
    topic: token.name,
    club: CLUB_NAME,
    week: token.meetingNumber,
    mintedAt: formatMintedAt(token.date),
    chain: CHAIN_NAME,
    standard: TOKEN_STANDARD,
    xp: SAMPLE_XP,
    gradient: gradientNameFor(token.name),
    rarity: null,
    traits: [...STATIC_TRAITS, { label: SEASON_TRAIT_LABEL, value: token.semester, tone: TONE_NEUTRAL }],
    txHash: token.txHash ?? SAMPLE_TX_HASH,
  };
}

/** Mirrors gradientForTopic() to yield the typed GradientName the card + modal props require, not the CSS string. */
function gradientNameFor(topic: string): GradientName {
  let sum = 0;
  for (let i = 0; i < topic.length; i += 1) sum += topic.charCodeAt(i);
  return GRADIENT_NAMES[sum % GRADIENT_NAMES.length];
}

// ── components ───────────────────────────────────────────────────────────────

function MintStatusBadge({ status }: { status: 'PENDING' | 'FAILED' }) {
  const isPending = status === 'PENDING';
  return (
    <span
      className={cn(
        MINT_BADGE_BASE,
        isPending ? 'bg-status-warn-bg text-status-warn' : 'bg-status-neg-bg text-status-neg',
      )}
    >
      {isPending ? MINT_PENDING_LABEL : MINT_FAILED_LABEL}
    </span>
  );
}

function EmptyVault({ hasAny }: { hasAny: boolean }) {
  if (hasAny) {
    return <p className="py-20 text-center text-sm text-content-secondary">No tokens for this filter.</p>;
  }
  return (
    <div className="fade-in flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-tile bg-card-filled">
        <svg className="h-8 w-8 text-cyan" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12l2.25 2.25 4.5-4.5" />
        </svg>
      </div>
      <p className="font-semibold text-ink">No attendance tokens yet</p>
      <p className="mt-1 max-w-xs text-sm text-content-secondary">
        Check in at a meeting to earn your first attendance token.
      </p>
      <Link
        href="/check-in"
        className="mt-5 inline-block rounded-md bg-cyan px-5 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90"
      >
        Scan QR Code
      </Link>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-tile border border-line bg-white">
          <div className="aspect-square animate-pulse bg-card-filled" />
          <div className="space-y-2 px-3.5 py-3">
            <div className="h-3 animate-pulse rounded bg-card-filled" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-card-filled" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fbfbfc]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan border-t-transparent" />
    </div>
  );
}

function SortIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M7 12h10M10 18h4" />
    </svg>
  );
}

function formatCardDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
    .toUpperCase();
}

function formatMintedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
