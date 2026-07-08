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

const NAV_ITEMS: MarketingNavItem[] = [
  { label: 'Protocol', href: '/#protocol' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Explore', href: '/explore' },
  { label: 'Docs', href: '/docs' },
];

const NAV_ITEM_CLASSES = 'px-3.5 py-2 text-sm text-content-secondary transition hover:text-ink';

export default function MarketingNav() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  // "Launch app" takes signed-in members to the root switch (their Home);
  // everyone else is sent through Privy login first.
  const launchApp = () => {
    if (authenticated) router.push(HOME_ROUTE);
    else login();
  };

  return (
    <header className="flex h-16 items-center px-7">
      <Brand href={HOME_ROUTE} />
      <nav className="ml-11 flex items-center gap-1.5">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={NAV_ITEM_CLASSES}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <Button variant="ghost" onClick={login} disabled={!ready}>
          Sign in
        </Button>
        <Button variant="primary" onClick={launchApp} disabled={!ready}>
          Launch app
        </Button>
      </div>
    </header>
  );
}
