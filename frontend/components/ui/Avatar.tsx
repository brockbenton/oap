import { cn } from '@/lib/cn';
import { avatarColorByIndex, avatarColorForSeed } from '@/lib/tokenArt';

export interface AvatarProps {
  seed: string;
  label?: string;
  size?: number;
  colorIndex?: number | null;
  className?: string;
}

const DEFAULT_SIZE = 36;
const INITIAL_FONT_RATIO = 0.42;

export default function Avatar({ seed, label, size = DEFAULT_SIZE, colorIndex, className }: AvatarProps) {
  // Skip the 0x prefix, or every wallet-labelled avatar would read "0".
  const initial = (label ?? seed).replace(/^0x/i, '').charAt(0).toUpperCase();
  const background =
    colorIndex === null || colorIndex === undefined
      ? avatarColorForSeed(seed)
      : avatarColorByIndex(colorIndex);
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-medium text-canvas',
        className,
      )}
      style={{
        width: size,
        height: size,
        background,
        fontSize: size * INITIAL_FONT_RATIO,
      }}
    >
      {initial}
    </div>
  );
}
