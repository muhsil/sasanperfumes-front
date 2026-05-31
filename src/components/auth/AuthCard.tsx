"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { AuthBackground } from "@/components/common/AuthBackground";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  locale: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  locale,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthCardProps) {
  const isRTL = locale === "ar";

  return (
    <AuthBackground
      showImage={false}
      className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-brand-beige/25 px-4 py-6 md:py-10"
    >
      <section
        className={cn(
          "w-full max-w-md rounded-lg border border-brand-border/70 bg-brand-ivory p-5 shadow-[0_18px_48px_rgba(20,15,10,0.08)] md:p-7",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className={cn("min-w-0", isRTL ? "text-right" : "text-left")}>
            <p className="text-xs font-semibold uppercase text-brand-muted">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-brand-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-6 text-brand-muted">{subtitle}</p>
            )}
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-border/70 bg-white text-brand-primary transition-colors hover:border-brand-primary/40 hover:bg-brand-beige"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
        </div>

        {children}

        {footer && (
          <div className={cn("mt-6 border-t border-brand-border/70 pt-4 text-sm", isRTL ? "text-right" : "text-left")}>
            {footer}
          </div>
        )}
      </section>
    </AuthBackground>
  );
}
