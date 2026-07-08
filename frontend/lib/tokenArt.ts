export type GradientName = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';

export const TOKEN_GRADIENTS: Record<GradientName, string> = {
  blue:   'linear-gradient(135deg, #005cf0, #26ddf9)',
  purple: 'linear-gradient(135deg, #6833ff, #a485ff)',
  green:  'linear-gradient(135deg, #0e8535, #c8f028)',
  orange: 'linear-gradient(135deg, #fb6832, #f7b133)',
  red:    'linear-gradient(135deg, #fc4848, #f59e00)',
  teal:   'linear-gradient(135deg, #00a6a6, #26ddf9)',
};

export const GRADIENT_NAMES: GradientName[] = Object.keys(TOKEN_GRADIENTS) as GradientName[];

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

export function gradientForTopic(topic: string): string {
  const index = charSum(topic) % GRADIENT_NAMES.length;
  return TOKEN_GRADIENTS[GRADIENT_NAMES[index]];
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
