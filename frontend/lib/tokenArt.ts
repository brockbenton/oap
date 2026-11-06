export type TokenColor = 'red' | 'orange' | 'yellow' | 'teal' | 'blue' | 'purple' | 'green';

// Deep, flat hues. Each meeting topic gets its own color.
export const TOKEN_COLORS: Record<TokenColor, string> = {
  red: '#D7261E',
  orange: '#E8590C',
  yellow: '#F5B700',
  teal: '#0A8F7F',
  blue: '#1A5FD0',
  purple: '#6D36D9',
  green: '#0B8F4D',
};

// Green is left out so it stays reserved for the member's own live moments.
const TOKEN_COLOR_NAMES: TokenColor[] = ['red', 'orange', 'yellow', 'teal', 'blue', 'purple'];

const INK_LIGHT = '#FFFFFF';
const INK_DARK = '#0E0F11';
// Luminance where white and near-black text have equal contrast.
const INK_LUMINANCE_SPLIT = 0.18;

/** The readable text color for a token background given as `#RRGGBB`. */
export function inkOn(background: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(background.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > INK_LUMINANCE_SPLIT ? INK_DARK : INK_LIGHT;
}

// Seven distinct hues, indexed by the stored avatarColor (the backend allows 0-6).
// Green is left out so it stays reserved for actions and status.
const AVATAR_COLORS = ['#7CC7FF', '#F5B84B', '#FF8A80', '#B79CFF', '#F28CC3', '#4FD1C5', '#D9C8A9'];

function charSum(input: string): number {
  let sum = 0;
  for (let i = 0; i < input.length; i += 1) {
    sum += input.charCodeAt(i);
  }
  return sum;
}

/** The token color a topic maps to, for props that take a name rather than CSS. */
export function colorNameForTopic(topic: string): TokenColor {
  return TOKEN_COLOR_NAMES[charSum(topic) % TOKEN_COLOR_NAMES.length];
}

export function colorForTopic(topic: string): string {
  return TOKEN_COLORS[colorNameForTopic(topic)];
}

export const AVATAR_COLOR_COUNT = AVATAR_COLORS.length;

export function avatarColorByIndex(index: number): string {
  const wrapped = ((index % AVATAR_COLOR_COUNT) + AVATAR_COLOR_COUNT) % AVATAR_COLOR_COUNT;
  return AVATAR_COLORS[wrapped];
}

export function avatarColorForSeed(seed: string): string {
  return avatarColorByIndex(charSum(seed));
}
