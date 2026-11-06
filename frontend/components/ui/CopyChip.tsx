'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/cn';

export interface CopyChipProps {
  value: string;
  display?: string;
  className?: string;
}

const COPIED_RESET_MS = 1500;
const IDLE_LABEL = 'Copy';
const COPIED_LABEL = 'Copied!';

export default function CopyChip({ value, display, className }: CopyChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch(() => undefined);
  }, [value]);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded border border-line bg-canvas px-3 py-2 font-mono text-xs text-content-secondary',
        className,
      )}
    >
      <span className="truncate">{display ?? value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-3 shrink-0 rounded-sm border border-line-strong text-content text-[10px] px-2.5 py-1 transition-colors hover:bg-line"
      >
        {copied ? COPIED_LABEL : IDLE_LABEL}
      </button>
    </div>
  );
}
