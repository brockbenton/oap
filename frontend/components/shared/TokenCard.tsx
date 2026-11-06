'use client';

import type { TokenColor } from '@/lib/tokenArt';
import { TOKEN_COLORS, colorForTopic, inkOn } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';

const EDITION_PREFIX = '#';

const CARD_CLASSES =
  'block w-full text-left bg-surface border border-line rounded overflow-hidden transition-colors duration-150 hover:border-line-strong';
const HERO_CLASSES = 'relative grid aspect-square place-items-center overflow-hidden';

export interface TokenCardProps {
  editionNumber: number;
  topic: string;
  date: string;
  color?: TokenColor;
  onClick?: () => void;
  className?: string;
}

export default function TokenCard({
  editionNumber,
  topic,
  date,
  color,
  onClick,
  className,
}: TokenCardProps) {
  const heroBackground = color ? TOKEN_COLORS[color] : colorForTopic(topic);
  const editionLabel = `${EDITION_PREFIX}${editionNumber}`;

  const content = (
    <>
      <div className={HERO_CLASSES} style={{ background: heroBackground }}>
        <span className="relative font-mono text-4xl" style={{ color: inkOn(heroBackground) }}>
          {editionLabel}
        </span>
      </div>
      <div className="px-3.5 py-3">
        <div className="truncate text-[13px] font-semibold leading-tight">{topic}</div>
        <div className="mt-1.5 font-mono text-xs text-content-secondary">{date}</div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(CARD_CLASSES, className)}>
        {content}
      </button>
    );
  }

  return <div className={cn(CARD_CLASSES, className)}>{content}</div>;
}
