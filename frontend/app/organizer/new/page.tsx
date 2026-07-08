'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OrganizerTopNav from '@/components/shared/OrganizerTopNav';
import PageContainer from '@/components/shared/PageContainer';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';

const STEP_EYEBROW = 'Step 1 of 2 · Basics';
const HEADING = 'Create your club';
const SUBCOPY = 'Set the basics — you can invite members and run your first meeting right after.';

const HANDLE_PREFIX = 'oap.xyz/c/';
const CATEGORY_OPTIONS = ['University', 'DAO', 'Meetup'] as const;
const CHAIN_LABEL = 'Base';
const CHAIN_TAG = 'default';

const LOGO_TITLE = 'Club logo';
const LOGO_HINT = "PNG or SVG, at least 256×256. Optional — we'll generate one.";

const NEXT_ROUTE = '/organizer';

// Club metadata isn't persisted here — the backend has no clubs surface; Continue is a router
// action only. These sample defaults mirror the design frame.
const SAMPLE_CLUB = {
  name: 'Blockchain Club',
  handle: 'blockchain-club',
  description: 'Weekly meetings on everything Ethereum — from Solidity to ZK. Beginners welcome.',
  category: CATEGORY_OPTIONS[0] as string,
};

const LABEL_CLASS = 'mb-2 block text-[13px] font-semibold text-ink';
const FIELD_SHELL = 'flex h-12 items-center rounded-md border border-[var(--l-input-border)] px-4 text-[15px]';

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState(SAMPLE_CLUB.name);
  const [handle, setHandle] = useState(SAMPLE_CLUB.handle);
  const [description, setDescription] = useState(SAMPLE_CLUB.description);
  const [category, setCategory] = useState(SAMPLE_CLUB.category);

  return (
    <div className="min-h-screen bg-[#fbfbfc]">
      <OrganizerTopNav />

      <PageContainer className="flex justify-center py-11">
        <div className="w-full max-w-[600px]">
          <div className="mb-2.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-status-neutral">
            {STEP_EYEBROW}
          </div>
          <h1 className="mb-2 text-[30px] font-semibold leading-9 tracking-[-1px] text-ink">{HEADING}</h1>
          <p className="mb-8 text-[15px] leading-[22px] text-content-secondary">{SUBCOPY}</p>

          <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
            <div className="flex items-center gap-5">
              <div className="grid h-[76px] w-[76px] flex-none place-items-center rounded-tile border-[1.5px] border-dashed border-line-strong text-content-secondary">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <div>
                <div className="mb-1 text-sm font-semibold leading-tight text-ink">{LOGO_TITLE}</div>
                <div className="text-[13px] leading-[18px] text-content-secondary">{LOGO_HINT}</div>
              </div>
            </div>

            <div>
              <label htmlFor="club-name" className={LABEL_CLASS}>
                Club name
              </label>
              <Input
                id="club-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="club-handle" className={LABEL_CLASS}>
                Handle
              </label>
              <div className={`${FIELD_SHELL} bg-white focus-within:border-ink`}>
                <span className="text-content-secondary">{HANDLE_PREFIX}</span>
                <input
                  id="club-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="flex-1 bg-transparent text-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="club-description" className={LABEL_CLASS}>
                Description
              </label>
              <Textarea
                id="club-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="club-category" className={LABEL_CLASS}>
                  Category
                </label>
                <Select
                  id="club-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className={LABEL_CLASS}>Chain</div>
                <div className={`${FIELD_SHELL} gap-2.5 bg-[rgba(1,3,4,0.04)] text-ink`}>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-500 font-mono text-[10px] font-bold text-white">
                    B
                  </span>
                  {CHAIN_LABEL}
                  <span className="ml-auto font-mono text-xs font-medium text-content-secondary">
                    {CHAIN_TAG}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-12 px-6 text-[15px]"
                onClick={() => router.push(NEXT_ROUTE)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="h-12 px-7 text-[15px]"
                onClick={() => router.push(NEXT_ROUTE)}
              >
                Continue
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}
