'use client';

import { useState, useCallback } from 'react';
import { usePrivy, useWallets, useSignMessage, getIdentityToken } from '@privy-io/react-auth';
import { useMutation } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { submitCheckIn } from '@/lib/api/check-in';
import { ApiRequestError } from '@/lib/api/client';
import { CheckInResponse } from '@/types';

// QrScanner accesses browser APIs — load client-side only
const QrScanner = dynamic(() => import('./QrScanner'), { ssr: false });

type CheckInStep = 'scan' | 'signing' | 'submitting' | 'success' | 'error';

interface CheckInFlowProps {
  onRestart: () => void;
}

export default function CheckInFlow({ onRestart }: CheckInFlowProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const [step, setStep] = useState<CheckInStep>('scan');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [result, setResult] = useState<CheckInResponse | null>(null);

  const { mutate: processCheckIn } = useMutation({
    mutationFn: async (qrPayload: string) => {
      // 1. Get the member's embedded wallet address
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const walletAddress = embeddedWallet?.address ?? user?.wallet?.address;
      if (!walletAddress) {
        throw new Error('No wallet linked to your account. Please sign out and sign in again.');
      }

      const normalizedAddress = walletAddress.toLowerCase();

      // 2. Get the identity token for backend auth
      const token = await getIdentityToken();
      if (!token) {
        throw new Error('Failed to get authentication token. Please sign out and try again.');
      }

      // 3. Decode QR to get sessionId (for the message to sign)
      // Decode QR payload and validate sessionId format (numeric string, as stored on-chain)
      let sessionId: string;
      try {
        const decoded = JSON.parse(atob(qrPayload)) as { payload: { sessionId: unknown } };
        const raw = decoded.payload.sessionId;
        if (typeof raw !== 'string' || !/^\d+$/.test(raw) || raw.length > 78) {
          throw new Error('Invalid session ID in QR code.');
        }
        sessionId = raw;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Invalid QR code format.');
      }

      // 4. Sign the check-in message
      setStep('signing');
      const signedAt = Date.now();
      const message = `I am checking into session ${sessionId} as ${normalizedAddress} at ${signedAt}`;

      const { signature } = await signMessage(
        { message },
        {
          uiOptions: {
            title: 'Confirm Check-In',
            description: `Sign to confirm attendance for session ${sessionId}`,
            buttonText: 'Sign & Check In',
          },
        },
      );

      // 5. Submit to backend
      setStep('submitting');
      return submitCheckIn({
        qrPayload,
        memberSignature: signature as `0x${string}`,
        signedAt,
        token,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('success');
    },
    onError: (err) => {
      if (err instanceof ApiRequestError) {
        switch (err.code) {
          case 'ALREADY_CHECKED_IN':
            setErrorMessage('You already checked in to this session.');
            break;
          case 'INVALID_QR':
            setErrorMessage('This QR code is invalid or has expired. Ask the admin to regenerate it.');
            break;
          case 'SESSION_CLOSED':
            setErrorMessage('This session is already closed.');
            break;
          case 'STALE_SIGNATURE':
            setErrorMessage('Your signature timed out. Please try again.');
            break;
          default:
            setErrorMessage(err.message.slice(0, 200));
        }
      } else {
        setErrorMessage((err instanceof Error ? err.message : 'Something went wrong. Please try again.').slice(0, 200));
      }
      setStep('error');
    },
  });

  const handleScan = useCallback(
    (qrPayload: string) => {
      if (step !== 'scan') return;
      setStep('signing');
      processCheckIn(qrPayload);
    },
    [step, processCheckIn],
  );

  const handleScanError = useCallback((error: string) => {
    setErrorMessage(`Camera error: ${error}`);
    setStep('error');
  }, []);

  if (step === 'scan') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">Scan QR Code</h2>
          <p className="text-sm text-gray-500">Hold your phone up to the projected QR code</p>
        </div>
        <QrScanner onScan={handleScan} onError={handleScanError} />
      </div>
    );
  }

  if (step === 'signing') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Waiting for signature...</p>
          <p className="text-sm text-gray-500">Approve the signing request in the popup</p>
        </div>
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Submitting check-in...</p>
          <p className="text-sm text-gray-500">Queuing your attendance token on the blockchain</p>
        </div>
      </div>
    );
  }

  if (step === 'success' && result) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">You&apos;re checked in!</h2>
          <p className="text-gray-500 text-sm">
            Your attendance token is being minted. It will appear in your wallet shortly.
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Session</span>
            <span className="font-mono text-gray-800 text-xs truncate max-w-[160px]">{result.sessionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-amber-600 font-medium">Minting...</span>
          </div>
        </div>
      </div>
    );
  }

  // error state
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Check-in failed</h2>
        <p className="text-red-600 text-sm">{errorMessage}</p>
      </div>
      <button
        onClick={onRestart}
        className="w-full py-3 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
