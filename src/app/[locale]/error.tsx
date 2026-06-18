'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Check if the error is a ChunkLoadError (happens when deployment changes chunk hashes)
function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Failed to load chunk') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module')
  );
}

// Session storage key to prevent infinite reload loops
const CHUNK_ERROR_RELOAD_KEY = 'chunk_error_reload_attempted';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Check if this is a chunk load error that should trigger auto-reload
  const shouldAutoReload = isChunkLoadError(error) && 
    typeof window !== 'undefined' && 
    !sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);

  useEffect(() => {
    console.error('Application error:', error);

    // Handle ChunkLoadError by reloading the page
    if (isChunkLoadError(error)) {
      // Check if we already tried reloading to prevent infinite loops
      const hasReloaded = sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);
      
      if (!hasReloaded) {
        // Set flag to prevent infinite reload loop
        sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, 'true');
        // Reload the page after a brief delay to get fresh chunks
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        // Clear the flag after showing the error UI so future chunk errors can trigger reload
        sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY);
      }
    }
  }, [error]);

  // Show loading state while reloading for chunk errors
  if (shouldAutoReload) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="text-lg text-brand-primary">
            Updating application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-brand-primary">
          Something went wrong
        </h1>
        <p className="mb-8 text-lg text-brand-primary">
          We apologize for the inconvenience. Please try again.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-brand-primary px-6 py-3 text-white transition-colors hover:bg-brand-primary"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border-2 border-brand-primary px-6 py-3 text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
          >
            Go to Homepage
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-sm text-brand-gold/50">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
