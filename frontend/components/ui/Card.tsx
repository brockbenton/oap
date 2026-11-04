import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-surface border border-line rounded-lg', className)}
      {...props}
    />
  );
}
