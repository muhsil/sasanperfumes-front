import type { Metadata } from "next";
import { CheckoutFooter } from "@/components/layout/CheckoutFooter";
import { getDictionary } from "@/i18n";
import { getSiteSettings } from "@/lib/api/wordpress";
import { generateMetadata as generateSeoMetadata } from "@/lib/utils/seo";
import { type Locale } from "@/config/site";

interface CheckoutLayoutProps {
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
    title: locale === "ar" ? "الدفع" : "Checkout",
    description: locale === "ar" ? "أكمل طلبك" : "Complete your order",
    locale: locale as Locale,
    pathname: "/checkout",
    noIndex: true,
  });
}

export default async function CheckoutLayout({
  children,
  params,
}: CheckoutLayoutProps) {
  const { locale } = await params;
  const validLocale = locale as Locale;
  const dictionary = await getDictionary(validLocale);
  const siteSettings = await getSiteSettings(validLocale);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.main-footer { display: none !important; }` }} />
      {children}
      <CheckoutFooter
        locale={validLocale}
        dictionary={dictionary}
        siteSettings={siteSettings}
      />
    </>
  );
}
