'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Brand from '@/components/shared/Brand';
import { Button } from '@/components/ui';

interface MarketingNavItem {
  label: string;
  href: string;
}

const HOME_ROUTE = '/';

const NAV_ITEMS: MarketingNavItem[] = [
  { label: 'Protocol', href: '/protocol' },
  { label: 'Clubs', href: '/clubs' },
  { label: 'Explore', href: '/explore' },
  { label: 'Docs', href: '/docs' },
];

const NAV_ITEM_CLASSES = 'px-3.5 py-2 text-sm text-content-secondary transition hover:text-ink';

export default function MarketingNav() {
  const router = useRouter();

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
        <Button variant="ghost">Sign in</Button>
        <Button variant="primary" onClick={() => router.push(HOME_ROUTE)}>
          Launch app
        </Button>
      </div>
    </header>
  );
}
