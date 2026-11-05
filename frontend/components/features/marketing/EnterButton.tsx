'use client';

import { useRouter } from 'next/navigation';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui';
import type { ButtonProps } from '@/components/ui/Button';

const HOME_ROUTE = '/';

// Logged-out visitors go through Privy; the root route then shows their dashboard.
export default function EnterButton({ size }: Pick<ButtonProps, 'size'>) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin({ onComplete: () => router.push(HOME_ROUTE) });

  return (
    <Button
      variant="primary"
      size={size}
      disabled={!ready}
      onClick={() => (authenticated ? router.push(HOME_ROUTE) : login())}
    >
      Enter
    </Button>
  );
}
