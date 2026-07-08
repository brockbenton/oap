'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarketingNav from '@/components/shared/MarketingNav';
import Footer from '@/components/shared/Footer';
import { SearchIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { DOC_SECTIONS } from '@/lib/docs/content';
import type { DocBlock, DocSection, DocStatus } from '@/lib/docs/types';

const SCROLL_OFFSET_CLASS = 'scroll-mt-24';
const SECTION_LABEL_CLASSES =
  'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-content-secondary';
const COPIED_RESET_MS = 1500;

const STATUS_BADGES: Record<DocStatus, { label: string; className: string } | null> = {
  live: null,
  partial: { label: 'In progress', className: 'bg-amber-100 text-amber-700' },
  planned: { label: 'Planned', className: 'bg-gray-100 text-content-secondary' },
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const subId = (sectionId: string, text: string) => `${sectionId}__${slugify(text)}`;

function renderInline(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.length > 1 && part.startsWith('`') && part.endsWith('`') ? (
      <code
        key={i}
        className="rounded bg-card-filled px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-ink"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function DocsPage() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(DOC_SECTIONS[0]?.id ?? '');

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, DocSection[]>();
    for (const section of DOC_SECTIONS) {
      if (!byGroup.has(section.group)) {
        byGroup.set(section.group, []);
        order.push(section.group);
      }
      byGroup.get(section.group)!.push(section);
    }
    return order.map((title) => ({ title, sections: byGroup.get(title)! }));
  }, []);

  const subheadings = useMemo(() => {
    const map = new Map<string, { id: string; text: string }[]>();
    for (const section of DOC_SECTIONS) {
      map.set(
        section.id,
        section.blocks
          .filter((b) => b.type === 'subheading' && b.text)
          .map((b) => ({ id: subId(section.id, b.text as string), text: b.text as string })),
      );
    }
    return map;
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, sections: g.sections.filter((s) => s.title.toLowerCase().includes(q)) }))
      .filter((g) => g.sections.length > 0);
  }, [groups, query]);

  useEffect(() => {
    const els = DOC_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    // Bias the active line toward whatever sits just below the sticky nav.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  const onNavClick = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.preventDefault();
      scrollTo(id);
    },
    [scrollTo],
  );

  const activeSection = DOC_SECTIONS.find((s) => s.id === activeId) ?? DOC_SECTIONS[0];
  const onThisPage = subheadings.get(activeSection?.id ?? '') ?? [];

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 lg:min-h-[560px] lg:grid-cols-[240px_1fr_200px]">
        <aside className="hidden px-5 py-7 lg:block lg:border-r lg:border-line">
          <div className="mb-[22px] flex h-[38px] items-center gap-2 rounded-md border border-line px-3">
            <SearchIcon size={14} className="shrink-0 text-content-secondary" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search docs"
              aria-label="Search docs"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-content-disabled"
            />
          </div>

          {filteredGroups.length === 0 ? (
            <div className="px-2.5 text-[13px] text-content-secondary">No results.</div>
          ) : (
            filteredGroups.map((group, i) => (
              <div
                key={group.title}
                className={cn('flex flex-col gap-0.5', i < filteredGroups.length - 1 && 'mb-[22px]')}
              >
                <div className={cn(SECTION_LABEL_CLASSES, 'mb-2.5')}>{group.title}</div>
                {group.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => onNavClick(e, section.id)}
                    aria-current={section.id === activeId ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-[7px] text-[13px] transition',
                      section.id === activeId
                        ? 'rounded-[8px] bg-card-filled font-semibold text-ink'
                        : 'font-medium text-content-secondary hover:text-ink',
                    )}
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            ))
          )}
        </aside>

        <article className="px-6 py-8 lg:px-11 lg:py-10">
          {DOC_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={cn(SCROLL_OFFSET_CLASS, 'mb-14 last:mb-0')}
            >
              <div className="mb-2 font-mono text-[12px] text-content-secondary">{section.group}</div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-[30px] font-semibold leading-[36px] tracking-[-1px]">
                  {section.title}
                </h2>
                <StatusBadge status={section.status} />
              </div>
              <p className="mb-6 max-w-[68ch] text-[16px] leading-[26px] text-content-secondary [text-wrap:pretty]">
                {renderInline(section.lede)}
              </p>
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} sectionId={section.id} />
              ))}
            </section>
          ))}
        </article>

        <aside className="hidden px-5 py-10 lg:block lg:border-l lg:border-line">
          <div className="sticky top-24">
            <div className={cn(SECTION_LABEL_CLASSES, 'mb-3.5')}>On this page</div>
            {onThisPage.length === 0 ? (
              <div className="pl-3 text-[13px] text-content-secondary">{activeSection?.title}</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {onThisPage.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => onNavClick(e, item.id)}
                    className="pl-3 text-[13px] font-medium leading-[1.3] text-content-secondary transition hover:text-ink"
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
      <Footer />
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const badge = STATUS_BADGES[status];
  if (!badge) return null;
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}

const BODY_TEXT_CLASSES = 'max-w-[68ch] text-[15px] leading-[25px] text-content-secondary';

function Block({ block, sectionId }: { block: DocBlock; sectionId: string }) {
  switch (block.type) {
    case 'subheading':
      return (
        <h3
          id={subId(sectionId, block.text ?? '')}
          className={cn(SCROLL_OFFSET_CLASS, 'mb-2.5 mt-8 text-[18px] font-semibold leading-[24px]')}
        >
          {block.text}
        </h3>
      );
    case 'paragraph':
      return <p className={cn(BODY_TEXT_CLASSES, 'mb-4 [text-wrap:pretty]')}>{renderInline(block.text ?? '')}</p>;
    case 'bullets':
      return (
        <ul className={cn(BODY_TEXT_CLASSES, 'mb-4 list-disc space-y-1.5 pl-5')}>
          {(block.items ?? []).map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className={cn(BODY_TEXT_CLASSES, 'mb-4 list-decimal space-y-2 pl-5 marker:font-mono marker:text-content-secondary')}>
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="pl-1">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    case 'callout':
      return <Callout tone={block.tone ?? 'info'} text={block.text ?? ''} />;
    case 'code':
      return <CodeBlock language={block.language} code={block.code ?? ''} />;
    default:
      return null;
  }
}

function Callout({ tone, text }: { tone: 'info' | 'warn'; text: string }) {
  const info = tone === 'info';
  return (
    <div
      className={cn(
        'mb-[22px] flex gap-3.5 rounded-[12px] px-[18px] py-4 text-[14px] leading-[21px]',
        info ? 'bg-status-info-bg text-blue-700' : 'bg-amber-50 text-amber-800',
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={cn('mt-px shrink-0', info ? 'text-blue-600' : 'text-amber-600')}
      >
        <circle cx="12" cy="12" r="9" />
        {info ? <path d="M12 8v.01M11 12h1v4h1" /> : <path d="M12 8v4M12 16v.01" />}
      </svg>
      <div className="max-w-[64ch]">{renderInline(text)}</div>
    </div>
  );
}

function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = useCallback(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch(() => undefined);
  }, [code]);

  return (
    <div className="mb-[22px] overflow-hidden rounded-[12px] border border-line">
      <div className="flex items-center justify-between border-b border-line bg-gray-50 px-3.5 py-2">
        <span className="font-mono text-[11px] font-medium text-content-secondary">
          {language ?? 'text'}
        </span>
        <button type="button" onClick={onCopy} className="text-[11px] font-semibold text-blue-500">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-auto bg-[#0b0f16] px-[18px] py-4 font-mono text-[13px] font-medium leading-[22px] text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
