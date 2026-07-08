import Link from 'next/link';
import MarketingNav from '@/components/shared/MarketingNav';
import { Button, Eyebrow } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const HERO_GRADIENT = 'radial-gradient(120% 120% at 0% 0%, #f2f7fe 0%, #ffffff 55%)';
const CARD_SHEEN = 'radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 55%)';

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
    meta: 'MAR 14 · 240 minted',
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

export default function Page() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="border-b border-line">
          <MarketingNav />
        </div>

        <section
          className="grid gap-10 px-5 pb-14 pt-12 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pt-16"
          style={{ background: HERO_GRADIENT }}
        >
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
        </section>

        <section className="border-t border-line px-5 py-14 md:px-10">
          <Eyebrow className="mb-2 tracking-[0.12em] text-status-neutral">How it works</Eyebrow>
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
        </section>
      </div>
    </div>
  );
}
