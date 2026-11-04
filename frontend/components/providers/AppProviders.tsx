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
  // No `typeof window` gate on purpose: it would fork server vs. first client
  // paint, forcing a hydration mismatch that re-mounts the (SSR-safe) provider.
  // next.config.mjs fails the build when this env var is missing.
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
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
