import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  value: number;
  gradient?: boolean;
  className?: string;
}

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const PERCENT = 100;

const GRADIENT_FILL = 'bg-[linear-gradient(90deg,#6833ff,#26ddf9)]';
const SOLID_FILL = 'bg-blue-500';

export default function ProgressBar({ value, gradient = false, className }: ProgressBarProps) {
  const clamped = Math.min(MAX_VALUE, Math.max(MIN_VALUE, value));
  return (
    <div
      className={cn(
        'h-1.5 rounded-full bg-[rgba(1,3,4,0.08)] overflow-hidden',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full', gradient ? GRADIENT_FILL : SOLID_FILL)}
        style={{ width: `${clamped * PERCENT}%` }}
      />
    </div>
  );
}
