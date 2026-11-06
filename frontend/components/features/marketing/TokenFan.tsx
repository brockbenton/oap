import type { CSSProperties } from 'react';
import TokenCard from '@/components/shared/TokenCard';
import { TOKEN_COLORS, type TokenColor } from '@/lib/tokenArt';

interface FanCard {
  editionNumber: number;
  topic: string;
  date: string;
  color: TokenColor;
}

// Sample meetings, oldest first. Green is the newest, so it sits on top.
const CARDS: FanCard[] = [
  { editionNumber: 96, topic: 'Reading a block explorer', date: 'Feb 28, 2026', color: 'purple' },
  { editionNumber: 104, topic: 'Wallets 101', date: 'Mar 07, 2026', color: 'yellow' },
  { editionNumber: 112, topic: 'Gas and fees', date: 'Mar 14, 2026', color: 'blue' },
  { editionNumber: 120, topic: 'Smart contract security', date: 'Mar 28, 2026', color: 'red' },
  { editionNumber: 128, topic: 'Intro to Solidity', date: 'Apr 04, 2026', color: 'green' },
];

const SPREAD_DEG = 14;
const LAYER_GAP_PX = 22;
const THICKNESS_PX = 12;
const STAGGER_S = 0.5;
const CARD_SHADOW = '0 24px 48px rgb(0 0 0 / 0.5)';

// The card's sides run back from its face, turning a flat card into a slab.
const EDGES: CSSProperties[] = [
  { left: 0, top: 0, width: THICKNESS_PX, height: '100%', transformOrigin: 'left', transform: 'rotateY(90deg)' },
  { left: '100%', top: 0, width: THICKNESS_PX, height: '100%', transformOrigin: 'left', transform: 'rotateY(90deg)' },
  { left: 0, top: 0, width: '100%', height: THICKNESS_PX, transformOrigin: 'top', transform: 'rotateX(-90deg)' },
  { left: 0, top: '100%', width: '100%', height: THICKNESS_PX, transformOrigin: 'top', transform: 'rotateX(-90deg)' },
];

export default function TokenFan() {
  const middle = (CARDS.length - 1) / 2;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative grid h-[380px] place-items-center [perspective:1200px] md:h-[520px]"
    >
      <div className="scale-[0.66] [transform-style:preserve-3d] md:scale-100">
        <div className="relative h-[280px] w-[210px] animate-fan-drift [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateY(-10deg)]">
          {CARDS.map((card, index) => {
            const style = {
              '--fan-a': `${(index - middle) * SPREAD_DEG}deg`,
              '--fan-z': `${index * LAYER_GAP_PX}px`,
              animationDelay: `${-index * STAGGER_S}s`,
              transform: 'translateZ(var(--fan-z)) rotate(var(--fan-a))',
            } as CSSProperties;
            return (
              <div
                key={card.editionNumber}
                className="absolute inset-0 origin-[50%_130%] animate-fan-breathe [transform-style:preserve-3d]"
                style={style}
              >
                {EDGES.map((edge) => (
                  <div
                    key={`${edge.left}-${edge.top}`}
                    className="absolute brightness-75"
                    style={{ ...edge, background: TOKEN_COLORS[card.color] }}
                  />
                ))}
                <div className="h-full" style={{ boxShadow: CARD_SHADOW }}>
                  <TokenCard {...card} className="h-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
