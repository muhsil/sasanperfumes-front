"use client";

import { useState, useEffect } from "react";
import { TamaraPromoWidget } from "./TamaraPromoWidget";
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
        const query = market ? `?market=${encodeURIComponent(market)}` : "";
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

  // Check if Tamara is enabled (any tamara variant)
  const isTamaraEnabled = enabledGateways.some(
    (gateway) => gateway.id === "tamara" || gateway.id === "tamara-gateway"
  );

  // Don't render the container if Tamara is not enabled
  if (!isTamaraEnabled) return null;

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3 mt-3">
      {isTamaraEnabled && <TamaraPromoWidget price={price} currency={currency} locale={locale} />}
    </div>
  );
}
