import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import { CopyChip } from '@/components/ui';
import { TOKEN_GRADIENTS } from '@/lib/tokenArt';
import { cn } from '@/lib/cn';

const HERO_GRADIENT = 'radial-gradient(120% 120% at 100% 0%, #f2f7fe 0%, #ffffff 55%)';
const CARD_OVERLAY_CLASSES =
  'absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.35),transparent_55%)]';

const BLUE_ACCENT = 'text-blue-500';
const GREEN_ACCENT = 'text-green-600';

interface PipelineStep {
  number: string;
  title: string;
  desc: string;
  accent: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    number: '01',
    title: 'Organizer opens meeting',
    desc: 'A signed, time-boxed QR is generated for the session.',
    accent: BLUE_ACCENT,
  },
  {
    number: '02',
    title: 'Member scans & signs in',
    desc: 'Privy provisions an embedded wallet from email or Google.',
    accent: BLUE_ACCENT,
  },
  {
    number: '03',
    title: 'Relayer sponsors gas',
    desc: 'A paymaster covers the transaction — the member pays nothing.',
    accent: BLUE_ACCENT,
  },
  {
    number: '04',
    title: 'Token minted onchain',
    desc: 'Soulbound to the wallet in ~2s, with meeting metadata.',
    accent: GREEN_ACCENT,
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

const CONTRACT_ADDRESS = '0xA11c8b3D9f2E7a4C1b6D0e5F8a2C4b7D1e9F3F92';
const CONTRACT_DISPLAY = '0xA11c…3F92';

const EYEBROW_CLASSES =
  'font-mono text-xs uppercase tracking-[0.12em] text-status-neutral';

export default function ProtocolPage() {
  const lastStepIndex = PIPELINE_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-white text-ink">
      <MarketingNav />

      <main>
        <section className="border-t border-line" style={{ background: HERO_GRADIENT }}>
          <PageContainer className="pb-12 pt-[60px]">
            <div className="max-w-[720px]">
              <span className="mb-[22px] inline-flex items-center gap-2 rounded-full bg-status-info-bg px-3 py-1.5 text-[12px] font-semibold text-blue-600">
                ERC-721 · soulbound · Base
              </span>
              <h1 className="mb-[18px] text-[38px] font-semibold leading-[42px] tracking-[-2.5px] md:text-[52px] md:leading-[56px]">
                The attendance layer
                <br />
                for onchain communities.
              </h1>
              <p className="max-w-[56ch] text-[19px] leading-[29px] text-content-secondary [text-wrap:pretty]">
                OAP turns showing up into a permanent, verifiable record. Every check-in mints a
                non-transferable token to the member&apos;s wallet — no gas, no seed phrase, no
                reissue.
              </p>
            </div>
          </PageContainer>
        </section>

        <section className="border-t border-line">
          <PageContainer className="py-12">
            <p className={cn(EYEBROW_CLASSES, 'mb-6')}>The mint pipeline</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE_STEPS.map((step, index) => (
                <div
                  key={step.number}
                  className={cn(
                    'py-[22px]',
                    index !== 0 && 'lg:pl-6',
                    index !== lastStepIndex && 'lg:pr-6',
                    index > 0 && 'border-t border-line lg:border-l lg:border-t-0',
                  )}
                >
                  <div className={cn('mb-3 font-mono text-[13px] font-bold', step.accent)}>
                    {step.number}
                  </div>
                  <div className="mb-1.5 text-[15px] font-semibold leading-[1.3]">{step.title}</div>
                  <div className="text-[13px] leading-5 text-content-secondary">{step.desc}</div>
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
                <div className={CARD_OVERLAY_CLASSES} />
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
                  <span className="text-blue-500">Base ↗</span>
                </div>
              </div>
            </div>

            <div>
              <p className={cn(EYEBROW_CLASSES, 'mb-2')}>Anatomy of a token</p>
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
      </main>
    </div>
  );
}
