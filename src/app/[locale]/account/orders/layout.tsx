import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: "Orders",
  ar: "الطلبات",
};

const descriptions = {
  en: "View and track your Sasan Perfumes order history.",
  ar: "عرض وتتبع سجل طلباتك من ساسان للعطور.",
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

export default function AccountOrdersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
