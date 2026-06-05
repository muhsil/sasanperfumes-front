import type { Metadata } from "next";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { type Locale } from "@/config/site";

interface StoreLocatorLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRTL = locale === "ar";

  return generateSeoMetadata({
    title: isRTL ? "ساسان للعطور | مواقعنا" : "Sasan Perfumes | Our Stores",
    description: isRTL
      ? "تفضل بزيارة مواقع ساسان للعطور في الإمارات لمعرفة أقرب فرع والحصول على تفاصيل الاتصال."
      : "Find Sasan Perfumes store locations across the UAE and reach us for store details, directions, and contact information.",
    locale: locale as Locale,
    pathname: "/store-listing",
    keywords: isRTL
      ? ["ساسان للعطور", "مواقعنا", "الفروع", "الإمارات", "عطور", "معطر الشعر", "بخاخ الجسم", "أطقم هدايا", "تواصل معنا"]
      : ["Sasan Perfumes", "Our Stores", "store listing", "store locations", "UAE perfume store", "hair mist", "all over spray", "gift sets"],
  });
}

export default function StoreLocatorLayout({ children }: StoreLocatorLayoutProps) {
  return <>{children}</>;
}
