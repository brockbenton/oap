'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import {
  GiftIcon,
  GridIcon,
  HomeIcon,
  QrIcon,
  TrophyIcon,
  type IconProps,
} from '@/components/ui/icons';

type MobileTabKey = 'home' | 'vault' | 'scan' | 'ranks' | 'rewards';

export interface MobileTabBarProps {
  active?: MobileTabKey;
}

interface MobileTabItem {
  key: MobileTabKey;
  label: string;
  href: string;
  Icon: ComponentType<IconProps>;
  center?: boolean;
}

const ROUTES: Record<MobileTabKey, string> = {
  home: '/',
  vault: '/vault',
  scan: '/check-in',
  ranks: '/leaderboard',
  rewards: '/rewards',
};

const TAB_ITEMS: MobileTabItem[] = [
  { key: 'home', label: 'Home', href: ROUTES.home, Icon: HomeIcon },
  { key: 'vault', label: 'Vault', href: ROUTES.vault, Icon: GridIcon },
  { key: 'scan', label: 'Scan', href: ROUTES.scan, Icon: QrIcon, center: true },
  { key: 'ranks', label: 'Ranks', href: ROUTES.ranks, Icon: TrophyIcon },
  { key: 'rewards', label: 'Rewards', href: ROUTES.rewards, Icon: GiftIcon },
];

const TAB_ICON_SIZE = 22;
const SCAN_ICON_SIZE = 24;

export default function MobileTabBar({ active }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 items-center border-t border-line bg-white px-2 sm:hidden">
      {TAB_ITEMS.map(({ key, label, href, Icon, center }) => {
        if (center) {
          return (
            <Link key={key} href={href} aria-label={label} className="flex justify-center">
              <span className="-translate-y-3 grid h-14 w-14 place-items-center rounded-full border-[3px] border-paper bg-ink text-cyan shadow-elev-md">
                <Icon size={SCAN_ICON_SIZE} />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1',
              active === key ? 'text-ink' : 'text-content-secondary',
            )}
          >
            <Icon size={TAB_ICON_SIZE} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
