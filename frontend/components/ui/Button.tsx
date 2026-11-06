import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-6 px-2.5 text-xs',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-content text-canvas hover:bg-content-secondary',
  outline: 'border border-line-strong text-content hover:bg-raised',
  ghost: 'bg-raised text-content hover:bg-line',
  destructive: 'border border-red/40 text-status-neg hover:bg-status-neg-bg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}
