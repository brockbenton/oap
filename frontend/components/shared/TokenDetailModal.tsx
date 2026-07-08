'use client';

import { useEffect } from 'react';
import type { GradientName } from '@/lib/tokenArt';
import { TOKEN_GRADIENTS, gradientForTopic } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';
import { Button, CopyChip, IconButton } from '@/components/ui';
import { CloseIcon, ExternalLinkIcon } from '@/components/ui/icons';

type TraitTone = 'info' | 'neutral';

export interface TokenDetailData {
  editionNumber: number;
  editionOf: number;
  topic: string;
  club: string;
  week: number;
  mintedAt: string;
  chain: string;
  standard: string;
  xp: number;
  gradient?: GradientName;
  rarity?: 'RARE' | null;
  traits: { label: string; value: string; tone?: TraitTone }[];
  txHash: string;
}

export interface TokenDetailModalProps {
  open: boolean;
  onClose: () => void;
  token: TokenDetailData | null;
}

const ESCAPE_KEY = 'Escape';
const RARITY_RARE = 'RARE';
const TRAIT_TONE_INFO: TraitTone = 'info';

const EDITION_PREFIX = '#';
const META_SEPARATOR = ' · ';
const ELLIPSIS = '…';
const WEEK_PREFIX = 'Week ';
const XP_PREFIX = '+';
const XP_SUFFIX = ' XP';
const TX_PREFIX = 'Tx ';
const HASH_HEAD_LENGTH = 6;
const HASH_TAIL_LENGTH = 4;

const BADGE_LABEL = 'ATTENDANCE TOKEN';
const TRAITS_LABEL = 'Traits';
const CLOSE_LABEL = 'Close';
const BASESCAN_LABEL = 'View on Basescan';
const SHARE_LABEL = 'Share';
const META_MINTED = 'Minted';
const META_CHAIN = 'Chain';
const META_STANDARD = 'Standard';
const META_XP = 'XP earned';

const OVERLAY_CLASSES = 'fixed inset-0 z-50 grid place-items-center bg-[rgba(1,3,4,0.5)] p-4';
const PANEL_CLASSES =
  'w-full max-w-[760px] overflow-hidden rounded-context border border-line bg-white shadow-elev-lg';
const GRID_CLASSES = 'grid grid-cols-1 md:grid-cols-[320px_1fr]';

const ART_CLASSES = 'relative grid min-h-[440px] place-items-center overflow-hidden';
const ART_OVERLAY_CLASSES =
  'absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.4),transparent_55%)]';
const SHEEN_CLASSES =
  'absolute inset-y-0 w-[35%] animate-sheen bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)]';
const RARE_TAG_CLASSES =
  'absolute right-2.5 top-2.5 rounded-sm bg-black/35 px-1.5 py-0.5 text-[9px] font-bold leading-[14px] text-white';
const EDITION_CLASSES = 'relative font-mono text-[72px] font-bold leading-none tracking-[-2px]';
const EDITION_FOOTER_CLASSES =
  'absolute inset-x-0 bottom-[18px] text-center font-mono text-xs font-medium text-white/80';

const META_CLASSES = 'relative px-7 pt-7 pb-[26px]';
const CLOSE_CLASSES = 'absolute right-5 top-5 h-8 w-8 bg-card-filled text-content-secondary';
const BADGE_CLASSES =
  'mb-3.5 inline-block rounded-sm bg-status-info-bg px-[9px] py-[3px] text-[11px] font-bold leading-4 text-blue-600';
const TITLE_CLASSES = 'mb-1.5 text-[26px] font-semibold leading-[30px] tracking-[-0.8px]';
const SUBTITLE_CLASSES = 'mb-[22px] font-mono text-[13px] font-medium text-content-secondary';
const META_GRID_CLASSES = 'mb-[22px] grid grid-cols-2 gap-x-5 gap-y-4';
const META_LABEL_CLASSES =
  'font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-content-secondary';
const META_VALUE_CLASSES = 'mt-1.5 text-[14px] font-medium leading-[1.3] text-ink';

const TRAIT_ROW_CLASSES = 'mb-[22px] flex flex-wrap gap-2';
const TRAIT_CHIP_BASE = 'rounded-[8px] px-3 py-1.5 text-xs font-semibold';
const TRAIT_CHIP_INFO = 'bg-status-info-bg text-blue-600';
const TRAIT_CHIP_NEUTRAL = 'bg-card-filled';

const ACTIONS_CLASSES = 'flex gap-2.5';
const PRIMARY_BUTTON_CLASSES = 'h-[46px] flex-1';
const SHARE_BUTTON_CLASSES = 'h-[46px] px-5';

function shortHash(hash: string): string {
  return `${hash.slice(0, HASH_HEAD_LENGTH)}${ELLIPSIS}${hash.slice(-HASH_TAIL_LENGTH)}`;
}

export default function TokenDetailModal({ open, onClose, token }: TokenDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ESCAPE_KEY) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !token) return null;

  const artBackground = token.gradient
    ? TOKEN_GRADIENTS[token.gradient]
    : gradientForTopic(token.topic);

  const metaItems: { label: string; value: string }[] = [
    { label: META_MINTED, value: token.mintedAt },
    { label: META_CHAIN, value: token.chain },
    { label: META_STANDARD, value: token.standard },
    { label: META_XP, value: `${XP_PREFIX}${token.xp}${XP_SUFFIX}` },
  ];

  return (
    <div className={OVERLAY_CLASSES} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={token.topic}
        className={PANEL_CLASSES}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={GRID_CLASSES}>
          <div className={ART_CLASSES} style={{ background: artBackground }}>
            <div className={ART_OVERLAY_CLASSES} />
            <div className={SHEEN_CLASSES} />
            {token.rarity === RARITY_RARE ? (
              <span className={RARE_TAG_CLASSES}>{RARITY_RARE}</span>
            ) : null}
            <div className="relative text-center text-white">
              <div className={EDITION_CLASSES}>{`${EDITION_PREFIX}${token.editionNumber}`}</div>
            </div>
            <div className={EDITION_FOOTER_CLASSES}>
              {`Edition ${token.editionNumber} of ${token.editionOf}`}
            </div>
          </div>

          <div className={META_CLASSES}>
            <IconButton label={CLOSE_LABEL} onClick={onClose} className={CLOSE_CLASSES}>
              <CloseIcon size={16} />
            </IconButton>

            <span className={BADGE_CLASSES}>{BADGE_LABEL}</span>
            <h2 className={TITLE_CLASSES}>{token.topic}</h2>
            <div className={SUBTITLE_CLASSES}>
              {`${token.club}${META_SEPARATOR}${WEEK_PREFIX}${token.week}`}
            </div>

            <div className={META_GRID_CLASSES}>
              {metaItems.map((item) => (
                <div key={item.label}>
                  <div className={META_LABEL_CLASSES}>{item.label}</div>
                  <div className={META_VALUE_CLASSES}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className={cn(META_LABEL_CLASSES, 'mb-2.5')}>{TRAITS_LABEL}</div>
            <div className={TRAIT_ROW_CLASSES}>
              {token.traits.map((trait) => (
                <span
                  key={`${trait.label}${trait.value}`}
                  className={cn(
                    TRAIT_CHIP_BASE,
                    trait.tone === TRAIT_TONE_INFO ? TRAIT_CHIP_INFO : TRAIT_CHIP_NEUTRAL,
                  )}
                >
                  {`${trait.label}${META_SEPARATOR}${trait.value}`}
                </span>
              ))}
            </div>

            <CopyChip
              value={token.txHash}
              display={`${TX_PREFIX}${shortHash(token.txHash)}`}
              className="mb-[18px]"
            />

            <div className={ACTIONS_CLASSES}>
              <Button variant="primary" className={PRIMARY_BUTTON_CLASSES}>
                {BASESCAN_LABEL}
                <ExternalLinkIcon size={14} />
              </Button>
              <Button variant="outline" className={SHARE_BUTTON_CLASSES}>
                {SHARE_LABEL}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
