export type TokenColor = 'red' | 'orange' | 'yellow' | 'teal' | 'blue' | 'purple' | 'pink' | 'green';

// Bright, flat hues that take dark text. Each meeting topic gets its own color.
export const TOKEN_COLORS: Record<TokenColor, string> = {
  red: '#FF6B6B',
  orange: '#FF9F43',
  yellow: '#FFD93D',
  teal: '#2DD4BF',
  blue: '#5CB8FF',
  purple: '#A78BFA',
  pink: '#F472B6',
  green: '#3DDC84',
};

// Green is left out so it stays reserved for the member's own live moments.
const TOKEN_COLOR_NAMES: TokenColor[] = ['red', 'orange', 'yellow', 'teal', 'blue', 'purple', 'pink'];

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
