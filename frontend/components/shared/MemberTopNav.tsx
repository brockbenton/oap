'use client';

import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import AccountMenu from '@/components/shared/AccountMenu';
import { cn } from '@/lib/cn';

type MemberNavKey = 'home' | 'vault' | 'leaderboard' | 'rewards';

export interface MemberTopNavProps {
  active?: MemberNavKey;
  streakWeeks?: number;
}

interface MemberNavItem {
  key: MemberNavKey;
  label: string;
  href: string;
}

const ROUTES: Record<MemberNavKey, string> = {
  home: '/',
  vault: '/vault',
  leaderboard: '/leaderboard',
  rewards: '/rewards',
};

const NAV_ITEMS: MemberNavItem[] = [
  { key: 'home', label: 'Home', href: ROUTES.home },
  { key: 'vault', label: 'Vault', href: ROUTES.vault },
  { key: 'leaderboard', label: 'Leaderboard', href: ROUTES.leaderboard },
  { key: 'rewards', label: 'Rewards', href: ROUTES.rewards },
];

const NAV_ITEM_BASE = 'rounded-md px-3.5 py-2 text-sm transition';
const NAV_ITEM_ACTIVE = 'bg-[rgba(1,3,4,0.06)] font-semibold text-ink';
const NAV_ITEM_INACTIVE = 'text-content-secondary hover:text-ink';
const STREAK_PILL =
  'inline-flex items-center gap-1.5 rounded-full bg-status-warn-bg px-3 py-1 font-mono text-xs font-semibold text-status-warn tabular-nums';
const STREAK_EMOJI = '🔥';

export default function MemberTopNav({ active, streakWeeks }: MemberTopNavProps) {
  return (
    <header className="flex h-16 items-center px-7 bg-white border-b border-line">
      <Brand href={ROUTES.home} />
      <nav className="ml-8 flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(NAV_ITEM_BASE, active === item.key ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3.5">
        {streakWeeks !== undefined && (
          <span className={STREAK_PILL}>
            {STREAK_EMOJI} {streakWeeks} wk
          </span>
        )}
        <AccountMenu />
      </div>
    </header>
  );
}
