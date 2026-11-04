import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const tint = (name: string) => `rgb(var(--${name}) / 0.12)`;

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Closed palette: anything outside these tokens produces no CSS.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      canvas: token('canvas'),
      surface: token('surface'),
      raised: token('raised'),
      line: { DEFAULT: token('line'), strong: token('line-strong') },
      content: {
        DEFAULT: token('content'),
        secondary: token('content-secondary'),
        muted: token('content-muted'),
      },
      green: { DEFAULT: token('green'), dim: token('green-dim') },
      amber: token('amber'),
      red: token('red'),
      cyan: token('cyan'),
      status: {
        info: token('cyan'), 'info-bg': tint('cyan'),
        pos: token('green'), 'pos-bg': tint('green'),
        warn: token('amber'), 'warn-bg': tint('amber'),
        neg: token('red'), 'neg-bg': tint('red'),
        neutral: token('content-secondary'), 'neutral-bg': token('raised'),
      },
    },
    borderRadius: {
      none: '0', sm: '2px', DEFAULT: '4px', md: '4px', lg: '4px', xl: '4px', '2xl': '4px', '3xl': '4px',
      card: '4px', tile: '4px', context: '4px', full: '9999px',
    },
    boxShadow: { none: 'none' },
    extend: {
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      // Plex loads 400/500/600 only, so bold must not synthesize a heavier weight.
      fontWeight: { bold: '600' },
      keyframes: {
        fadeInUp: { from: { opacity:'0', transform:'translateY(6px)' }, to: { opacity:'1', transform:'none' } },
      },
      animation: {
        'fade-in': 'fadeInUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
