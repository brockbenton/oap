import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import Eyebrow from '@/components/ui/Eyebrow';
import ProgressBar from '@/components/ui/ProgressBar';

type DeltaTone = 'pos' | 'neg' | 'neutral';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  progress?: number;
  progressHint?: string;
  delta?: { text: string; tone: DeltaTone };
  hint?: string;
  className?: string;
}

const DELTA_TONE_CLASSES: Record<DeltaTone, string> = {
  pos: 'text-status-pos',
  neg: 'text-status-neg',
  neutral: 'text-content-secondary',
};

const DELTA_SYMBOL: Record<DeltaTone, string> = {
  pos: '▲',
  neg: '▼',
  neutral: '',
};

export default function StatTile({
  label,
  value,
  progress,
  progressHint,
  delta,
  hint,
  className,
}: StatTileProps) {
  return (
    <div className={cn('p-4 border border-line rounded bg-surface', className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2 font-mono text-3xl font-medium leading-none">{value}</div>
      {progress !== undefined && <ProgressBar value={progress} className="mt-3" />}
      {progressHint && (
        <div className="mt-1.5 font-mono text-xs text-content-secondary">{progressHint}</div>
      )}
      {delta && (
        <div className={cn('mt-2 font-mono text-xs', DELTA_TONE_CLASSES[delta.tone])}>
          {DELTA_SYMBOL[delta.tone] ? `${DELTA_SYMBOL[delta.tone]} ${delta.text}` : delta.text}
        </div>
      )}
      {hint && !delta && <div className="mt-2 text-xs text-content-secondary">{hint}</div>}
    </div>
  );
}
