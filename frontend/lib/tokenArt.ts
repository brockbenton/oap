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

const TOKEN_COLOR_NAMES = Object.keys(TOKEN_COLORS) as TokenColor[];

const GRADIENT_ANGLE = '135deg';

const AVATAR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#337df3', '#6833ff'],
  ['#11a642', '#26ddf9'],
  ['#6833ff', '#a485ff'],
  ['#337df3', '#865cff'],
  ['#f59e00', '#fc4848'],
  ['#0e8535', '#c8f028'],
  ['#fb6832', '#f7b133'],
];

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

export function avatarGradient(seed: string): string {
  const [from, to] = AVATAR_PAIRS[charSum(seed) % AVATAR_PAIRS.length];
  return `linear-gradient(${GRADIENT_ANGLE}, ${from}, ${to})`;
}

export const AVATAR_COLOR_COUNT = AVATAR_PAIRS.length;

export function avatarGradientByIndex(index: number): string {
  const wrapped = ((index % AVATAR_COLOR_COUNT) + AVATAR_COLOR_COUNT) % AVATAR_COLOR_COUNT;
  const [from, to] = AVATAR_PAIRS[wrapped];
  return `linear-gradient(${GRADIENT_ANGLE}, ${from}, ${to})`;
}
