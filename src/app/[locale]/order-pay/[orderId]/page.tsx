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

export default async function OrderPayPage({ params, searchParams }: PageProps) {
  const { locale, orderId } = await params;
  const search = await searchParams;

  if (!orderId) {
    notFound();
  }

  const query = new URLSearchParams({ order_id: orderId });

  if (search.key) {
    query.set("order_key", search.key);
    query.set("key", search.key);
  }
  if (search.pay_for_order) {
    query.set("pay_for_order", search.pay_for_order);
  }

  redirect(`/${locale}/order-confirmation?${query.toString()}`);
}
