import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const BASE_CLASSES =
  'h-12 w-full rounded-md border border-[var(--l-input-border)] bg-white px-4 text-[15px] outline-none focus:border-ink';

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(BASE_CLASSES, className)} {...props}>
      {children}
    </select>
  );
});

export default Select;
