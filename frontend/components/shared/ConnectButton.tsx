'use client';

import { usePrivy } from '@privy-io/react-auth';

export default function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-blue-500 text-white opacity-50 cursor-not-allowed text-sm font-medium"
      >
        Loading...
      </button>
    );
  }

  if (authenticated) {
    const email = user?.email?.address ?? user?.google?.email ?? 'Account';
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 truncate max-w-[160px]">{email}</span>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
    >
      Sign in
    </button>
  );
}
