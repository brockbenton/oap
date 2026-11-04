'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { usePrivy, getIdentityToken } from '@privy-io/react-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import { listAdminRoles, grantAdminRole, revokeAdminRole } from '@/lib/api/admin';
import { ApiRequestError } from '@/lib/api/client';
import { AdminRole } from '@/types';

function truncateWallet(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminRolesPage() {
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  const [newWallet, setNewWallet] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const { data: roles, isLoading, error } = useQuery({
    queryKey: queryKeys.adminRoles(),
    queryFn: async () => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return listAdminRoles(token);
    },
  });

  const grantMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return grantAdminRole(walletAddress, token);
    },
    onSuccess: (newRole: AdminRole) => {
      queryClient.setQueryData<AdminRole[]>(queryKeys.adminRoles(), (prev) =>
        prev ? [newRole, ...prev] : [newRole],
      );
      setNewWallet('');
      setFormError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiRequestError) {
        if (err.status === 503) {
          setNotConfigured(true);
          return;
        }
        if (err.status === 409) {
          setFormError('That wallet already has ADMIN_ROLE.');
          return;
        }
        if (err.status === 400) {
          setFormError('Invalid Ethereum address.');
          return;
        }
      }
      setFormError('Failed to grant role. Try again.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const token = await getIdentityToken();
      if (!token) throw new Error('Not authenticated');
      return revokeAdminRole(walletAddress, token);
    },
    onSuccess: (_data, walletAddress) => {
      queryClient.setQueryData<AdminRole[]>(queryKeys.adminRoles(), (prev) =>
        prev ? prev.filter((r) => r.walletAddress !== walletAddress) : [],
      );
    },
    onError: (err: unknown) => {
      if (err instanceof ApiRequestError && err.status === 503) {
        setNotConfigured(true);
      }
    },
  });

  const myWallet = user?.wallet?.address?.toLowerCase();

  function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = newWallet.trim();
    if (!trimmed) return;
    grantMutation.mutate(trimmed);
  }

  if (notConfigured) {
    return (
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-content mb-4">Admin Roles</h1>
        <div className="rounded-lg border border-amber bg-status-warn-bg p-4 text-status-warn text-sm">
          <strong>Role management is not configured.</strong> Set{' '}
          <code className="font-mono bg-status-warn-bg px-1 rounded">DEFAULT_ADMIN_PRIVATE_KEY</code>{' '}
          on the backend to enable granting and revoking admin roles from the dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full space-y-8">
      <h1 className="text-2xl font-bold text-content">Admin Roles</h1>

      {/* Grant form */}
      <form onSubmit={handleGrant} className="space-y-3">
        <label className="block text-sm font-medium text-content">Grant ADMIN_ROLE</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWallet}
            onChange={(e) => setNewWallet(e.target.value)}
            placeholder="0x…"
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            type="submit"
            disabled={grantMutation.isPending || !newWallet.trim()}
            className="rounded-md bg-green px-4 py-2 text-sm font-medium text-canvas hover:bg-green-dim disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {grantMutation.isPending ? 'Granting…' : 'Grant'}
          </button>
        </div>
        {formError && <p className="text-sm text-status-neg">{formError}</p>}
      </form>

      {/* Active roles table */}
      {isLoading && <p className="text-sm text-content-secondary">Loading…</p>}
      {error && <p className="text-sm text-status-neg">Failed to load roles.</p>}

      {roles && roles.length === 0 && (
        <p className="text-sm text-content-secondary">No active admin roles.</p>
      )}

      {roles && roles.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full text-sm">
            <thead className="bg-raised text-left text-xs font-semibold text-content-secondary uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Granted By</th>
                <th className="px-4 py-3">Granted At</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map((role) => {
                const isSelf = role.walletAddress === myWallet;
                const isRevoking =
                  revokeMutation.isPending &&
                  revokeMutation.variables === role.walletAddress;

                return (
                  <tr key={role.id} className="hover:bg-raised">
                    <td className="px-4 py-3 font-mono">
                      <span title={role.walletAddress}>{truncateWallet(role.walletAddress)}</span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-cyan font-sans">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-content-secondary">
                      <span title={role.grantedBy}>{truncateWallet(role.grantedBy)}</span>
                    </td>
                    <td className="px-4 py-3 text-content-secondary">{formatDate(role.grantedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => revokeMutation.mutate(role.walletAddress)}
                          disabled={isRevoking}
                          className="text-xs text-status-neg hover:text-status-neg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRevoking ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
