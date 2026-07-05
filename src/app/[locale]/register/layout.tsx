import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Create Account",
  ar: "إنشاء حساب",
};

const descriptions = {
  en: "Create your Sasan Perfumes account to save orders and favorites.",
  ar: "إنشاء حساب في ساسان للعطور لحفظ الطلبات والمفضلات.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? titles.ar : titles.en,
    description: isAr ? descriptions.ar : descriptions.en,
    robots: NOINDEX_NOFOLLOW_ROBOTS,
  };
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
