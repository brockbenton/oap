import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'info' | 'pos' | 'warn' | 'neg' | 'rew' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const BASE_CLASSES =
  'inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold';

const TONE_CLASSES: Record<BadgeTone, string> = {
  info: 'text-status-info bg-status-info-bg',
  pos: 'text-status-pos bg-status-pos-bg',
  warn: 'text-status-warn bg-status-warn-bg',
  neg: 'text-status-neg bg-status-neg-bg',
  rew: 'text-status-rew bg-status-rew-bg',
  neutral: 'text-status-neutral bg-status-neutral-bg',
};

export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cn(BASE_CLASSES, TONE_CLASSES[tone], className)}>{children}</span>;
}
