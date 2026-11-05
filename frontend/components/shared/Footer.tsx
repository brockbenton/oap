import Link from 'next/link';
import Brand from '@/components/shared/Brand';
import PageContainer from '@/components/shared/PageContainer';
import { CONTRACT_EXPLORER_URL, GITHUB_URL } from '@/lib/constants';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const HOME_ROUTE = '/';
const TAGLINE = 'Your club, onchain';
const NETWORK_NOTE = 'Running on Base Sepolia · testnet';
const COPYRIGHT = '© 2026 Onchain Club Protocol';

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'GitHub', href: GITHUB_URL, external: true },
      { label: 'Basescan', href: CONTRACT_EXPLORER_URL, external: true },
    ],
  },
];

const LINK_CLASSES = 'text-sm text-content transition-colors hover:text-content-secondary';
const HEADING_CLASSES = 'mb-3 font-mono text-xs text-content-secondary';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <PageContainer className="py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Brand href={HOME_ROUTE} />
            <p className="mt-3 text-sm text-content-secondary">{TAGLINE}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <div className={HEADING_CLASSES}>{column.heading}</div>
                <ul className="space-y-2.5">
                  {column.links.map((link) =>
                    link.external ? (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK_CLASSES}
                        >
                          {link.label}
                        </a>
                      </li>
                    ) : (
                      <li key={link.label}>
                        <Link href={link.href} className={LINK_CLASSES}>
                          {link.label}
                        </Link>
                      </li>
                    ),
                  )}
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
