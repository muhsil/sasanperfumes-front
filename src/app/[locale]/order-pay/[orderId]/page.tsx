import { redirect, notFound } from "next/navigation";
import { normalizeFrontendPaymentUrl } from "@/lib/utils/payment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    locale: string;
    orderId: string;
  }>;
  searchParams: Promise<{
    key?: string;
    pay_for_order?: string;
  }>;
}

export default async function OrderPayPage({ params, searchParams }: PageProps) {
  const { locale, orderId } = await params;
  const search = await searchParams;
  const { key } = search;

  if (!orderId) {
    notFound();
  }

  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim() || "https://shapehive.com";
  const wcApiUrl = (process.env.NEXT_PUBLIC_WC_API_URL || publicSiteUrl).trim();
  const normalizedSiteUrl = publicSiteUrl.endsWith("/") ? publicSiteUrl.slice(0, -1) : publicSiteUrl;
  const orderApiUrl = new URL(`${normalizedSiteUrl}/api/orders`);
  orderApiUrl.searchParams.set("orderId", orderId);
  if (key) {
    orderApiUrl.searchParams.set("order_key", key);
  }

  try {
    const orderResponse = await fetch(orderApiUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (orderResponse.ok) {
      const orderData = await orderResponse.json();
      const paymentUrl = orderData?.data?.payment_url as string | undefined;
      const isInternalOrderPayUrl =
        typeof paymentUrl === "string" &&
        (paymentUrl.startsWith("/order-pay/") || paymentUrl.startsWith("/checkout/order-pay/"));

      if (paymentUrl && !isInternalOrderPayUrl) {
        const normalizedPaymentUrl = normalizeFrontendPaymentUrl(paymentUrl, {
        origin: publicSiteUrl,
        locale,
        marketPrefix: "",
        });

        if (normalizedPaymentUrl) {
          redirect(normalizedPaymentUrl);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to resolve order payment URL:", error);
  }

  if (key) {
    const backendBase = (() => {
      try {
        return new URL(wcApiUrl).origin;
      } catch {
        return null;
      }
    })();

    if (backendBase) {
      const fallbackOrderPayUrl = new URL(`/checkout/order-pay/${orderId}`, backendBase);
      fallbackOrderPayUrl.searchParams.set("pay_for_order", "true");
      fallbackOrderPayUrl.searchParams.set("key", key);
      redirect(fallbackOrderPayUrl.toString());
    }

    console.warn("Failed to build backend order-pay fallback URL because NEXT_PUBLIC_WC_API_URL is invalid:", wcApiUrl);
  }

  const query = new URLSearchParams({ order_id: orderId });

  if (search.key) {
    query.set("key", search.key);
  }
  if (search.pay_for_order) {
    query.set("pay_for_order", search.pay_for_order);
  }

  redirect(`/${locale}/order-confirmation?${query.toString()}`);
}
