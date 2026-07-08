'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import { Avatar, Badge, CopyChip } from '@/components/ui';
import type { IconProps } from '@/components/ui/icons';
import {
  ChevronRight,
  ExternalLinkIcon,
  GearIcon,
  SignOutIcon,
  WalletIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const AVATAR_SIZE = 80;
const MENU_ICON_SIZE = 18;
const CHEVRON_SIZE = 16;
const ADDRESS_PREFIX_LEN = 6;
const ADDRESS_SUFFIX_LEN = 4;

// Handle, level and stats are display-only samples until the profile API lands.
const HANDLE = 'alex.eth';
const LEVEL = 6;
const CLUB_LINE = "Blockchain Club · since Sep '25";
const SAMPLE_WALLET_ADDRESS = '0x8f2ab9d1e6403f7c25a8e0d4b1f963072ac5c21e';

interface ProfileStat {
  label: string;
  value: string;
  accent?: boolean;
}

const STATS: ProfileStat[] = [
  { label: 'Tokens', value: '23' },
  { label: 'Streak', value: '7', accent: true },
  { label: 'Rank', value: '#5' },
];

interface MenuLink {
  label: string;
  href: string;
  Icon: ComponentType<IconProps>;
}

const MENU_LINKS: MenuLink[] = [
  { label: 'Wallet & keys', href: '/wallet', Icon: WalletIcon },
  { label: 'Settings', href: '/settings', Icon: GearIcon },
  { label: 'Help & docs', href: '/docs', Icon: ExternalLinkIcon },
];

const MENU_ROW = 'flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium';

function shortenAddress(address: string): string {
  return `${address.slice(0, ADDRESS_PREFIX_LEN)}…${address.slice(-ADDRESS_SUFFIX_LEN)}`;
}

export default function AccountPage() {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();

  const address = (
    wallets.find((w) => w.walletClientType === 'privy')?.address ?? user?.wallet?.address
  )?.toLowerCase();

  const walletValue = address ?? SAMPLE_WALLET_ADDRESS;

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfc]">
      <MemberTopNav />

      <main className="flex-1 px-5 pb-24 pt-6 sm:pb-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <Avatar
              seed={walletValue}
              label={HANDLE}
              size={AVATAR_SIZE}
              className="mb-3.5 shadow-[0_8px_24px_rgba(104,51,255,0.35)]"
            />
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[20px] font-semibold leading-none tracking-[-0.3px]">{HANDLE}</span>
              <Badge tone="rew">LVL {LEVEL}</Badge>
            </div>
            <div className="font-mono text-xs font-medium text-content-secondary">{CLUB_LINE}</div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-[14px] border border-line bg-white p-3.5 text-center">
                <div
                  className={cn(
                    'font-mono text-[20px] font-bold leading-none tabular-nums',
                    stat.accent && 'text-yellow-700',
                  )}
                >
                  {stat.value}
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-content-secondary">{stat.label}</div>
              </div>
            ))}
          </div>

          <CopyChip
            value={walletValue}
            display={shortenAddress(walletValue)}
            className="mb-4 rounded-[12px] px-3.5 py-3"
          />

          <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
            {MENU_LINKS.map(({ label, href, Icon }) => (
              <Link key={label} href={href} className={cn(MENU_ROW, 'text-ink')}>
                <Icon size={MENU_ICON_SIZE} />
                {label}
                <ChevronRight size={CHEVRON_SIZE} className="ml-auto text-content-disabled" />
              </Link>
            ))}
            <button type="button" onClick={() => logout()} className={cn(MENU_ROW, 'font-semibold text-status-neg')}>
              <SignOutIcon size={MENU_ICON_SIZE} />
              Sign out
            </button>
          </div>
        </div>
      </main>

      <MobileTabBar />
    </div>
  );
}
