import type { Metadata } from "next";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { type Locale } from "@/config/site";

interface CartLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return generateSeoMetadata({
    title: locale === "ar" ? "سلة التسوق" : "Shopping Cart",
    description: locale === "ar" ? "عرض سلة التسوق الخاصة بك" : "View your shopping cart",
    locale: locale as Locale,
    pathname: "/cart",
    noIndex: true,
  });
}

export default function CartLayout({ children }: CartLayoutProps) {
  return <>{children}</>;
}
