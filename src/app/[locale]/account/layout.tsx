import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "My Account",
  ar: "حسابي",
};

const descriptions = {
  en: "Manage your profile, orders, addresses, wishlist, and account preferences.",
  ar: "إدارة الملف الشخصي والطلبات والعناوين وقائمة الرغبات وتفضيلات الحساب.",
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

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
