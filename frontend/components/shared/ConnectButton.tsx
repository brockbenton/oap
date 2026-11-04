'use client';

import { usePrivy } from '@privy-io/react-auth';

export default function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-green text-canvas opacity-50 cursor-not-allowed text-sm font-medium"
      >
        Loading...
      </button>
    );
  }

  if (authenticated) {
    const email = user?.email?.address ?? user?.google?.email ?? 'Account';
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-content-secondary truncate max-w-[160px]">{email}</span>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg border border-line text-content hover:bg-raised text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 rounded-lg bg-green text-canvas hover:bg-green-dim text-sm font-medium transition-colors"
    >
      Sign in
    </button>
  );
}
