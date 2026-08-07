"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";

interface PaymentWidgetsProps {
  price: number;
  currency: string;
  locale: string;
}

interface PaymentGateway {
  id: string;
  title: string;
  description: string;
  method_title: string;
}

export function PaymentWidgets({ price, currency, locale }: PaymentWidgetsProps) {
  const marketPrefix = useMarketPrefix();
  const [enabledGateways, setEnabledGateways] = useState<PaymentGateway[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentGateways = async () => {
      try {
        const market = marketPrefix.replace(/^\//, "");
        const query = market
          ? `?market=${encodeURIComponent(market)}&currency=${encodeURIComponent(currency)}`
          : `?currency=${encodeURIComponent(currency)}`;
        const response = await fetch(`/api/payment-gateways${query}`);
        const data = await response.json();
        if (data.success && data.gateways) {
          setEnabledGateways(data.gateways);
        }
      } catch (err) {
        console.error("Failed to fetch payment gateways:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaymentGateways();
  }, [marketPrefix]);

  // Don't render widgets for very low prices
  if (price <= 0) return null;

  // Don't render anything while loading to avoid flash
  if (isLoading) return null;

  const isRTL = locale === "ar";
  const formattedInstallment = new Intl.NumberFormat(isRTL ? "ar-AE" : "en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "KWD" || currency === "BHD" || currency === "OMR" ? 3 : 2,
  }).format(price / 4);

  const isTabbyEnabled = enabledGateways.some((gateway) =>
    ["paymob_tabby", "tabby", "tabby_checkout", "tabby_installments"].includes(gateway.id)
  );
  const isTamaraEnabled = enabledGateways.some(
    (gateway) => ["paymob_tamara", "tamara", "tamara-gateway"].includes(gateway.id)
  );

  if (!isTabbyEnabled && !isTamaraEnabled) return null;

  return (
    <div className="mt-3 rounded-lg border border-brand-border/70 bg-brand-beige/35 px-3 py-2.5">
      <p className="mb-2 text-xs font-semibold text-brand-primary">
        {isRTL ? "خيارات دفع مرنة عند إتمام الطلب" : "Flexible payment options at checkout"}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {isTabbyEnabled && (
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/images/payment/tabby-badge.svg"
              alt="Tabby"
              width={66}
              height={26}
              className="h-5 w-auto shrink-0"
            />
            <span className="text-xs text-brand-muted">
              {isRTL ? `4 دفعات بقيمة ${formattedInstallment}` : `4 payments of ${formattedInstallment}`}
            </span>
          </div>
        )}
        {isTamaraEnabled && (
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/images/payment/tamara-badge.png"
              alt="Tamara"
              width={66}
              height={34}
              className="h-5 w-auto shrink-0 object-contain"
            />
            <span className="text-xs text-brand-muted">
              {isRTL ? "تقسيط مرن مع تمارا" : "Flexible installments with Tamara"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
