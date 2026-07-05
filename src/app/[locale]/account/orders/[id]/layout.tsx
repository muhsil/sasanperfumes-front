import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: (id: string) => `Order #${id}`,
  ar: (id: string) => `الطلب #${id}`,
};

const descriptions = {
  en: "Review order details, payment status, shipping, and invoice information.",
  ar: "مراجعة تفاصيل الطلب وحالة الدفع والشحن ومعلومات الفاتورة.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const isAr = locale === "ar";

  return {
    title: isAr ? titles.ar(id) : titles.en(id),
    description: isAr ? descriptions.ar : descriptions.en,
    robots: NOINDEX_NOFOLLOW_ROBOTS,
  };
}

export default function OrderDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
