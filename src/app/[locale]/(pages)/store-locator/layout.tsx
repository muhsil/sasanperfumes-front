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
    title: isRTL ? "مواقع متاجرنا | فروع الإمارات وعمان" : "Store Locator | Find Our Perfume Shops in UAE & Oman",
    description: isRTL
      ? "اعثر على أقرب فرع لـ ShapeHive. 6 متاجر في أبوظبي والعين والفجيرة ومسقط. زورونا واستمتعوا بتجربة عطرية فريدة. مفتوح 10 ص - 10 م."
      : "Find the nearest ShapeHive store. 6 locations in Abu Dhabi, Al Ain, Fujairah & Muscat. Visit us for a unique aromatic experience. Open 10AM-10PM.",
    locale: locale as Locale,
    pathname: "/store-locator",
    keywords: isRTL
      ? ["مواقع المتاجر", "فروع العطور", "متجر عطور أبوظبي", "متجر عطور العين", "متجر عطور الفجيرة", "عطور مسقط", "عطور ياس مول", "عطور بوابة الشرق", "عطور بوادي مول", "عطور عمان مول", "ShapeHive فروع", "متجر عطور الإمارات"]
      : ["store locations", "perfume shop Abu Dhabi", "perfume store Al Ain", "fragrance shop Fujairah", "perfume Muscat", "ShapeHive stores", "Yas Mall perfume", "Bawabat Al Sharq perfume", "Bawadi Mall fragrance", "Oman Mall perfume", "UAE perfume stores", "find perfume store near me"],
  });
}

export default function StoreLocatorLayout({ children }: StoreLocatorLayoutProps) {
  return <>{children}</>;
}
