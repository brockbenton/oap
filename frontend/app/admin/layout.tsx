'use client';

export const dynamic = 'force-dynamic';

import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getAdminMe } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/queryKeys';
import { retryUnlessForbidden, ApiRequestError } from '@/lib/api/client';
import Brand from '@/components/shared/Brand';

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
    return <div className="min-h-screen bg-canvas">{children}</div>;
  }

  const account = user?.email?.address ?? user?.google?.email ?? me.walletAddress;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside className="hidden md:flex md:w-60 shrink-0 flex-col bg-surface text-content-muted">
        <div className="px-5 h-16 flex items-center gap-3 border-b border-line">
          <Brand className="text-content" />
          <p className="text-sm text-content-secondary">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-line space-y-2">
          <Link href="/" className="block px-3 py-2 rounded-lg text-sm text-content-muted hover:bg-raised">
            ← Back to app
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-content-muted hover:bg-raised"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-surface border-b border-line flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <span className="md:hidden text-sm font-semibold text-content">Admin</span>
            <nav className="flex md:hidden items-center gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <NavPill key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-content-secondary truncate max-w-[180px]">{account}</span>
            <span className="inline-flex items-center rounded bg-raised text-content-secondary text-xs px-2 py-1">
              Admin
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-5 md:p-8">{children}</main>
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
        active ? 'bg-raised text-green' : 'text-content-muted hover:bg-raised hover:text-content'
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
      className={`whitespace-nowrap px-3 py-1.5 rounded text-xs font-medium ${
        active ? 'bg-raised text-green' : 'text-content-secondary hover:bg-raised'
      }`}
    >
      {item.label}
    </Link>
  );
}

function AdminSplash({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas flex items-center justify-center">{children}</div>;
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-green border-t-transparent rounded-full animate-spin" />;
}

function AdminSignIn() {
  const { login } = usePrivy();
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-green mx-auto flex items-center justify-center text-canvas text-lg font-bold">
          A
        </div>
        <div className="space-y-1">
          <h1 className="text-content text-lg font-semibold">Admin Dashboard</h1>
          <p className="text-content-muted text-sm">Sign in with an admin account to manage the club.</p>
        </div>
        <button
          onClick={login}
          className="w-full py-2.5 rounded-xl bg-green text-canvas font-semibold hover:bg-green-dim transition-colors"
        >
          Admin sign in
        </button>
        <Link href="/" className="block text-content-muted text-sm hover:text-content">
          ← Back to app
        </Link>
      </div>
    </div>
  );
}

function AccessDenied({ notAdmin }: { notAdmin: boolean }) {
  const { logout } = usePrivy();
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-8 text-center space-y-4">
        <h1 className="text-content text-lg font-semibold">Access denied</h1>
        <p className="text-content-muted text-sm">
          {notAdmin
            ? 'This account does not have admin privileges.'
            : 'Could not verify admin access. Please try again.'}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-green text-canvas font-semibold hover:bg-green-dim transition-colors"
          >
            Back to app
          </Link>
          <button onClick={logout} className="text-content-muted text-sm hover:text-content">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
