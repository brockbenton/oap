'use client';

import { useMemo, useState, type ReactNode } from 'react';
import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import Footer from '@/components/shared/Footer';
import { StatTile } from '@/components/ui';
import { ExternalLinkIcon, QrIcon, SearchIcon } from '@/components/ui/icons';
import { TOKEN_GRADIENTS } from '@/lib/tokenArt';
import { BASESCAN_URL } from '@/lib/constants';
import {
  useCollectors,
  useExploreStats,
  useMintFeed,
  useTrending,
  type ExploreStats,
} from '@/lib/mock/explore';
import type { Collector, MintFeedItem, TrendingTopic } from '@/types';

const SEARCH_PLACEHOLDER = 'Search by wallet, ENS, token #, or club…';
const EXPLORER_TX_URL = `${BASESCAN_URL}/tx/`;
const NUMBER_LOCALE = 'en-US';
const EDITION_PAD_LENGTH = 3;
const TX_LEAD_CHARS = 4;
const TX_TAIL_CHARS = 4;

interface StatTileConfig {
  label: string;
  key: keyof ExploreStats;
  positive?: boolean;
}

const STAT_TILES: readonly StatTileConfig[] = [
  { label: 'Total minted', key: 'tokensMinted' },
  { label: 'Meetings this week', key: 'meetingsThisWeek', positive: true },
  { label: 'Active clubs', key: 'clubs' },
  { label: 'Unique wallets', key: 'members' },
];

const GHOST_ROWS: ReadonlyArray<{ primary: string; secondary: string }> = [
  { primary: '60%', secondary: '38%' },
  { primary: '52%', secondary: '30%' },
];

const SECTION_HEADING_CLASSES = 'text-[15px] font-semibold leading-none';
const LIST_CARD_CLASSES = 'rounded-card border border-line bg-white';

function formatNumber(value: number): string {
  return value.toLocaleString(NUMBER_LOCALE);
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, TX_LEAD_CHARS)}…${hash.slice(-TX_TAIL_CHARS)}`;
}

function editionLabel(editionNumber: number): string {
  return `#${String(editionNumber).padStart(EDITION_PAD_LENGTH, '0')}`;
}

function statValue(config: StatTileConfig, stats: ExploreStats | undefined, empty: boolean): ReactNode {
  if (empty || !stats) return <span className="text-content-disabled">0</span>;
  const formatted = formatNumber(stats[config.key]);
  if (config.positive) return <span className="text-green-600">+{formatted}</span>;
  return formatted;
}

function matchesQuery(item: MintFeedItem, query: string): boolean {
  return (
    item.handle.toLowerCase().includes(query) ||
    item.topic.toLowerCase().includes(query) ||
    item.club.toLowerCase().includes(query) ||
    editionLabel(item.editionNumber).toLowerCase().includes(query)
  );
}

export default function ExplorePage() {
  const feedQuery = useMintFeed();
  const collectorsQuery = useCollectors();
  const trendingQuery = useTrending();
  const statsQuery = useExploreStats();

  const [query, setQuery] = useState('');

  const feed = useMemo(() => feedQuery.data ?? [], [feedQuery.data]);
  const collectors = collectorsQuery.data ?? [];
  const trending = trendingQuery.data ?? [];
  const isEmpty = feedQuery.isSuccess && feed.length === 0;

  const filteredFeed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed;
    return feed.filter((item) => matchesQuery(item, q));
  }, [feed, query]);

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      <main>
        <PageContainer className="py-8">
          <SearchBar value={query} onChange={setQuery} />

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_TILES.map((config) => (
              <StatTile
                key={config.label}
                label={config.label}
                value={statValue(config, statsQuery.data, isEmpty)}
              />
            ))}
          </div>

          {isEmpty ? (
            <EmptyFeed />
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
              <LiveFeed feed={filteredFeed} query={query} />
              <Sidebar collectors={collectors} trending={trending} />
            </div>
          )}
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex h-[52px] items-center gap-3 rounded-[14px] border border-[var(--l-input-border)] bg-white px-[18px]">
      <SearchIcon size={18} className="shrink-0 text-content-secondary" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label="Search"
        className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--l-input-placeholder)]"
      />
    </div>
  );
}

function LiveFeed({ feed, query }: { feed: MintFeedItem[]; query: string }) {
  return (
    <div>
      <FeedHeading live />
      {feed.length === 0 ? (
        <div className={`px-6 py-12 text-center text-sm text-content-secondary ${LIST_CARD_CLASSES}`}>
          No results for “{query.trim()}”.
        </div>
      ) : (
        <div className={`overflow-hidden ${LIST_CARD_CLASSES}`}>
          {feed.map((item) => (
            <MintRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedHeading({ live }: { live: boolean }) {
  return (
    <div className="mb-3.5 flex items-center gap-2">
      <span
        className={`h-[7px] w-[7px] rounded-full ${live ? 'bg-green-500' : 'bg-content-disabled'}`}
      />
      <div className={SECTION_HEADING_CLASSES}>Live mint feed</div>
    </div>
  );
}

function MintRow({ item }: { item: MintFeedItem }) {
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
      <div
        className="grid h-11 w-11 place-items-center rounded-[11px] font-mono text-xs font-bold text-white"
        style={{ background: TOKEN_GRADIENTS[item.gradient] }}
      >
        {editionLabel(item.editionNumber)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-tight">
          {item.handle} minted {item.topic}
        </div>
        <div className="mt-1 truncate font-mono text-xs text-content-secondary">
          {item.club} · {item.timeAgo}
        </div>
      </div>
      <a
        href={`${EXPLORER_TX_URL}${item.txHash}`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 font-mono text-xs text-blue-500 transition hover:text-blue-600"
      >
        {truncateHash(item.txHash)}
        <ExternalLinkIcon size={12} />
      </a>
    </div>
  );
}

function Sidebar({
  collectors,
  trending,
}: {
  collectors: Collector[];
  trending: TrendingTopic[];
}) {
  return (
    <div>
      <div className={`mb-3.5 ${SECTION_HEADING_CLASSES}`}>Top collectors</div>
      <div className={`px-4 py-2 ${LIST_CARD_CLASSES}`}>
        {collectors.map((collector) => (
          <CollectorRow key={collector.handle} collector={collector} />
        ))}
      </div>

      <div className={`mb-3.5 mt-[22px] ${SECTION_HEADING_CLASSES}`}>Trending topics</div>
      <div className="flex flex-wrap gap-2">
        {trending.map((topic) => (
          <span
            key={topic.topic}
            className="rounded-full bg-card-filled px-3.5 py-2 text-[13px] font-semibold"
          >
            {topic.topic}
          </span>
        ))}
      </div>
    </div>
  );
}

function CollectorRow({ collector }: { collector: Collector }) {
  const rankColor = collector.rank === 1 ? 'text-yellow-600' : 'text-content-secondary';
  return (
    <div className="grid grid-cols-[20px_1fr_auto] items-center gap-3 border-b border-line py-[11px] last:border-b-0">
      <span className={`font-mono text-[13px] font-bold ${rankColor}`}>{collector.rank}</span>
      <div className="truncate text-[13px] font-semibold">{collector.handle}</div>
      <span className="font-mono text-[13px] font-bold tabular-nums">{collector.tokens}</span>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="mt-7">
      <FeedHeading live={false} />
      <div
        className={`flex flex-col items-center px-10 py-14 text-center ${LIST_CARD_CLASSES}`}
      >
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-card bg-card-filled text-content-secondary">
          <QrIcon size={26} strokeWidth={1.6} />
        </div>
        <h3 className="mb-2 text-[19px] font-semibold leading-[26px]">No tokens minted yet</h3>
        <p className="mb-6 max-w-[42ch] text-sm leading-[21px] text-content-secondary">
          Once a club runs its first meeting, every check-in will stream in here in real time —
          collector, topic, and transaction.
        </p>
        <div className="flex w-full max-w-[560px] flex-col gap-px opacity-[0.55]">
          {GHOST_ROWS.map((row) => (
            <GhostRow key={row.primary} primary={row.primary} secondary={row.secondary} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GhostRow({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="grid grid-cols-[44px_1fr_90px] items-center gap-3.5 border-t border-line py-3">
      <div className="h-11 w-11 rounded-[11px] bg-card-filled" />
      <div className="flex flex-col gap-[7px]">
        <div className="h-[9px] rounded-full bg-card-filled" style={{ width: primary }} />
        <div className="h-2 rounded-full bg-card-filled" style={{ width: secondary }} />
      </div>
      <div className="h-[9px] rounded-full bg-card-filled" />
    </div>
  );
}
