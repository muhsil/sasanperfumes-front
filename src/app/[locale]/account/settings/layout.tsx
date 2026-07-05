import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Account Settings",
  ar: "إعدادات الحساب",
};

const descriptions = {
  en: "Update your profile, password, and account preferences.",
  ar: "تحديث الملف الشخصي وكلمة المرور وتفضيلات الحساب.",
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

export default function AccountSettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
