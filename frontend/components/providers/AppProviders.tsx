'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { baseSepolia } from 'viem/chains';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // No `typeof window` gate on purpose: it would fork server vs. first client
  // paint, forcing a hydration mismatch that re-mounts the (SSR-safe) provider.
  // `appId` is build-inlined and identical both sides, so this branch is stable.
  if (!appId) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={appId}
        config={{
          defaultChain: baseSepolia,
          supportedChains: [baseSepolia],
          appearance: {
            theme: 'light',
            accentColor: '#3b82f6',
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
          loginMethods: ['email', 'google', 'passkey'],
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  );
}
