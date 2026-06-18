import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function LoadingFallback({ locale }: { locale: string }) {
  const isRTL = locale === "ar";
  return (
    <div className="min-h-screen overflow-x-clip pb-44 md:pb-8" style={{ backgroundColor: 'var(--color-beige)' }}>
      <div className="container mx-auto px-3 py-4 md:px-7 md:py-8 lg:px-12">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"></div>
            <p className="text-gray-600">{isRTL ? "جاري التحميل..." : "Loading checkout..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  
  return (
    <Suspense fallback={<LoadingFallback locale={locale} />}>
      <CheckoutClient />
    </Suspense>
  );
}
