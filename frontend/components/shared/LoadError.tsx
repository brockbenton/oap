'use client';

interface LoadErrorProps {
  what: string;
  onRetry: () => void;
}

// Friendly, non-alarming failure state with a retry (a failed load is usually a
// transient connection issue, not an app error).
export default function LoadError({ what, onRetry }: LoadErrorProps) {
  return (
    <div className="fade-in flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.4 14.55A1.5 1.5 0 003.24 21h17.52a1.5 1.5 0 001.3-2.51L13.66 3.94a1.5 1.5 0 00-2.6 0z" />
        </svg>
      </div>
      <p className="text-gray-900 font-semibold">Couldn&apos;t load your {what}</p>
      <p className="text-gray-500 text-sm mt-1 max-w-xs">This is usually a temporary connection issue.</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
