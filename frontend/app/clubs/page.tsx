'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { CheckIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import LoadError from '@/components/shared/LoadError';
import Footer from '@/components/shared/Footer';
import { useClubs } from '@/lib/mock/clubs';
import { avatarGradient, TOKEN_GRADIENTS } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';
import type { Club } from '@/types';

type ClubCategory = Club['category'];

interface ClubFilter {
  label: string;
  category: ClubCategory | null;
}

const FILTERS: ClubFilter[] = [
  { label: 'All', category: null },
  { label: 'Universities', category: 'University' },
  { label: 'DAOs', category: 'DAO' },
  { label: 'Meetups', category: 'Meetup' },
];

const TRUST_POINTS = ['Gas-free minting', 'No wallet setup', 'Runs on Base'];

const EMPTY_GLYPH = '◆';

function formatCompact(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
}

export default function ClubsPage() {
  const { data, isLoading, error, refetch } = useClubs();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTERS[0].label);

  const clubs = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const category = FILTERS.find((f) => f.label === activeFilter)?.category ?? null;
    const needle = query.trim().toLowerCase();
    return clubs.filter((club) => {
      const matchesCategory = category === null || club.category === category;
      const matchesQuery =
        needle === '' ||
        club.name.toLowerCase().includes(needle) ||
        club.org.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [clubs, activeFilter, query]);

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <MarketingNav />
      <PageContainer className="py-9">
        {isLoading ? (
          <LoadingGrid />
        ) : error ? (
          <LoadError what="clubs" onRetry={() => refetch()} />
        ) : clubs.length === 0 ? (
          <ClubsEmpty />
        ) : (
          <div className="animate-fade-in">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-1px]">
                  Clubs on OAP
                </h1>
                <p className="mt-2 text-[15px] leading-[22px] text-content-secondary">
                  {clubs.length} communities tracking attendance onchain.
                </p>
              </div>
              <Button variant="primary" className="h-11">
                <PlusIcon size={15} />
                Start a club
              </Button>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="flex h-[42px] w-full max-w-[340px] items-center gap-2.5 rounded-full border border-line bg-white px-4">
                <SearchIcon size={16} className="shrink-0 text-content-secondary" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clubs"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-content-disabled"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => {
                  const active = filter.label === activeFilter;
                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => setActiveFilter(filter.label)}
                      className={cn(
                        'rounded-full px-4 py-[9px] text-[13px] transition',
                        active
                          ? 'bg-ink font-semibold text-white'
                          : 'border border-line font-medium text-content-secondary hover:text-ink',
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-20 text-center text-sm text-content-secondary">
                No clubs match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
                <StartClubTile />
              </div>
            )}
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
}

function ClubCard({ club }: { club: Club }) {
  const stats = [
    { value: formatCompact(club.members), label: 'members' },
    { value: formatCompact(club.meetings), label: 'meetings' },
    { value: formatCompact(club.tokens), label: 'tokens' },
  ];

  return (
    <Card className="flex flex-col p-[22px] shadow-none">
      <div className="mb-4 flex items-center gap-3.5">
        <div
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[15px] text-[20px] font-bold text-white"
          style={{ background: avatarGradient(club.id) }}
        >
          {club.monogram}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold leading-tight">{club.name}</div>
          <div className="mt-[5px] truncate font-mono text-xs text-content-secondary">
            {club.joined ? `${club.org} · you're a member` : club.org}
          </div>
        </div>
      </div>
      <div className="mb-[18px] flex gap-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-mono text-[18px] font-bold leading-none tabular-nums">
              {stat.value}
            </div>
            <div className="mt-[5px] text-[11px] font-medium text-content-secondary">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <Button
        variant={club.joined ? 'outline' : 'primary'}
        size="sm"
        className="mt-auto h-10 w-full"
      >
        {club.joined ? 'Open club' : 'Join club'}
      </Button>
    </Card>
  );
}

function StartClubTile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-line-strong p-[22px] text-center text-content-secondary">
      <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-card-filled text-ink">
        <PlusIcon size={20} />
      </div>
      <div className="text-sm font-semibold leading-snug text-ink">Start your own club</div>
      <div className="text-xs leading-[17px]">Free to launch. Live in under 5 minutes.</div>
    </div>
  );
}

function ClubsEmpty() {
  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="mb-2 text-[32px] font-semibold leading-[38px] tracking-[-1px]">
          Clubs on OAP
        </h1>
        <p className="text-[15px] leading-[22px] text-content-secondary">
          No clubs are live yet — that&apos;s a good thing. Yours can be the first.
        </p>
      </div>
      <div className="flex flex-col items-center rounded-lg border border-line bg-card-filled px-10 py-16 text-center">
        <div
          className="mb-6 grid h-[72px] w-[72px] place-items-center rounded-lg text-[30px] font-bold text-white"
          style={{ background: TOKEN_GRADIENTS.blue, boxShadow: '0 12px 40px rgba(0,92,240,0.35)' }}
        >
          {EMPTY_GLYPH}
        </div>
        <h2 className="mb-2.5 text-2xl font-semibold leading-[30px] tracking-[-0.5px]">
          Start the first club
        </h2>
        <p className="mb-7 max-w-[44ch] text-[15px] leading-[23px] text-content-secondary">
          Create a club, open a meeting, and members mint their attendance tokens on the spot. Free
          to launch and live in under five minutes.
        </p>
        <div className="mb-9 flex flex-wrap justify-center gap-3">
          <Button variant="primary" className="h-[52px] px-7 text-[15px]">
            <PlusIcon size={16} />
            Start a club
          </Button>
          <Button variant="ghost" className="h-[52px] px-6 text-[15px]">
            Read the guide
          </Button>
        </div>
        <div className="flex w-full max-w-[560px] flex-wrap justify-center gap-8 border-t border-line pt-7">
          {TRUST_POINTS.map((point) => (
            <div
              key={point}
              className="flex items-center gap-2.5 text-[13px] font-medium leading-tight text-content-secondary"
            >
              <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-status-pos-bg text-green-600">
                <CheckIcon size={14} />
              </span>
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[184px] animate-pulse rounded-lg border border-line bg-white" />
      ))}
    </div>
  );
}
