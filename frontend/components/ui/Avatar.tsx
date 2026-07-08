import { cn } from '@/lib/cn';
import { avatarGradient } from '@/lib/tokenArt';

export interface AvatarProps {
  seed: string;
  label?: string;
  size?: number;
  className?: string;
}

const DEFAULT_SIZE = 36;
const INITIAL_FONT_RATIO = 0.42;

export default function Avatar({ seed, label, size = DEFAULT_SIZE, className }: AvatarProps) {
  const initial = (label ?? seed).charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-semibold',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: avatarGradient(seed),
        fontSize: size * INITIAL_FONT_RATIO,
      }}
    >
      {initial}
    </div>
  );
}
