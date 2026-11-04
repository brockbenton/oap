import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'info' | 'pos' | 'warn' | 'neg' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const BASE_CLASSES =
  'inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.08em]';

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: 'text-status-info bg-status-info-bg',
  pos: 'text-status-pos bg-status-pos-bg',
  warn: 'text-status-warn bg-status-warn-bg',
  neg: 'text-status-neg bg-status-neg-bg',
  neutral: 'text-status-neutral bg-status-neutral-bg',
};

export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cn(BASE_CLASSES, TONE_CLASSES[tone], className)}>{children}</span>;
}
