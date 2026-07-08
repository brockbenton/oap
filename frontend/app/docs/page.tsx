'use client';

import { useCallback, useState } from 'react';
import MarketingNav from '@/components/shared/MarketingNav';
import { SearchIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

interface TocItem {
  label: string;
  active?: boolean;
}

interface TocSection {
  title: string;
  items: TocItem[];
}

interface CodeSegment {
  text: string;
  className?: string;
}

const SECTION_IDS = {
  createClub: 'create-your-club',
  openMeeting: 'open-a-meeting',
  membersCheckIn: 'members-check-in',
} as const;

const TOC_SECTIONS: TocSection[] = [
  {
    title: 'Getting started',
    items: [{ label: 'Quickstart', active: true }, { label: 'What is OAP?' }, { label: 'Core concepts' }],
  },
  {
    title: 'For organizers',
    items: [{ label: 'Create a club' }, { label: 'Run a meeting' }, { label: 'Rewards & levels' }],
  },
  {
    title: 'Developers',
    items: [{ label: 'Smart contracts' }, { label: 'REST API' }, { label: 'Webhooks' }],
  },
];

const ON_THIS_PAGE: { label: string; href: string; active?: boolean }[] = [
  { label: 'Create your club', href: `#${SECTION_IDS.createClub}`, active: true },
  { label: 'Open a meeting', href: `#${SECTION_IDS.openMeeting}` },
  { label: 'Members check in', href: `#${SECTION_IDS.membersCheckIn}` },
];

const CODE_COMMENT = 'text-[#90A2BA]';
const CODE_STRING_CYAN = 'text-cyan';
const CODE_STRING_LIME = 'text-lime-500';

const CODE_LINES: CodeSegment[][] = [
  [{ text: '# open a meeting and print the QR url', className: CODE_COMMENT }],
  [{ text: 'curl -X POST https://api.oap.xyz/v1/meetings \\' }],
  [
    { text: '  -H ' },
    { text: '"Authorization: Bearer $OAP_KEY"', className: CODE_STRING_CYAN },
    { text: ' \\' },
  ],
  [
    { text: '  -d ' },
    { text: `'{ "club": "blockchain-club", "topic": "MEV & Flashbots" }'`, className: CODE_STRING_LIME },
  ],
];

const CODE_COPY_TEXT = CODE_LINES.map((line) => line.map((seg) => seg.text).join('')).join('\n');

const COPIED_RESET_MS = 1500;
const COPY_IDLE_LABEL = 'Copy';
const COPY_DONE_LABEL = 'Copied!';

const SECTION_LABEL_CLASSES =
  'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-content-secondary';
const HEADING_CLASSES = 'mb-2.5 text-[18px] font-semibold leading-[24px]';
const BODY_TEXT_CLASSES = 'max-w-[60ch] text-[15px] leading-[24px] text-content-secondary';

export default function DocsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(CODE_COPY_TEXT)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto max-w-[1180px]">
          <MarketingNav />
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 lg:min-h-[560px] lg:grid-cols-[240px_1fr_200px]">
        <aside className="hidden px-5 py-7 lg:block lg:border-r lg:border-line">
          <div className="mb-[22px] flex h-[38px] items-center gap-2 rounded-md border border-line px-3">
            <SearchIcon size={14} className="text-content-secondary" />
            <span className="text-[13px] text-content-disabled">Search docs</span>
          </div>

          {TOC_SECTIONS.map((section, i) => (
            <div key={section.title} className={cn('flex flex-col gap-0.5', i < TOC_SECTIONS.length - 1 && 'mb-[22px]')}>
              <div className={cn(SECTION_LABEL_CLASSES, 'mb-2.5')}>{section.title}</div>
              {section.items.map((item) => (
                <span
                  key={item.label}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'px-2.5 py-[7px] text-[13px]',
                    item.active
                      ? 'rounded-[8px] bg-card-filled font-semibold text-ink'
                      : 'font-medium text-content-secondary',
                  )}
                >
                  {item.label}
                </span>
              ))}
            </div>
          ))}
        </aside>

        <article className="px-6 py-8 lg:px-11 lg:py-10">
          <div className="mb-3 font-mono text-[12px] text-content-secondary">Getting started&nbsp; /&nbsp; Quickstart</div>
          <h2 className="mb-3.5 text-[34px] font-semibold leading-[40px] tracking-[-1px]">Quickstart</h2>
          <p className="mb-7 max-w-[60ch] text-[16px] leading-[26px] text-content-secondary [text-wrap:pretty]">
            Get your club minting attendance tokens in about five minutes. You&apos;ll create a club, open your
            first meeting, and watch members check in.
          </p>

          <h3 id={SECTION_IDS.createClub} className={cn(HEADING_CLASSES, 'scroll-mt-24')}>
            1. Create your club
          </h3>
          <p className={cn(BODY_TEXT_CLASSES, 'mb-5')}>
            Head to{' '}
            <span className="rounded-sm bg-card-filled px-1.5 py-0.5 font-mono text-[14px] font-medium">
              Clubs → Start a club
            </span>
            . Name it, add a logo, and you&apos;re live. No wallet required — we provision one for you.
          </p>

          <h3 id={SECTION_IDS.openMeeting} className={cn(HEADING_CLASSES, 'scroll-mt-24')}>
            2. Open a meeting
          </h3>
          <p className={cn(BODY_TEXT_CLASSES, 'mb-4')}>
            Start a session from your dashboard, or call the API to generate a check-in code programmatically:
          </p>

          <div className="mb-[22px] overflow-hidden rounded-[12px] border border-line">
            <div className="flex items-center justify-between border-b border-line bg-gray-50 px-3.5 py-2">
              <span className="font-mono text-[11px] font-medium text-content-secondary">bash</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-blue-500"
              >
                {copied ? COPY_DONE_LABEL : COPY_IDLE_LABEL}
              </button>
            </div>
            <pre className="m-0 overflow-auto bg-[#0b0f16] px-[18px] py-4 font-mono text-[13px] font-medium leading-[22px] text-gray-100">
              <code>
                {CODE_LINES.map((line, li) => (
                  <span key={li}>
                    {line.map((seg, si) => (
                      <span key={si} className={seg.className}>
                        {seg.text}
                      </span>
                    ))}
                    {li < CODE_LINES.length - 1 ? '\n' : null}
                  </span>
                ))}
              </code>
            </pre>
          </div>

          <div className="mb-[22px] flex gap-3.5 rounded-[12px] bg-status-info-bg px-[18px] py-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="mt-px shrink-0 text-blue-600"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v.01M11 12h1v4h1" />
            </svg>
            <div className="text-[14px] leading-[21px] text-blue-700">
              Meeting codes expire automatically at the end of the session, so a screenshot can&apos;t be reused
              next week.
            </div>
          </div>

          <h3 id={SECTION_IDS.membersCheckIn} className={cn(HEADING_CLASSES, 'scroll-mt-24')}>
            3. Members check in
          </h3>
          <p className={BODY_TEXT_CLASSES}>
            Project the QR. Members scan, sign in with email or Google, and their token is minted onchain — gas
            covered by your club&apos;s sponsored relayer.
          </p>
        </article>

        <aside className="hidden px-5 py-10 lg:block lg:border-l lg:border-line">
          <div className={cn(SECTION_LABEL_CLASSES, 'mb-3.5')}>On this page</div>
          <div className="flex flex-col gap-2.5">
            {ON_THIS_PAGE.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className={cn(
                  'text-[13px] leading-[1.3]',
                  anchor.active
                    ? 'border-l-2 border-ink pl-2.5 font-semibold text-ink'
                    : 'pl-3 font-medium text-content-secondary transition hover:text-ink',
                )}
              >
                {anchor.label}
              </a>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
