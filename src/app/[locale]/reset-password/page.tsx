import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";
import { AuthBackground } from "@/components/common/AuthBackground";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? "إعادة تعيين كلمة المرور" : "Reset Password",
    description: isAr
      ? "إنشاء كلمة مرور جديدة لحسابك."
      : "Create a new password for your account.",
    robots: NOINDEX_NOFOLLOW_ROBOTS,
  };
}

function LoadingFallback() {
  return (
    <AuthBackground showImage={false} className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md">
        <div className="luxury-panel p-5 md:p-7">
          <div className="mb-8 text-center">
            <div className="h-8 w-48 mx-auto skeleton-shimmer rounded"></div>
            <div className="h-4 w-64 mx-auto mt-4 skeleton-shimmer rounded"></div>
          </div>
          <div className="space-y-5">
            <div className="h-12 skeleton-shimmer rounded"></div>
            <div className="h-12 skeleton-shimmer rounded"></div>
            <div className="h-12 skeleton-shimmer rounded"></div>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params;
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm locale={locale} />
    </Suspense>
  );
}
