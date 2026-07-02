"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk/i.test(error.message) ||
    /failed to fetch dynamically imported module/i.test(error.message)
  );
}

const CHUNK_ERROR_RELOAD_KEY = "sasanperfumes_checkout_chunk_reload";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const marketPrefix = useMarketPrefix();
  const isRTL = locale === "ar";

  const shouldAutoReload =
    isChunkLoadError(error) &&
    typeof window !== "undefined" &&
    !sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);

  useEffect(() => {
    console.error("[Checkout Error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    if (shouldAutoReload) {
      sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, "1");
      window.location.reload();
    }
  }, [error, shouldAutoReload]);

  if (shouldAutoReload) {
    return null;
  }

  return (
    <div className="min-h-[50vh] px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-brand-primary">
          {isRTL ? "تعذّر تحميل الدفع" : "Checkout unavailable"}
        </h1>
        <p className="mb-6 text-brand-muted">
          {isRTL
            ? "حدث خطأ أثناء تحميل صفحة الدفع. يرجى المحاولة مرة أخرى."
            : "An error occurred while loading the checkout page. Please try again."}
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY);
              reset();
            }}
            className="rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
          >
            {isRTL ? "حاول مرة أخرى" : "Try again"}
          </button>
          <button
            onClick={() => router.push(`${marketPrefix}/${locale}/cart`)}
            className="text-sm text-brand-muted underline transition-colors hover:text-brand-primary"
          >
            {isRTL ? "العودة إلى السلة" : "Return to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
