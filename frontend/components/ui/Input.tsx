import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const BASE_CLASSES =
  'h-12 w-full rounded-md border border-[var(--l-input-border)] bg-white px-4 text-[15px] outline-none focus:border-ink placeholder:text-[var(--l-input-placeholder)]';

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(BASE_CLASSES, className)} {...props} />;
});

export default Input;
