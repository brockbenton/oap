'use client';

import type { TokenColor } from '@/lib/tokenArt';
import { TOKEN_COLORS, colorForTopic } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';

const RARITY_RARE = 'RARE';
const EDITION_PREFIX = '#';
const META_SEPARATOR = ' · ';

const CARD_CLASSES =
  'block w-full text-left bg-surface border border-line rounded-tile overflow-hidden duration-200';
const HERO_CLASSES = 'relative grid aspect-square place-items-center overflow-hidden';
const RARE_TAG_CLASSES =
  'absolute right-2.5 top-2.5 rounded-sm bg-canvas/70 px-1.5 py-0.5 text-[9px] font-bold leading-[14px] text-content';

export interface TokenCardProps {
  editionNumber: number;
  topic: string;
  date: string;
  editionOf?: number;
  color?: TokenColor;
  rarity?: 'RARE' | null;
  onClick?: () => void;
  className?: string;
}

export default function TokenCard({
  editionNumber,
  topic,
  date,
  editionOf,
  color,
  rarity,
  onClick,
  className,
}: TokenCardProps) {
  const heroBackground = color ? TOKEN_COLORS[color] : colorForTopic(topic);
  const editionLabel = `${EDITION_PREFIX}${editionNumber}`;
  const editionRatio = editionOf ? `${editionLabel}/${editionOf}` : editionLabel;
  const meta = `${date}${META_SEPARATOR}${editionRatio}`;

  const content = (
    <>
      <div className={HERO_CLASSES} style={{ background: heroBackground }}>
        {rarity === RARITY_RARE ? <span className={RARE_TAG_CLASSES}>{RARITY_RARE}</span> : null}
        <span className="relative font-mono text-4xl text-content">{editionLabel}</span>
      </div>
      <div className="px-3.5 py-3">
        <div className="truncate text-[13px] font-semibold leading-tight">{topic}</div>
        <div className="mt-1.5 font-mono text-xs text-content-secondary">{meta}</div>
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
