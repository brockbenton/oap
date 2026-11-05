import EnterButton from '@/components/features/marketing/EnterButton';
import Brand from '@/components/shared/Brand';

export default function MarketingNav() {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
        <Brand href="/" />
        <EnterButton />
      </div>
    </header>
  );
}
