"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircleMore, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig, type Locale } from "@/config/site";

interface TrustSignalsProps {
  locale: Locale;
  freeShippingThreshold?: number;
  className?: string;
  variant?: "light" | "dark";
  compact?: boolean;
}

export function TrustSignals({
  locale,
  freeShippingThreshold,
  className,
  variant = "light",
  compact = false,
}: TrustSignalsProps) {
  const isRTL = locale === "ar";
  const whatsappUrl = `https://wa.me/${siteConfig.contact.whatsapp}`;
  const shippingLabel = freeShippingThreshold
    ? (isRTL
      ? `توصيل مجاني فوق ${freeShippingThreshold} AED`
      : `Free delivery over AED ${freeShippingThreshold}`)
    : (isRTL ? "توصيل سريع داخل الإمارات" : "Fast UAE delivery");

  const trustItems = [
    {
      icon: ShieldCheck,
      title: isRTL ? "دفع آمن" : "Secure checkout",
      description: isRTL ? "طرق دفع موثوقة وحماية أثناء الشراء" : "Trusted payment methods and protected checkout",
    },
    {
      icon: Truck,
      title: isRTL ? "شحن سريع" : "Fast delivery",
      description: shippingLabel,
    },
    {
      icon: RotateCcw,
      title: isRTL ? "إرجاع سهل" : "Easy returns",
      description: isRTL ? "سياسة واضحة لراحة أكبر" : "Simple policy pages when you need them",
    },
    {
      icon: MessageCircleMore,
      title: isRTL ? "دعم واتساب" : "WhatsApp support",
      description: isRTL ? "تواصل معنا مباشرة لأي سؤال" : "Reach us quickly for order help",
      href: whatsappUrl,
    },
  ];

  const quickLinks = [
    { label: isRTL ? "من نحن" : "About Us", href: `/${locale}/about-us` },
    { label: isRTL ? "قصة العلامة" : "Our Story", href: `/${locale}/about-us#brand-story` },
    { label: isRTL ? "التوريد" : "Sourcing", href: `/${locale}/about-us#sourcing` },
    { label: isRTL ? "الشحن" : "Shipping", href: `/${locale}/shipping` },
    { label: isRTL ? "الإرجاع" : "Returns", href: `/${locale}/returns` },
    { label: isRTL ? "تواصل معنا" : "Contact", href: `/${locale}/contact-us` },
    { label: isRTL ? "الدفع" : "Payment", href: `/${locale}/refund_returns` },
  ];

  return (
    <section
      className={cn(
        "lazy-section rounded-[1.75rem] border border-brand-border/70 p-4 md:p-5",
        variant === "dark"
          ? "bg-white/8 text-brand-ivory"
          : "bg-brand-ivory text-brand-primary shadow-[0_20px_48px_rgba(20,15,10,0.08)]",
        className
      )}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", variant === "dark" ? "text-brand-gold" : "text-brand-gold")}>
            {isRTL ? "لماذا الشراء من ساسان" : "Why shop with us"}
          </p>
          <h3 className={cn("mt-2 font-title text-2xl leading-none md:text-[2rem]", variant === "dark" ? "text-brand-ivory" : "text-brand-primary")}>
            {isRTL ? "ثقة، سرعة، وخدمة" : "Trust, speed, and service"}
          </h3>
        </div>
        <Link
          href={`/${locale}/contact-us`}
          className={cn(
            "hidden items-center gap-1 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors md:inline-flex",
            variant === "dark"
              ? "border-white/15 bg-white/10 text-brand-ivory hover:border-brand-gold/50 hover:bg-brand-gold hover:text-brand-primary"
              : "border-brand-border/70 bg-brand-beige text-brand-primary hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white"
          )}
        >
          {isRTL ? "تواصل" : "Contact"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className={cn("mt-4 grid gap-3", compact ? "md:grid-cols-2" : "md:grid-cols-4")}>
        {trustItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border",
                variant === "dark"
                  ? "border-white/15 bg-white/10 text-brand-gold"
                  : "border-brand-border/70 bg-brand-beige text-brand-gold"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", variant === "dark" ? "text-brand-ivory" : "text-brand-primary")}>
                  {item.title}
                </p>
                <p className={cn("mt-1 text-xs leading-5", variant === "dark" ? "text-brand-ivory/72" : "text-brand-muted")}>
                  {item.description}
                </p>
              </div>
            </>
          );

          const cardClassName = cn(
            "flex items-start gap-3 rounded-2xl border p-3 transition-colors",
            variant === "dark"
              ? "border-white/10 bg-white/5 hover:border-brand-gold/40 hover:bg-white/8"
              : "border-brand-border/70 bg-brand-ivory hover:border-brand-primary/35 hover:bg-brand-beige/60"
          );

          return item.href ? (
            <Link key={item.title} href={item.href} className={cardClassName}>
              {content}
            </Link>
          ) : (
            <div key={item.title} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
              variant === "dark"
                ? "border-white/10 bg-white/5 text-brand-ivory/82 hover:border-brand-gold/40 hover:bg-brand-gold hover:text-brand-primary"
                : "border-brand-border/70 bg-brand-beige text-brand-primary hover:border-brand-primary/45 hover:bg-brand-primary hover:text-white"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
