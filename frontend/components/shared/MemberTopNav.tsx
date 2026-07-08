'use client';

import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import AccountMenu from '@/components/shared/AccountMenu';
import { cn } from '@/lib/cn';

type MemberNavKey = 'home' | 'vault' | 'leaderboard' | 'rewards';

export interface MemberTopNavProps {
  active?: MemberNavKey;
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

export default function MemberTopNav({ active }: MemberTopNavProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center px-6">
        <Brand href={ROUTES.home} />
        <nav className="ml-8 hidden items-center gap-1 md:flex">
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
        <div className="ml-auto flex items-center">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
