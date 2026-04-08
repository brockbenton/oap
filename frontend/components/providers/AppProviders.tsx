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

  // During SSR / static generation Privy cannot be initialized (browser APIs unavailable).
  // Render children directly; Privy mounts after hydration on the client.
  if (typeof window === 'undefined' || !appId) {
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
          loginMethods: ['email', 'google', 'discord'],
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  );
}
