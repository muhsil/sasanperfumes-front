import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Profile",
  ar: "الملف الشخصي",
};

const descriptions = {
  en: "Update your personal profile details.",
  ar: "تحديث تفاصيل الملف الشخصي الخاصة بك.",
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

export default function AccountProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
