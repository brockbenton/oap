import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface BrandProps {
  href?: string;
  className?: string;
}

const WORDMARK_CLASSES = 'font-bold text-[19px] tracking-[-0.02em]';

export default function Brand({ href, className }: BrandProps) {
  const wordmark = (
    <>
      OAP<span className="text-cyan">.</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(WORDMARK_CLASSES, className)}>
        {wordmark}
      </Link>
    );
  }

  return <span className={cn(WORDMARK_CLASSES, className)}>{wordmark}</span>;
}
