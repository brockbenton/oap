import Footer from '@/components/shared/Footer';
import MarketingNav from '@/components/shared/MarketingNav';
import PageContainer from '@/components/shared/PageContainer';
import { DOC_SECTIONS } from '@/lib/constants';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingNav />
      <PageContainer className="max-w-[760px] py-16 md:py-24">
        <h1 className="mb-16 text-[40px] leading-[48px]">Docs</h1>
        <div className="space-y-16">
          {DOC_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="text-2xl leading-8">{section.title}</h2>
            </section>
          ))}
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
