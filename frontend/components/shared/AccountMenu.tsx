'use client';

import type { ComponentType } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePrivy, getIdentityToken, useWallets } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getAdminMe } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden } from '@/lib/api/client';
import { useProfile } from '@/hooks/useProfile';
import { shortenAddress } from '@/lib/address';
import { Avatar, Badge, Button, CopyChip } from '@/components/ui';
import type { IconProps } from '@/components/ui/icons';
import {
  ChevronDown,
  ExternalLinkIcon,
  GearIcon,
  GridIcon,
  SignOutIcon,
  UserIcon,
  WalletIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

// Level + club are display-only samples (gamification isn't wired yet).
const SAMPLE_LEVEL = 6;
const SAMPLE_CLUB = 'Blockchain Club';

const TRIGGER_AVATAR_SIZE = 32;
const HEADER_AVATAR_SIZE = 44;
const TRIGGER_CHEVRON_SIZE = 14;
const MENU_ICON_SIZE = 17;

type MenuIcon = ComponentType<IconProps>;

interface MenuItem {
  label: string;
  href: string;
  Icon: MenuIcon;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Profile', href: '/settings#profile', Icon: UserIcon },
  { label: 'Wallet & keys', href: '/wallet', Icon: WalletIcon },
  { label: 'Settings', href: '/settings', Icon: GearIcon },
  { label: 'Help & docs', href: '/docs', Icon: ExternalLinkIcon },
  { label: 'Admin dashboard', href: '/admin', Icon: GridIcon, adminOnly: true },
];

const MENU_ITEM_BASE =
  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors';
const MENU_ITEM_DEFAULT = 'text-ink hover:bg-card-filled';
const MENU_ITEM_DESTRUCTIVE = 'text-status-neg hover:bg-status-neg-bg';

// Compact account control: a single avatar button that opens a dropdown, so the
// top bar never crowds on mobile. The "Admin dashboard" item only appears for
// wallets that actually hold the on-chain ADMIN_ROLE (probed via /admin/me).
export default function AccountMenu() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const address = wallets.find((w) => w.walletClientType === 'privy')?.address ?? user?.wallet?.address;
  const { data: profile } = useProfile();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const { data: me } = useQuery({
    queryKey: queryKeys.adminMe(user?.id),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminMe(token);
    },
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
    staleTime: 0,
    gcTime: 0,
  });

  if (!ready) {
    return (
      <Button variant="primary" size="sm" disabled>
        Loading…
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button variant="primary" size="sm" onClick={login}>
        Sign in
      </Button>
    );
  }

  const displayName = profile?.username ?? (address ? shortenAddress(address) : 'Account');
  const avatarSeed = address ?? user?.id ?? 'account';
  const avatarColor = profile?.avatarColor ?? undefined;
  const items = MENU_ITEMS.filter((item) => !item.adminOnly || me?.isAdmin);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-card-filled py-[3px] pl-[3px] pr-1.5 transition hover:brightness-95"
      >
        <Avatar seed={avatarSeed} label={displayName} colorIndex={avatarColor} size={TRIGGER_AVATAR_SIZE} />
        <ChevronDown size={TRIGGER_CHEVRON_SIZE} className="text-content-secondary" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-[280px] overflow-hidden rounded-card border border-line bg-white shadow-elev-md"
        >
          <div className="border-b border-line p-4">
            <div className="mb-3 flex items-center gap-3">
              <Avatar seed={avatarSeed} label={displayName} colorIndex={avatarColor} size={HEADER_AVATAR_SIZE} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-semibold text-ink">{displayName}</span>
                  <Badge tone="rew">LVL {SAMPLE_LEVEL}</Badge>
                </div>
                <div className="mt-[5px] font-mono text-xs font-medium text-content-secondary">
                  {SAMPLE_CLUB}
                </div>
              </div>
            </div>
            {address && <CopyChip value={address} display={shortenAddress(address)} />}
          </div>

          <div className="p-2">
            {items.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(MENU_ITEM_BASE, MENU_ITEM_DEFAULT)}
              >
                <Icon size={MENU_ICON_SIZE} className="shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
            <div className="mx-1 my-1.5 h-px bg-line" />
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={cn(MENU_ITEM_BASE, MENU_ITEM_DESTRUCTIVE)}
            >
              <SignOutIcon size={MENU_ICON_SIZE} className="shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
