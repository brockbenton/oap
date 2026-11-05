import TokenCard from '@/components/shared/TokenCard';
import type { TokenColor } from '@/lib/tokenArt';

interface FanCard {
  editionNumber: number;
  topic: string;
  date: string;
  color: TokenColor;
}

// Sample meetings, oldest first. Green is the newest, so it sits on top.
const CARDS: FanCard[] = [
  { editionNumber: 96, topic: 'Reading a block explorer', date: 'Feb 28, 2026', color: 'purple' },
  { editionNumber: 104, topic: 'Wallets 101', date: 'Mar 07, 2026', color: 'blue' },
  { editionNumber: 112, topic: 'Gas and fees', date: 'Mar 14, 2026', color: 'yellow' },
  { editionNumber: 120, topic: 'Smart contract security', date: 'Mar 28, 2026', color: 'pink' },
  { editionNumber: 128, topic: 'Intro to Solidity', date: 'Apr 04, 2026', color: 'green' },
];

const SPREAD_DEG = 13;
const DEPTH_PX = 16;

export default function TokenFan() {
  const middle = (CARDS.length - 1) / 2;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative grid h-[380px] place-items-center [perspective:1400px] md:h-[520px]"
    >
      <div className="scale-[0.8] [transform-style:preserve-3d] md:scale-100">
        <div className="relative h-[250px] w-[170px] animate-fan-drift [transform-style:preserve-3d] md:h-[300px] md:w-[210px]">
          {CARDS.map((card, index) => (
            <div
              key={card.editionNumber}
              className="absolute inset-0 origin-[50%_130%]"
              style={{
                transform: `translateZ(${index * DEPTH_PX}px) rotate(${(index - middle) * SPREAD_DEG}deg)`,
              }}
            >
              <TokenCard {...card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
