import Link from 'next/link';
import EnterButton from '@/components/features/marketing/EnterButton';
import TokenFan from '@/components/features/marketing/TokenFan';
import Brand from '@/components/shared/Brand';
import Footer from '@/components/shared/Footer';
import PageContainer from '@/components/shared/PageContainer';
import { ArrowRight } from '@/components/ui/icons';
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

      <section>
        <PageContainer className="pb-24 pt-8">
          <h2 className="mb-6 text-sm text-content-secondary">Docs</h2>
          <ul className="border-b border-line">
            {DOC_SECTIONS.map((section) => (
              <li key={section.id} className="border-t border-line">
                <Link
                  href={`/docs#${section.id}`}
                  className="flex items-center justify-between gap-6 py-6 font-mono text-[18px] leading-7 transition-colors hover:text-green sm:text-2xl"
                >
                  {section.title}
                  <ArrowRight size={18} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      <Footer />
    </div>
  );
}
