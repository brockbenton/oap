'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import MemberTopNav from '@/components/shared/MemberTopNav';
import MobileTabBar from '@/components/shared/MobileTabBar';
import { useDisplayName, useEmbeddedAddress, useProfile } from '@/hooks/useProfile';
import { getPersonalStats } from '@/lib/api/members';
import { queryKeys } from '@/lib/api/queryKeys';
import { shortenAddress } from '@/lib/address';
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

// Single-club deployment: there is no clubs backend, so the name is a label.
const CLUB_NAME = 'Blockchain Club';
const STAT_PLACEHOLDER = '—';

interface ProfileStat {
  label: string;
  value: string;
  accent?: boolean;
}

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

export default function AccountPage() {
  const { logout } = usePrivy();
  const address = useEmbeddedAddress();
  const displayName = useDisplayName();
  const { data: profile } = useProfile();
  const avatarColor = profile?.avatarColor ?? undefined;

  const { data: stats } = useQuery({
    queryKey: queryKeys.memberStats(address ?? ''),
    queryFn: () => getPersonalStats(address!),
    enabled: !!address,
  });

  const statValue = (value: number | undefined): string =>
    value === undefined ? STAT_PLACEHOLDER : `${value}`;

  const profileStats: ProfileStat[] = [
    { label: 'Tokens', value: statValue(stats?.tokensEarned) },
    { label: 'Streak', value: statValue(stats?.currentStreak), accent: true },
    {
      label: 'Attendance',
      value: stats ? `${stats.allTimeAttendancePct}%` : STAT_PLACEHOLDER,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfc]">
      <MemberTopNav />

      <main className="flex-1 px-5 pb-24 pt-6 sm:pb-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <Avatar
              seed={address ?? displayName}
              label={displayName}
              colorIndex={avatarColor}
              size={AVATAR_SIZE}
              className="mb-3.5 shadow-[0_8px_24px_rgba(104,51,255,0.35)]"
            />
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[20px] font-semibold leading-none tracking-[-0.3px]">{displayName}</span>
              {stats && <Badge tone="rew">{stats.statusTier}</Badge>}
            </div>
            <div className="font-mono text-xs font-medium text-content-secondary">
              {stats?.currentSemester ? `${CLUB_NAME} · ${stats.currentSemester}` : CLUB_NAME}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2.5">
            {profileStats.map((stat) => (
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

          {address && (
            <CopyChip
              value={address}
              display={shortenAddress(address)}
              className="mb-4 rounded-[12px] px-3.5 py-3"
            />
          )}

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
