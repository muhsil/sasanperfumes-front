import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Wishlist",
  ar: "قائمة الرغبات",
};

const descriptions = {
  en: "View saved products and move them to cart when you are ready.",
  ar: "عرض المنتجات المحفوظة وإضافتها إلى السلة عند الاستعداد.",
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

export default function AccountWishlistLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
