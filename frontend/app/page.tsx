'use client';

import { usePrivy } from '@privy-io/react-auth';
import Landing from '@/components/features/marketing/Landing';
import MemberHome from '@/components/features/member/MemberHome';
import Onboarding from '@/components/features/member/Onboarding';
import SessionRecoveryGate from '@/components/shared/SessionRecoveryGate';
import { useProfile } from '@/hooks/useProfile';

// The root route is auth-gated on the client: logged-out visitors see the
// marketing Landing; signed-in members see their Home command center. Privy
// resolves auth only in the browser, so the switch must be client-side.
export default function RootPage() {
  const { ready, authenticated } = usePrivy();
  // Hooks must run unconditionally; the query itself is gated on auth, so it
  // stays idle (isLoading === false) for logged-out visitors.
  const { data: profile, isLoading: profileLoading } = useProfile();

  // A wedged Privy session can loop on /users/me and never reach `ready`;
  // SessionRecoveryGate breaks that out of an infinite spinner.
  if (!ready) return <SessionRecoveryGate />;

  if (authenticated) {
    // Wait for the profile before choosing a member screen so we never flash
    // MemberHome to someone who still needs onboarding.
    if (profileLoading) return <FullPageSpinner />;
    if (profile && !profile.username) return <Onboarding />;
    return <MemberHome />;
  }

  return <Landing />;
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
    </div>
  );
}
