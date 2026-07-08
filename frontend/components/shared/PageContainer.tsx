import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export default function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={cn('mx-auto w-full max-w-[1180px] px-6', className)} {...props} />;
}
