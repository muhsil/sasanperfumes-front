"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, ShoppingBag, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";

export default function NotFound() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "en";
  const isRTL = locale === "ar";

  const t = {
    en: {
      heading: "Looks like this page has drifted away...",
      description:
        "The page you were looking for may have moved, but your perfect scent is still waiting. Let us help you find what you need.",
      backHome: "Back to Home",
      browseShop: "Explore Our Shop",
      popularTitle: "Popular Categories",
      helpTitle: "Need Help?",
      helpDescription:
        "Our team is here to help you find exactly what you're looking for.",
      contactUs: "Contact Us",
    },
    ar: {
      heading: "يبدو أن هذه الصفحة قد انتقلت...",
      description:
        "الصفحة التي كنت تبحث عنها ربما تم نقلها، لكن عطرك المثالي لا يزال في انتظارك. دعنا نساعدك في العثور على ما تحتاجه.",
      backHome: "العودة للرئيسية",
      browseShop: "استكشف متجرنا",
      popularTitle: "الفئات الشائعة",
      helpTitle: "تحتاج مساعدة؟",
      helpDescription:
        "فريقنا هنا لمساعدتك في العثور على ما تبحث عنه بالضبط.",
      contactUs: "اتصل بنا",
    },
  };

  const texts = t[locale as keyof typeof t] || t.en;

  const categories: { name: string; href: string; icon: typeof Sparkles }[] = [];

  return (
    <div className="flex min-h-[80vh] flex-col" dir={isRTL ? "rtl" : "ltr"}>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-beige to-white px-4 py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-96 w-96 animate-pulse rounded-full bg-brand-primary/20 blur-3xl" />
          <div
            className="absolute -bottom-32 -right-32 h-[400px] w-[400px] animate-pulse rounded-full bg-brand-beige/30 blur-3xl"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="container relative mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-2xl font-bold text-brand-primary md:text-4xl">
            {texts.heading}
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-base text-brand-primary md:text-lg">
            {texts.description}
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href={`/${locale}`} className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                {texts.backHome}
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href={`/${locale}/shop`} className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                {texts.browseShop}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 md:py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-primary" />
            <h2 className="text-lg font-semibold uppercase tracking-widest text-brand-gold md:text-xl">
              {texts.popularTitle}
            </h2>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group flex items-center gap-3 rounded-xl border border-brand-primary/15 bg-brand-beige/50 p-4 transition-all duration-300 hover:border-brand-primary hover:bg-brand-beige hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-beige transition-colors group-hover:bg-brand-primary">
                  <cat.icon className="h-5 w-5 text-brand-primary" />
                </div>
                <span className="text-sm font-medium text-brand-primary md:text-base">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-brand-beige px-4 py-12">
        <div className="container mx-auto max-w-2xl text-center">
          <Search className="mx-auto mb-4 h-8 w-8 text-brand-gold" />
          <h3 className="mb-2 text-lg font-semibold text-brand-primary">
            {texts.helpTitle}
          </h3>
          <p className="mb-6 text-brand-primary">{texts.helpDescription}</p>
          <Button variant="outline" asChild size="sm">
            <Link
              href={`/${locale}/contact`}
              className="flex items-center gap-2"
            >
              {texts.contactUs}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
