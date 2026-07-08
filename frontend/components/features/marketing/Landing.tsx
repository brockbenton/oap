import Link from 'next/link';
import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import Footer from '@/components/shared/Footer';
import { Button, CopyChip, Eyebrow } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import { TOKEN_GRADIENTS } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';
import { BASESCAN_URL } from '@/lib/constants';

const HERO_GRADIENT = 'radial-gradient(120% 120% at 0% 0%, #f2f7fe 0%, #ffffff 55%)';
const CARD_SHEEN = 'radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 55%)';
const PROTOCOL_ANCHOR = 'protocol';
const MKT_EYEBROW = 'tracking-[0.12em] text-status-neutral';
const DEPLOYED_CONTRACT = '0x7bEf8C32157C0A40A51b9bebeb7B36f236316192';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? DEPLOYED_CONTRACT;
const CONTRACT_DISPLAY = `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`;
const CONTRACT_BASESCAN_HREF = `${BASESCAN_URL}/address/${CONTRACT_ADDRESS}`;

interface HeroStat {
  value: string;
  label: string;
}

const HERO_STATS: HeroStat[] = [
  { value: '12,480', label: 'tokens minted' },
  { value: '3,142', label: 'members' },
  { value: '$0.00', label: 'gas to mint' },
];

interface ClusterToken {
  topic?: string;
  edition: string;
  title: string;
  meta?: string;
  gradient: string;
  transform: string;
  positionClass: string;
  headerHeightClass: string;
  editionSizeClass: string;
  titleSizeClass: string;
  bodyPaddingClass: string;
}

const CLUSTER_TOKENS: ClusterToken[] = [
  {
    topic: 'ZK',
    edition: '#087',
    title: 'ZK Proofs 101',
    meta: 'SEP 16 · 1 minted',
    gradient: 'linear-gradient(135deg,#6833ff,#a485ff)',
    transform: 'rotate(-6deg)',
    positionClass: 'top-6 left-10 w-[230px]',
    headerHeightClass: 'h-[150px]',
    editionSizeClass: 'text-[46px]',
    titleSizeClass: 'text-[15px]',
    bodyPaddingClass: 'p-4',
  },
  {
    topic: 'SOL',
    edition: '#128',
    title: 'Intro to Solidity',
    meta: 'APR 04 · 240 minted',
    gradient: 'linear-gradient(135deg,#005cf0,#26ddf9)',
    transform: 'rotate(7deg)',
    positionClass: 'top-[120px] right-6 z-[2] w-[230px]',
    headerHeightClass: 'h-[150px]',
    editionSizeClass: 'text-[46px]',
    titleSizeClass: 'text-[15px]',
    bodyPaddingClass: 'p-4',
  },
  {
    edition: '#204',
    title: 'DeFi Lending',
    meta: 'OCT 08',
    gradient: 'linear-gradient(135deg,#0e8535,#c8f028)',
    transform: 'rotate(-3deg)',
    positionClass: 'bottom-2 left-16 w-[210px]',
    headerHeightClass: 'h-[130px]',
    editionSizeClass: 'text-[42px]',
    titleSizeClass: 'text-[14px]',
    bodyPaddingClass: 'px-4 py-3.5',
  },
];

interface HowStep {
  number: string;
  title: string;
  body: string;
  badgeClass: string;
}

const HOW_STEPS: HowStep[] = [
  {
    number: '01',
    title: 'Scan the meeting QR',
    body: 'Each meeting shows a unique code on the projector. No wallet setup — sign in with email or Google.',
    badgeClass: 'bg-status-info-bg text-blue-600',
  },
  {
    number: '02',
    title: 'Mint your token',
    body: 'A collectible with the date, topic, and edition number is minted to your embedded wallet — gas covered.',
    badgeClass: 'bg-status-rew-bg text-purple-600',
  },
  {
    number: '03',
    title: 'Build your streak',
    body: "Show up weekly to level up, unlock rewards, and rise on your club's leaderboard.",
    badgeClass: 'bg-status-pos-bg text-green-600',
  },
];

interface ValueProp {
  title: string;
  body: string;
  dotClass: string;
}

const WHY_OAP: ValueProp[] = [
  {
    title: 'Tamper-proof by default',
    body: 'Every check-in is a soulbound token on Base — non-transferable, timestamped, and impossible to backfill or fake after the fact.',
    dotClass: 'bg-blue-500',
  },
  {
    title: 'Zero friction to join',
    body: 'Members sign in with email or Google. We provision an embedded wallet and sponsor the gas — no seed phrase, no ETH, no extension.',
    dotClass: 'bg-cyan',
  },
  {
    title: 'Motivation built in',
    body: 'Streaks, levels, and club leaderboards turn showing up into something members actually want to keep doing.',
    dotClass: 'bg-purple-500',
  },
  {
    title: 'A record they own',
    body: 'Attendance lives onchain, not in a spreadsheet — portable, publicly verifiable, and theirs to keep long after they leave.',
    dotClass: 'bg-green-600',
  },
];

interface TokenFact {
  label: string;
  value: string;
}

const TOKEN_FACTS: TokenFact[] = [
  { label: 'Chain', value: 'Base · low-cost L2' },
  { label: 'Standard', value: 'ERC-721, soulbound' },
  { label: 'Metadata', value: 'Topic · date · edition · club' },
  { label: 'Gas', value: 'Sponsored — $0 to member' },
];

const TOKEN_SAMPLE = {
  symbol: 'SOL',
  edition: 128,
  editionOf: 240,
  topic: 'Intro to Solidity',
  date: 'APR 04, 2026',
  week: 'Week 6',
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      <section style={{ background: HERO_GRADIENT }}>
        <PageContainer className="grid gap-10 pb-14 pt-12 md:grid-cols-[1.05fr_0.95fr] md:pt-16">
          <div className="self-center">
            <div className="mb-[22px] inline-flex items-center gap-2 rounded-full bg-status-info-bg px-3 py-1.5 text-xs font-semibold leading-none text-blue-600">
              <span className="h-[7px] w-[7px] rounded-full bg-blue-500" />
              Live on Base · 41 clubs
            </div>
            <h2 className="mb-5 text-[44px] font-semibold leading-[46px] tracking-[-2px] sm:text-[60px] sm:leading-[60px] sm:tracking-[-3px]">
              Proof you
              <br />
              showed up.
              <br />
              <span className="text-blue-500">Onchain.</span>
            </h2>
            <p className="mb-8 max-w-[38ch] text-[19px] leading-[29px] text-content-secondary [text-wrap:pretty]">
              Scan the QR at your club meeting and mint a permanent attendance token. Build streaks,
              level up, and climb the leaderboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/check-in">
                <Button variant="primary" size="lg" className="px-[30px]">
                  Check in to a meeting
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="ghost" size="lg">
                  See the explorer
                </Button>
              </Link>
            </div>
            <div className="mt-11 flex gap-9">
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-[28px] font-bold leading-none tracking-[-0.5px] tabular-nums">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-[13px] font-medium leading-none text-content-secondary">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[440px]">
            {CLUSTER_TOKENS.map((token) => (
              <div
                key={token.edition}
                className={cn(
                  'absolute overflow-hidden rounded-lg border border-line bg-white shadow-elev-lg',
                  token.positionClass,
                )}
                style={{ transform: token.transform }}
              >
                <div
                  className={cn(
                    'relative grid place-items-center overflow-hidden',
                    token.headerHeightClass,
                  )}
                  style={{ background: token.gradient }}
                >
                  <div className="absolute inset-0" style={{ background: CARD_SHEEN }} />
                  {token.topic && (
                    <div className="absolute left-4 top-3.5 font-mono text-[15px] font-bold leading-none text-white/90">
                      {token.topic}
                    </div>
                  )}
                  <div
                    className={cn(
                      'font-mono font-bold leading-none tracking-[-1px] text-white',
                      token.editionSizeClass,
                    )}
                  >
                    {token.edition}
                  </div>
                </div>
                <div className={token.bodyPaddingClass}>
                  <div className={cn('font-semibold leading-[1.2]', token.titleSizeClass)}>
                    {token.title}
                  </div>
                  {token.meta && (
                    <div className="mt-2 font-mono text-xs font-medium leading-none text-content-secondary">
                      {token.meta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="border-t border-line">
        <PageContainer className="py-14">
          <Eyebrow className={cn('mb-2', MKT_EYEBROW)}>How it works</Eyebrow>
          <h3 className="mb-8 text-[30px] font-semibold leading-[38px] tracking-[-1px]">
            Three taps from seat to onchain.
          </h3>
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_STEPS.map((step) => (
              <div key={step.number} className="rounded-lg border border-line p-6">
                <div
                  className={cn(
                    'mb-[18px] grid h-11 w-11 place-items-center rounded-[12px] font-mono text-[18px] font-bold leading-none',
                    step.badgeClass,
                  )}
                >
                  {step.number}
                </div>
                <div className="mb-2 text-[17px] font-semibold leading-[1.3]">{step.title}</div>
                <div className="text-[14px] leading-[22px] text-content-secondary">{step.body}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section id={PROTOCOL_ANCHOR} className="scroll-mt-20 border-t border-line">
        <PageContainer className="py-14">
          <Eyebrow className={cn('mb-2', MKT_EYEBROW)}>Why OAP</Eyebrow>
          <h3 className="mb-8 max-w-[22ch] text-[30px] font-semibold leading-[38px] tracking-[-1px]">
            Attendance that can&apos;t be faked, forgotten, or lost.
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {WHY_OAP.map((prop) => (
              <div key={prop.title} className="rounded-lg border border-line p-6">
                <span className={cn('mb-4 block h-2.5 w-2.5 rounded-full', prop.dotClass)} />
                <div className="mb-2 text-[17px] font-semibold leading-[1.3]">{prop.title}</div>
                <div className="text-[14px] leading-[22px] text-content-secondary">{prop.body}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="border-t border-line">
        <PageContainer className="grid items-center gap-12 py-12 md:grid-cols-[280px_1fr]">
          <div className="w-60 overflow-hidden rounded-lg border border-line bg-white shadow-elev-md">
            <div
              className="relative grid h-[150px] place-items-center overflow-hidden"
              style={{ background: TOKEN_GRADIENTS.blue }}
            >
              <div className="absolute inset-0" style={{ background: CARD_SHEEN }} />
              <div className="absolute left-4 top-[14px] font-mono text-[15px] font-bold text-white/90">
                {TOKEN_SAMPLE.symbol}
              </div>
              <div className="relative font-mono text-[46px] font-bold leading-none tracking-[-1px] text-white">
                #{TOKEN_SAMPLE.edition}
              </div>
            </div>
            <div className="px-[18px] py-4">
              <div className="text-base font-semibold leading-[1.2]">{TOKEN_SAMPLE.topic}</div>
              <div className="mt-2 font-mono text-xs font-medium text-content-secondary">
                {TOKEN_SAMPLE.date} · {TOKEN_SAMPLE.week}
              </div>
              <div className="my-[14px] h-px bg-line" />
              <div className="flex items-center justify-between font-mono text-[11px] font-medium text-content-secondary">
                <span>
                  Edition {TOKEN_SAMPLE.edition} / {TOKEN_SAMPLE.editionOf}
                </span>
                <a
                  href={CONTRACT_BASESCAN_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 transition hover:text-blue-600"
                >
                  Base ↗
                </a>
              </div>
            </div>
          </div>

          <div>
            <Eyebrow className={cn('mb-2', MKT_EYEBROW)}>Anatomy of a token</Eyebrow>
            <h2 className="mb-5 text-[26px] font-semibold leading-8 tracking-[-0.8px]">
              Every meeting, permanently on record.
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {TOKEN_FACTS.map((fact) => (
                <div key={fact.label}>
                  <div className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-content-secondary">
                    {fact.label}
                  </div>
                  <div className="text-sm font-medium leading-[1.3]">{fact.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-3">
              <span className="font-mono text-[13px] font-medium text-ink">Contract</span>
              <CopyChip value={CONTRACT_ADDRESS} display={CONTRACT_DISPLAY} />
            </div>
          </div>
        </PageContainer>
      </section>

      <Footer />
    </div>
  );
}
