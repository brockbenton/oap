import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'cyan' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-6 px-3 text-xs',
  sm: 'h-8 px-4 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-raised text-content hover:bg-line',
  cyan: 'bg-green text-canvas hover:brightness-95',
  outline: 'bg-surface text-content border border-line hover:bg-raised',
  ghost: 'bg-raised text-content hover:bg-raised',
  destructive: 'bg-transparent text-status-neg hover:bg-status-neg-bg',
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
