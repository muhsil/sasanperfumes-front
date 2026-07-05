import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW_ROBOTS } from "@/lib/utils/seo";

const titles = {
  en: (id: string) => `Invoice #${id}`,
  ar: (id: string) => `فاتورة #${id}`,
};

const descriptions = {
  en: "View or print the invoice for your order.",
  ar: "عرض أو طباعة فاتورة طلبك.",
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

export default function OrderInvoiceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
