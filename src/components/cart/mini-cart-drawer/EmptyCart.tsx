"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import type { EmptyCartProps } from "./types";

export function EmptyCart({ locale, dictionary, onClose }: EmptyCartProps) {
  const marketPrefix = useMarketPrefix();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-brand-border/70 bg-brand-beige shadow-[0_12px_28px_rgba(20,15,10,0.08)]">
        <ShoppingBag className="h-12 w-12 text-brand-primary" />
      </div>
      <h3 className="mb-2 font-title text-2xl text-brand-primary">
        {dictionary.cart}
      </h3>
      <p className="mb-8 text-brand-muted">{dictionary.emptyCart}</p>
      <Button asChild variant="primary" size="lg" className="w-full max-w-xs">
        <Link href={`${marketPrefix}/${locale}/shop`} onClick={onClose}>
          {dictionary.continueShopping}
        </Link>
      </Button>
    </div>
  );
}
