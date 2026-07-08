import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#010304',
        paper: '#ffffff',
        cyan: '#26ddf9',
        gray: { 50:'#f7f7f7',100:'#e6e6e6',200:'#cccdcd',300:'#b3b3b4',400:'#999a9b',500:'#808181',600:'#676868',700:'#4d4f4f',800:'#343536',900:'#1a1c1d' },
        red: { 50:'#fff6f6',100:'#fedada',200:'#feb6b6',300:'#fd9191',400:'#fd6d6d',500:'#fc4848',600:'#ca3a3a',700:'#972b2b',800:'#651d1d',900:'#320e0e' },
        orange: { 50:'#fff7f5',100:'#fee1d6',200:'#fdc3ad',300:'#fda484',400:'#fc865b',500:'#fb6832',600:'#c95328',700:'#973e1e',800:'#652a14',900:'#320e0e' },
        yellow: { 50:'#fefaf2',100:'#fdeccc',200:'#fbd899',300:'#f9c566',400:'#f7b133',500:'#f59e00',600:'#c47e00',700:'#935f00',800:'#623f00',900:'#312000' },
        lime: { 50:'#fcfef4',100:'#f4fcd4',200:'#e9f9a9',300:'#def67e',400:'#d3f353',500:'#c8f028',600:'#a0c020',700:'#789018',800:'#506010',900:'#283008' },
        green: { 50:'#f3fbf5',100:'#cfedd9',200:'#a0dbb3',300:'#70ca8e',400:'#41b868',500:'#11a642',600:'#0e8535',700:'#0a6428',800:'#07421a',900:'#03210d' },
        blue: { 50:'#f2f7fe',100:'#ccdefc',200:'#99bef9',300:'#669df6',400:'#337df3',500:'#005cf0',600:'#004ac0',700:'#003790',800:'#002560',900:'#001230' },
        purple: { 50:'#f7f5ff',100:'#e1d6ff',200:'#c3adff',300:'#a485ff',400:'#865cff',500:'#6833ff',600:'#5329cc',700:'#3e1f99',800:'#2a1466',900:'#150a33' },
        content: { DEFAULT:'var(--content-default)', secondary:'var(--content-secondary)', disabled:'var(--content-disabled)', highlight:'var(--content-highlight)' },
        line: { DEFAULT:'var(--border-default)', strong:'var(--border-strong)' },
        card: { DEFAULT:'var(--card-bg)', filled:'var(--card-filled)', border:'var(--card-border)' },
        status: {
          info:'var(--status-info-content)', 'info-bg':'var(--status-info-bg)',
          pos:'var(--status-pos-content)', 'pos-bg':'var(--status-pos-bg)',
          warn:'var(--status-warn-content)', 'warn-bg':'var(--status-warn-bg)',
          neg:'var(--status-neg-content)', 'neg-bg':'var(--status-neg-bg)',
          rew:'var(--status-rew-content)', 'rew-bg':'var(--status-rew-bg)',
          neutral:'var(--status-neutral-content)', 'neutral-bg':'var(--status-neutral-bg)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm:'5px', md:'10px', card:'16px', tile:'18px', lg:'20px', context:'24px', full:'999px' },
      boxShadow: {
        'elev-sm':'0 8px 32px 0 rgba(0,0,0,0.08)',
        'elev-md':'0 16px 64px 0 rgba(0,0,0,0.10)',
        'elev-lg':'0 24px 96px 0 rgba(0,0,0,0.12)',
      },
      transitionTimingFunction: { 'ease-out-hubble':'cubic-bezier(0.2,0.8,0.4,1)' },
      keyframes: {
        oapSheen: { '0%': { transform:'translateX(-120%)' }, '100%': { transform:'translateX(220%)' } },
        oapPulse: { '0%,100%': { opacity:'.5', transform:'scale(1)' }, '50%': { opacity:'1', transform:'scale(1.06)' } },
        fadeInUp: { from: { opacity:'0', transform:'translateY(6px)' }, to: { opacity:'1', transform:'none' } },
      },
      animation: {
        sheen: 'oapSheen 3s cubic-bezier(0.2,0.8,0.4,1) infinite',
        'sheen-fast': 'oapSheen 2.4s cubic-bezier(0.2,0.8,0.4,1) infinite',
        'oap-pulse': 'oapPulse 2s ease-in-out infinite',
        'fade-in': 'fadeInUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
