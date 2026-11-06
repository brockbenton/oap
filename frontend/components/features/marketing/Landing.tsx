import EnterButton from '@/components/features/marketing/EnterButton';
import TokenFan from '@/components/features/marketing/TokenFan';
import Brand from '@/components/shared/Brand';
import Footer from '@/components/shared/Footer';
import PageContainer from '@/components/shared/PageContainer';
import { APP_NAME, DOC_SECTIONS } from '@/lib/constants';

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-canvas">
      <section className="flex min-h-screen flex-col">
        <PageContainer className="flex h-16 shrink-0 items-center">
          <Brand href="/" />
        </PageContainer>
        <PageContainer className="grid flex-1 items-center gap-8 pb-16 md:grid-cols-2">
          <div>
            <p className="mb-4 font-mono text-sm text-content-secondary">{APP_NAME}</p>
            <h1 className="mb-10 text-[48px] leading-[52px] sm:text-[72px] sm:leading-[76px]">
              Your club,
              <br />
              onchain
            </h1>
            <EnterButton size="lg" />
          </div>
          <TokenFan />
        </PageContainer>
      </section>

      <section className="border-t border-line bg-surface">
        <PageContainer className="py-16 md:py-24">
          <h2 className="mb-6 text-sm text-content-secondary">Docs</h2>
          <ul className="border-b border-line">
            {DOC_SECTIONS.map((section) => (
              <li key={section.id} className="border-t border-line">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-mono text-[18px] leading-7 transition-colors hover:text-green sm:text-2xl [&::-webkit-details-marker]:hidden">
                    {section.title}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-content-secondary transition-transform duration-200 group-open:rotate-45 group-open:text-green"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[60ch] animate-fade-in pb-6 text-sm leading-[22px] text-content-secondary">
                    {section.body ?? 'Coming soon'}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      <Footer />
    </div>
  );
}
