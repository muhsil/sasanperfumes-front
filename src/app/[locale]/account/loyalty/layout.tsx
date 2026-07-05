import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Loyalty Rewards",
  ar: "مكافآت الولاء",
};

const descriptions = {
  en: "Check your loyalty points and available rewards.",
  ar: "التحقق من نقاط الولاء والمكافآت المتاحة.",
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

export default function AccountLoyaltyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
