import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type EyebrowProps = HTMLAttributes<HTMLDivElement>;

export default function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <div
      className={cn(
        'font-mono text-xs uppercase tracking-[0.06em] text-content-secondary',
        className,
      )}
      {...props}
    />
  );
}
