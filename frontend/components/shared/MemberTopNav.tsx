'use client';

import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import AccountMenu from '@/components/shared/AccountMenu';
import RoleSwitch from '@/components/shared/RoleSwitch';
import { useAdminMe } from '@/hooks/useAdminMe';
import { cn } from '@/lib/cn';

type MemberNavKey = 'home' | 'vault' | 'leaderboard';

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
};

const NAV_ITEMS: MemberNavItem[] = [
  { key: 'home', label: 'Home', href: ROUTES.home },
  { key: 'vault', label: 'Vault', href: ROUTES.vault },
  { key: 'leaderboard', label: 'Leaderboard', href: ROUTES.leaderboard },
];

const NAV_ITEM_BASE = 'rounded-md px-3.5 py-2 text-sm transition';
const NAV_ITEM_ACTIVE = 'bg-raised font-medium text-content';
const NAV_ITEM_INACTIVE = 'text-content-secondary hover:text-content';

export default function MemberTopNav({ active }: MemberTopNavProps) {
  const { data: me } = useAdminMe();

  return (
    <header className="border-b border-line bg-canvas">
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
        <div className="ml-auto flex items-center gap-3">
          {me?.isAdmin && <RoleSwitch active="member" />}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
