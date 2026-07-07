'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getAdminMe } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden } from '@/lib/api/client';

// Compact account control: a single avatar button that opens a dropdown, so the
// top bar never crowds on mobile. The "Admin dashboard" item only appears for
// wallets that actually hold the on-chain ADMIN_ROLE (probed via /admin/me).
export default function AccountMenu() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const { data: me } = useQuery({
    queryKey: queryKeys.adminMe(user?.id),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return getAdminMe(token);
    },
    enabled: ready && authenticated,
    retry: retryUnlessForbidden,
    staleTime: 0,
    gcTime: 0,
  });

  if (!ready) {
    return (
      <button disabled className="px-4 py-2 rounded-lg bg-blue-500 text-white opacity-50 text-sm font-medium">
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
      >
        Sign in
      </button>
    );
  }

  const account = user?.email?.address ?? user?.google?.email ?? 'Account';
  const initial = account.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-2 hover:bg-gray-50 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
          {initial}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-20"
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="text-sm text-gray-800 truncate">{account}</p>
          </div>
          {me?.isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Admin dashboard
            </Link>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
