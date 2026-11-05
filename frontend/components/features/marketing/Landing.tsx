import Link from 'next/link';
import AttendanceStack from '@/components/features/marketing/AttendanceStack';
import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import Footer from '@/components/shared/Footer';
import { Button, CopyChip, Eyebrow } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import { TOKEN_COLORS } from '@/lib/tokenArt';
import { APP_SHORT_NAME, BASESCAN_URL } from '@/lib/constants';

const PROTOCOL_ANCHOR = 'protocol';
const DEPLOYED_CONTRACT = '0x7bEf8C32157C0A40A51b9bebeb7B36f236316192';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? DEPLOYED_CONTRACT;
const CONTRACT_DISPLAY = `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`;
const CONTRACT_BASESCAN_HREF = `${BASESCAN_URL}/address/${CONTRACT_ADDRESS}`;

interface HowStep {
  number: string;
  title: string;
  body: string;
}

const HOW_STEPS: HowStep[] = [
  {
    number: '01',
    title: 'Scan the meeting QR',
    body: 'Each meeting shows a unique code on the projector. No wallet setup. Sign in with email or Google.',
  },
  {
    number: '02',
    title: 'Mint your token',
    body: 'A collectible with the date, topic, and edition number is minted to your embedded wallet, gas covered.',
  },
  {
    number: '03',
    title: 'Build your streak',
    body: "Show up weekly to build your streak and rise on your club's leaderboard.",
  },
];

interface ValueProp {
  title: string;
  body: string;
}

const WHY_OCP: ValueProp[] = [
  {
    title: 'Tamper-proof by default',
    body: 'Every check-in is a soulbound token: non-transferable, timestamped, and impossible to backfill or fake after the fact.',
  },
  {
    title: 'Zero friction to join',
    body: 'Members sign in with email or Google. We provision an embedded wallet and sponsor the gas: no seed phrase, no ETH, no extension.',
  },
  {
    title: 'Motivation built in',
    body: 'Streaks and club leaderboards turn showing up into something members actually want to keep doing.',
  },
  {
    title: 'A record they own',
    body: 'Attendance lives onchain, not in a spreadsheet: portable, publicly verifiable, and theirs to keep long after they leave.',
  },
];

interface TokenFact {
  label: string;
  value: string;
}

const TOKEN_FACTS: TokenFact[] = [
  { label: 'Standard', value: 'ERC-1155, soulbound' },
  { label: 'Metadata', value: 'Topic · date · edition · club' },
  { label: 'Gas', value: 'Sponsored, $0 to member' },
];

const TOKEN_SAMPLE = {
  symbol: 'SOL',
  edition: 128,
  topic: 'Intro to Solidity',
  date: 'Apr 04, 2026',
  week: 'Week 6',
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingNav />

      <section>
        <PageContainer className="grid gap-10 pb-16 pt-16 md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-24">
          <div className="self-center">
            <h2 className="mb-5 text-[44px] font-medium leading-[46px] sm:text-[60px] sm:leading-[60px]">
              Proof you
              <br />
              showed up.
              <br />
              <span className="text-green">Onchain.</span>
            </h2>
            <p className="mb-8 max-w-[38ch] text-[19px] leading-[29px] text-content-secondary [text-wrap:pretty]">
              Scan the QR at your club meeting and mint a permanent attendance token. Build streaks and climb the leaderboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/check-in">
                <Button variant="primary" size="lg">
                  Check in to a meeting
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>

          <AttendanceStack />
        </PageContainer>
      </section>

      <section>
        <PageContainer className="py-16 md:py-24">
          <Eyebrow className="mb-2">How it works</Eyebrow>
          <h3 className="mb-12 text-[30px] font-medium leading-[38px]">
            Three taps from seat to onchain.
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {HOW_STEPS.map((step) => (
              <div key={step.number} className="rounded-lg border border-line p-6">
                <div className="mb-10 font-mono text-xs text-content-muted">{step.number}</div>
                <div className="mb-2 text-base font-medium leading-[1.3]">{step.title}</div>
                <div className="text-[14px] leading-[22px] text-content-secondary">{step.body}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section id={PROTOCOL_ANCHOR} className="scroll-mt-20">
        <PageContainer className="py-16 md:py-24">
          <Eyebrow className="mb-2">Why {APP_SHORT_NAME}</Eyebrow>
          <h3 className="mb-12 max-w-[22ch] text-[30px] font-medium leading-[38px]">
            Attendance that can&apos;t be faked, forgotten, or lost.
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY_OCP.map((prop) => (
              <div key={prop.title} className="rounded-lg border border-line p-6">
                <div className="mb-2 text-base font-medium leading-[1.3]">{prop.title}</div>
                <div className="text-[14px] leading-[22px] text-content-secondary">{prop.body}</div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section>
        <PageContainer className="grid items-center gap-12 py-16 md:grid-cols-[280px_1fr] md:py-24">
          <div className="w-60 overflow-hidden rounded-lg border border-line bg-surface">
            <div
              className="relative grid h-[150px] place-items-center overflow-hidden"
              style={{ background: TOKEN_COLORS.blue }}
            >
              <div className="absolute left-4 top-4 font-mono text-[15px] font-bold text-content">
                {TOKEN_SAMPLE.symbol}
              </div>
              <div className="relative font-mono text-[46px] font-bold leading-none text-content">
                #{TOKEN_SAMPLE.edition}
              </div>
            </div>
            <div className="p-4">
              <div className="text-base font-semibold leading-[1.2]">{TOKEN_SAMPLE.topic}</div>
              <div className="mt-2 font-mono text-xs font-medium text-content-secondary">
                {TOKEN_SAMPLE.date} · {TOKEN_SAMPLE.week}
              </div>
              <div className="my-4 h-px bg-line" />
              <div className="flex items-center justify-between font-mono text-[11px] font-medium text-content-secondary">
                <span>
                  Edition {TOKEN_SAMPLE.edition}
                </span>
                <a
                  href={CONTRACT_BASESCAN_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan transition-colors hover:text-content"
                >
                  Basescan ↗
                </a>
              </div>
            </div>
          </div>

          <div>
            <Eyebrow className="mb-2">Anatomy of a token</Eyebrow>
            <h2 className="mb-5 text-[26px] font-medium leading-8">
              Every meeting, permanently on record.
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {TOKEN_FACTS.map((fact) => (
                <div key={fact.label}>
                  <div className="mb-2 font-mono text-xs text-content-secondary">
                    {fact.label}
                  </div>
                  <div className="text-sm font-medium leading-[1.3]">{fact.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-3">
              <span className="font-mono text-[13px] font-medium text-content">Contract</span>
              <CopyChip value={CONTRACT_ADDRESS} display={CONTRACT_DISPLAY} />
            </div>
          </div>
        </PageContainer>
      </section>

      <Footer />
    </div>
  );
}
