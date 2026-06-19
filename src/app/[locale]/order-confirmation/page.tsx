import { Suspense } from "react";
import OrderConfirmationClient from "./OrderConfirmationClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function LoadingFallback({ locale }: { locale: string }) {
  const isRTL = locale === "ar";
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"></div>
        <p className="text-gray-600">{isRTL ? "جاري التحميل..." : "Loading..."}</p>
      </div>
    </div>
  );
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { locale } = await params;
  
  return (
    <Suspense fallback={<LoadingFallback locale={locale} />}>
      <OrderConfirmationClient locale={locale} />
    </Suspense>
  );
}
