'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui';

// How long the root spinner may sit on `!ready` before we treat the session as
// wedged. Healthy init is ~1s; kept far higher so false triggers are rare, and
// a false trigger is bounded (clears Privy auth + reloads once, then re-signs).
const STUCK_TIMEOUT_MS = 15_000;
// Cap on how long we wait for logout() before healing anyway: a wedged session
// can leave logout() hanging, and the clear+reload below is what actually heals.
const LOGOUT_TIMEOUT_MS = 2_000;
// Survives the auto-heal reload within a tab session, so we self-heal at most
// once and never fall into a reload loop if the heal doesn't take.
const RECOVERY_FLAG = 'oap:session-recovery-attempted';
// Scope the clear to Privy's own storage (localStorage `privy:*`, cookies
// `privy-*`) so recovery doesn't wipe unrelated app state.
const PRIVY_KEY_PREFIX = 'privy';
const COOKIE_EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';

const HEALING_LABEL = 'Restoring your session…';
const FAILED_TITLE = 'This is taking longer than expected';
const FAILED_BODY =
  'Your sign-in session looks stuck. Reset it to start fresh — you may need to sign in again.';
const RESET_LABEL = 'Reset session';

/**
 * Drop-in replacement for the root loading spinner that guards against a wedged
 * Privy session (e.g. tokens minted under a rotated app id, which loop on
 * /users/me and never reach `ready`). If the spinner outlives STUCK_TIMEOUT_MS,
 * it clears the session once and reloads; if it's still stuck after that, it
 * surfaces a manual reset instead of spinning forever.
 */
export default function SessionRecoveryGate() {
  const { logout } = usePrivy();
  const [stuck, setStuck] = useState(false);
  const [autoHealed, setAutoHealed] = useState(false);
  const healingRef = useRef(false);
  // Flips true once the gate unmounts (Privy reached `ready`), so a pending
  // auto-heal doesn't clobber a session that recovered during its logout window.
  const unmountedRef = useRef(false);

  useEffect(() => {
    // Reset here (not just at declaration) so StrictMode's dev remount doesn't
    // leave the ref stuck true from the first cleanup, which would cancel every
    // subsequent auto-heal.
    unmountedRef.current = false;
    setAutoHealed(hasAttemptedRecovery());
    const id = window.setTimeout(() => setStuck(true), STUCK_TIMEOUT_MS);
    return () => {
      unmountedRef.current = true;
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!stuck || autoHealed || healingRef.current) return;
    healingRef.current = true;
    markRecoveryAttempted();
    void resetSession(logout, () => unmountedRef.current);
  }, [stuck, autoHealed, logout]);

  if (!stuck) return <Spinner />;
  if (!autoHealed) return <Spinner label={HEALING_LABEL} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm animate-fade-in rounded-lg border border-line bg-white p-8 text-center">
        <h1 className="text-lg font-semibold tracking-[-0.3px]">{FAILED_TITLE}</h1>
        <p className="mt-2 text-sm leading-5 text-content-secondary">{FAILED_BODY}</p>
        <Button variant="primary" className="mt-6 w-full" onClick={() => resetSession(logout)}>
          {RESET_LABEL}
        </Button>
      </div>
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink border-t-transparent" />
      {label && <p className="text-sm text-content-secondary">{label}</p>}
    </div>
  );
}

async function resetSession(logout: () => Promise<void>, isCancelled: () => boolean = () => false) {
  // Never block the reload on logout(): a wedged session can leave it hanging,
  // stranding the user on the healing spinner — the very failure this recovers
  // from. Bounded here; the swallowed rejection lets clear+reload run regardless.
  try {
    await Promise.race([logout(), delay(LOGOUT_TIMEOUT_MS)]);
  } catch {
    // logout() rejected; the local clear below is what actually heals.
  }
  // Privy reached `ready` during the logout window and the gate unmounted —
  // wiping now would clobber a session that just recovered on its own.
  if (isCancelled()) return;
  try {
    clearPrivyStorage();
  } catch {
    // Storage access can throw in locked-down contexts; reload still helps.
  }
  window.location.reload();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Treat unreachable sessionStorage (sandboxed iframe, block-all-storage) as
// "already attempted": we can't persist the once-only flag, so never auto-heal
// (which could reload-loop) — fall through to the manual reset instead.
function hasAttemptedRecovery(): boolean {
  try {
    return window.sessionStorage.getItem(RECOVERY_FLAG) === '1';
  } catch {
    return true;
  }
}

function markRecoveryAttempted() {
  try {
    window.sessionStorage.setItem(RECOVERY_FLAG, '1');
  } catch {
    // Non-fatal: clearing the privy* tokens removes the wedge itself, so the
    // next load reaches `ready` and unmounts the gate even if the flag is lost.
  }
}

function clearPrivyStorage() {
  const store = window.localStorage;
  for (let i = store.length - 1; i >= 0; i -= 1) {
    const key = store.key(i);
    if (key?.toLowerCase().startsWith(PRIVY_KEY_PREFIX)) store.removeItem(key);
  }
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name?.toLowerCase().startsWith(PRIVY_KEY_PREFIX)) {
      document.cookie = `${name}=;expires=${COOKIE_EPOCH};path=/`;
    }
  }
}
