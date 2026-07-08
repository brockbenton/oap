import { cn } from '@/lib/cn';
import { avatarGradient, avatarGradientByIndex } from '@/lib/tokenArt';

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
  const initial = (label ?? seed).charAt(0).toUpperCase();
  const background =
    colorIndex === null || colorIndex === undefined
      ? avatarGradient(seed)
      : avatarGradientByIndex(colorIndex);
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-semibold',
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
