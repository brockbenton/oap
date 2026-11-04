export type TokenColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';

// Flat, dark tints: token art sits on the canvas without gradients or glow.
export const TOKEN_COLORS: Record<TokenColor, string> = {
  blue: '#17303F',
  purple: '#2A2440',
  green: '#17352A',
  orange: '#3A2A16',
  red: '#3A1E20',
  teal: '#143533',
};

export const TOKEN_COLOR_NAMES = Object.keys(TOKEN_COLORS) as TokenColor[];

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
