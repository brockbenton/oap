'use client';

import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';

type OrganizerNavKey = 'overview' | 'meetings' | 'members' | 'settings';

export interface OrganizerTopNavProps {
  active?: OrganizerNavKey;
}

interface OrganizerNavItem {
  key: OrganizerNavKey;
  label: string;
  href: string;
}

const ROOT_ROUTE = '/organizer';

const NAV_ITEMS: OrganizerNavItem[] = [
  { key: 'overview', label: 'Overview', href: ROOT_ROUTE },
  { key: 'meetings', label: 'Meetings', href: `${ROOT_ROUTE}/meetings` },
  { key: 'members', label: 'Members', href: `${ROOT_ROUTE}/members` },
  { key: 'settings', label: 'Settings', href: `${ROOT_ROUTE}/settings` },
];

const NAV_ITEM_BASE = 'rounded-md px-3.5 py-2 text-sm transition';
const NAV_ITEM_ACTIVE = 'bg-[rgba(1,3,4,0.06)] font-semibold text-ink';
const NAV_ITEM_INACTIVE = 'text-content-secondary hover:text-ink';
const ORGANIZER_BADGE =
  'ml-3.5 rounded-sm bg-status-rew-bg px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-status-rew';

const AVATAR_SEED = 'organizer';
const AVATAR_LABEL = 'MK';
const AVATAR_SIZE = 34;

export default function OrganizerTopNav({ active }: OrganizerTopNavProps) {
  return (
    <header className="flex h-16 items-center px-7 bg-white border-b border-line">
      <Brand href={ROOT_ROUTE} />
      <span className={ORGANIZER_BADGE}>ORGANIZER</span>
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
      <div className="ml-auto flex items-center">
        <Avatar seed={AVATAR_SEED} label={AVATAR_LABEL} size={AVATAR_SIZE} />
      </div>
    </header>
  );
}
