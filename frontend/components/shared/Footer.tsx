import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import PageContainer from '@/components/shared/PageContainer';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const HOME_ROUTE = '/';
const TAGLINE = 'Proof you showed up. Onchain.';
const NETWORK_NOTE = 'Running on Base Sepolia · testnet';
const COPYRIGHT = '© 2026 OAP';

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Clubs', href: '/clubs' },
      { label: 'Explore', href: '/explore' },
      { label: 'Protocol', href: '/#protocol' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'GitHub', href: '#' },
      { label: 'Basescan', href: '#' },
    ],
  },
];

const LINK_CLASSES = 'text-sm text-ink transition hover:text-content-secondary';
const HEADING_CLASSES = 'mb-3 font-mono text-xs uppercase tracking-[0.06em] text-content-secondary';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <PageContainer className="py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Brand href={HOME_ROUTE} />
            <p className="mt-3 text-sm text-content-secondary">{TAGLINE}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-status-info-bg px-3 py-1 text-xs font-semibold text-blue-600">
              <span className="h-[7px] w-[7px] rounded-full bg-blue-500" />
              Built on Base
            </span>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <div className={HEADING_CLASSES}>{column.heading}</div>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={LINK_CLASSES}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 font-mono text-xs text-content-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>{COPYRIGHT}</span>
          <span>{NETWORK_NOTE}</span>
        </div>
      </PageContainer>
    </footer>
  );
}
