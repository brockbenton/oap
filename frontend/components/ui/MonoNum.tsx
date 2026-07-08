import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type MonoNumProps = HTMLAttributes<HTMLSpanElement>;

export default function MonoNum({ className, ...props }: MonoNumProps) {
  return <span className={cn('font-mono tabular-nums', className)} {...props} />;
}
