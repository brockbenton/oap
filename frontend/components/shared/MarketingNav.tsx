'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Brand from '@/components/shared/Brand';
import { Button } from '@/components/ui';

interface MarketingNavItem {
  label: string;
  href: string;
}

const HOME_ROUTE = '/';
const EXPLORE_ROUTE = '/explore';
const LAUNCH_LABEL = 'Launch app';
const OPEN_LABEL = 'Open app';

const NAV_ITEMS: MarketingNavItem[] = [
  { label: 'Protocol', href: '/#protocol' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Docs', href: '/docs' },
];

const NAV_ITEM_CLASSES = 'px-3.5 py-2 text-sm text-content-secondary transition hover:text-ink';

export default function MarketingNav() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  // Signed-in members jump straight to the app (the root switch renders their Home);
  // logged-out visitors go through Privy login first. "Explore" is public — no auth.
  const launchApp = () => {
    if (authenticated) router.push(HOME_ROUTE);
    else login();
  };

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center px-6">
        <Brand href={HOME_ROUTE} />
        <nav className="ml-11 flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={NAV_ITEM_CLASSES}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href={EXPLORE_ROUTE}>
            <Button variant="ghost">Explore</Button>
          </Link>
          <Button variant="primary" onClick={launchApp} disabled={!ready}>
            {authenticated ? OPEN_LABEL : LAUNCH_LABEL}
          </Button>
        </div>
      </div>
    </header>
  );
}
