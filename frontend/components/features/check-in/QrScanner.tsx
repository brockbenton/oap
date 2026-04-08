'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isStartedRef = useRef(false);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || isStartedRef.current) return;

    const containerId = 'qr-scanner-container';
    containerRef.current.id = containerId;

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
        },
        undefined,
      );
      isStartedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start camera';
      onError?.(message);
    }
  }, [onScan, onError]);

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current && isStartedRef.current) {
        scannerRef.current.stop().catch(() => undefined);
        isStartedRef.current = false;
      }
    };
  }, [startScanner]);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden bg-black aspect-square"
      />
      <p className="text-center text-sm text-gray-500 mt-3">
        Point your camera at the QR code on the screen.
      </p>
    </div>
  );
}
