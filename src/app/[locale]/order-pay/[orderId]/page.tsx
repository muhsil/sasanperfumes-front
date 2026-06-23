import { redirect, notFound } from "next/navigation";

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

const DEFAULT_PAYMENT_SITE_URL = "https://sasanperfumes.com";

function getPaymentSiteOrigin(): string {
  const rawUrl =
    process.env.PAYMENT_SITE_URL ||
    process.env.NEXT_PUBLIC_PAYMENT_SITE_URL ||
    process.env.WOOCOMMERCE_PAYMENT_SITE_URL ||
    process.env.NEXT_PUBLIC_WOOCOMMERCE_PAYMENT_SITE_URL ||
    DEFAULT_PAYMENT_SITE_URL;

  try {
    return new URL(rawUrl).origin;
  } catch {
    return DEFAULT_PAYMENT_SITE_URL;
  }
}

export default async function OrderPayPage({ params, searchParams }: PageProps) {
  const { locale, orderId } = await params;
  const search = await searchParams;
  const { key } = search;

  if (!orderId) {
    notFound();
  }

  if (key) {
    const orderPayUrl = new URL(`/checkout/order-pay/${encodeURIComponent(orderId)}/`, getPaymentSiteOrigin());
    orderPayUrl.searchParams.set("pay_for_order", search.pay_for_order || "true");
    orderPayUrl.searchParams.set("key", key);
    redirect(orderPayUrl.toString());
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
