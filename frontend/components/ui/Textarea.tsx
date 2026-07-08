import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const BASE_CLASSES =
  'min-h-[80px] w-full rounded-md border border-[var(--l-input-border)] bg-white px-4 py-3.5 text-[15px] outline-none focus:border-ink placeholder:text-[var(--l-input-placeholder)]';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(BASE_CLASSES, className)} {...props} />;
});

export default Textarea;
