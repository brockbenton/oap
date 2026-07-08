import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center h-10 w-10 rounded-full text-ink transition duration-200 hover:bg-card-filled disabled:opacity-40 disabled:pointer-events-none';

export default function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} className={cn(BASE_CLASSES, className)} {...props}>
      {children}
    </button>
  );
}
