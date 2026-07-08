'use client';

import { usePrivy } from '@privy-io/react-auth';
import Landing from '@/components/features/marketing/Landing';
import MemberHome from '@/components/features/member/MemberHome';

// The root route is auth-gated on the client: logged-out visitors see the
// marketing Landing; signed-in members see their Home command center. Privy
// resolves auth only in the browser, so the switch must be client-side.
export default function RootPage() {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      </div>
    );
  }

  return authenticated ? <MemberHome /> : <Landing />;
}
