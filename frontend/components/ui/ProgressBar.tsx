import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  value: number;
  className?: string;
}

const MIN_VALUE = 0;
const MAX_VALUE = 1;
const PERCENT = 100;

export default function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(MAX_VALUE, Math.max(MIN_VALUE, value));
  return (
    <div
      className={cn(
        'h-1 bg-raised overflow-hidden',
        className,
      )}
    >
      <div
        className="h-full bg-green"
        style={{ width: `${clamped * PERCENT}%` }}
      />
    </div>
  );
}
