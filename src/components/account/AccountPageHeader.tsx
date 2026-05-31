"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AccountPageHeaderProps {
  locale: string;
  title: string;
  backHref: string;
  backLabel: string;
}

export function AccountPageHeader({
  locale,
  title,
  backHref,
  backLabel,
}: AccountPageHeaderProps) {
  const isRTL = locale === "ar";

  return (
    <div className="mb-5 border-b border-brand-border/70 pb-4 md:mb-7">
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-2 rounded-md border border-brand-border/70 bg-brand-ivory/90 px-3 py-1.5 text-sm text-brand-muted transition hover:border-brand-primary/35 hover:text-brand-primary md:mb-4"
      >
        <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
        {backLabel}
      </Link>
      <h1 className="text-2xl font-semibold leading-tight text-brand-primary md:text-3xl">
        {title}
      </h1>
    </div>
  );
}
