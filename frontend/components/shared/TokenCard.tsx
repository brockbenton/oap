'use client';

import type { GradientName } from '@/lib/tokenArt';
import { TOKEN_GRADIENTS, gradientForTopic } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';

const RARITY_RARE = 'RARE';
const EDITION_PREFIX = '#';
const META_SEPARATOR = ' · ';

const CARD_CLASSES =
  'block w-full text-left bg-white border border-line rounded-tile overflow-hidden shadow-elev-sm transition-shadow duration-200 hover:shadow-elev-md';
const HERO_CLASSES = 'relative grid aspect-square place-items-center overflow-hidden';
const HERO_OVERLAY_CLASSES =
  'absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.35),transparent_55%)]';
const SHEEN_CLASSES =
  'absolute inset-y-0 w-[35%] animate-sheen bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)]';
const RARE_TAG_CLASSES =
  'absolute right-2.5 top-2.5 rounded-sm bg-black/35 px-1.5 py-0.5 text-[9px] font-bold leading-[14px] text-white';

export interface TokenCardProps {
  editionNumber: number;
  topic: string;
  date: string;
  editionOf?: number;
  gradient?: GradientName;
  rarity?: 'RARE' | null;
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function TokenCard({
  editionNumber,
  topic,
  date,
  editionOf,
  gradient,
  rarity,
  featured,
  onClick,
  className,
}: TokenCardProps) {
  const heroBackground = gradient ? TOKEN_GRADIENTS[gradient] : gradientForTopic(topic);
  const editionLabel = `${EDITION_PREFIX}${editionNumber}`;
  const editionRatio = editionOf ? `${editionLabel}/${editionOf}` : editionLabel;
  const meta = `${date}${META_SEPARATOR}${editionRatio}`;

  const content = (
    <>
      <div className={HERO_CLASSES} style={{ background: heroBackground }}>
        <div className={HERO_OVERLAY_CLASSES} />
        {featured ? <div className={SHEEN_CLASSES} /> : null}
        {rarity === RARITY_RARE ? <span className={RARE_TAG_CLASSES}>{RARITY_RARE}</span> : null}
        <span className="relative font-mono text-4xl tracking-[-1px] text-white">{editionLabel}</span>
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
