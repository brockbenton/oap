'use client';

export const dynamic = 'force-dynamic';

import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getAdminMe } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import { APP_NAME } from '@/lib/constants';

const NAV = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/sessions', label: 'Sessions', exact: false },
  { href: '/admin/members', label: 'Members', exact: false },
  { href: '/admin/roles', label: 'Roles', exact: false },
];

const QR_ROUTE = /^\/admin\/sessions\/[^/]+\/qr$/;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const pathname = usePathname() ?? '';
  const queryClient = useQueryClient();

  // Authorization must be per-identity and never served stale: key by Privy user
  // id and disable caching so a different (or signed-out) user can never inherit
  // a previous admin's cached verdict on a shared/kiosk browser.
  const { data: me, isLoading, isError, error } = useQuery({
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

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  if (!ready || (authenticated && isLoading)) return <AdminSplash>{<Spinner />}</AdminSplash>;
  if (!authenticated) return <AdminSignIn />;
  if (isError || !me?.isAdmin) {
    const forbidden = error instanceof ApiRequestError && error.status === 403;
    return <AccessDenied notAdmin={forbidden || !me?.isAdmin} />;
  }

  // The QR display route is meant for a projector — render it full-bleed (still gated).
  if (QR_ROUTE.test(pathname)) {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  const account = user?.email?.address ?? user?.google?.email ?? me.walletAddress;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="px-5 h-16 flex items-center gap-2 border-b border-white/10">
          <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
            A
          </span>
          <div className="leading-tight">
            <p className="text-white text-sm font-semibold">Admin Console</p>
            <p className="text-[11px] text-slate-400">{APP_NAME}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          <Link href="/" className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5">
            ← Back to app
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <span className="md:hidden text-sm font-semibold text-slate-900">Admin</span>
            <nav className="flex md:hidden items-center gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <NavPill key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[180px]">{account}</span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1">
              Admin
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

// ── components ───────────────────────────────────────────────────────────────

function NavLink({ item, pathname }: { item: (typeof NAV)[number]; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {item.label}
    </Link>
  );
}

function NavPill({ item, pathname }: { item: (typeof NAV)[number]; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {item.label}
    </Link>
  );
}

function AdminSplash({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center">{children}</div>;
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />;
}

function AdminSignIn() {
  const { login } = usePrivy();
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-blue-500 mx-auto flex items-center justify-center text-white text-lg font-bold">
          A
        </div>
        <div className="space-y-1">
          <h1 className="text-white text-lg font-semibold">Admin Console</h1>
          <p className="text-slate-400 text-sm">Sign in with an admin account to manage the club.</p>
        </div>
        <button
          onClick={login}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          Admin sign in
        </button>
        <Link href="/" className="block text-slate-400 text-sm hover:text-slate-200">
          ← Back to app
        </Link>
      </div>
    </div>
  );
}

function AccessDenied({ notAdmin }: { notAdmin: boolean }) {
  const { logout } = usePrivy();
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-8 text-center space-y-4">
        <h1 className="text-white text-lg font-semibold">Access denied</h1>
        <p className="text-slate-400 text-sm">
          {notAdmin
            ? 'This account does not have admin privileges.'
            : 'Could not verify admin access. Please try again.'}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to app
          </Link>
          <button onClick={logout} className="text-slate-400 text-sm hover:text-slate-200">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
