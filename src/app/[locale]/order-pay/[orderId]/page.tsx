import { redirect, notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    locale: string;
    orderId: string;
  }>;
  searchParams: Promise<{
    key?: string;
  }>;
}

export default async function OrderPayPage({ params, searchParams }: PageProps) {
  const { locale, orderId } = await params;
  const { key } = await searchParams;

  if (!orderId) {
    notFound();
  }

  const query = new URLSearchParams({ order_id: orderId });

  if (key) {
    query.set("key", key);
  }

  redirect(`/${locale}/order-confirmation?${query.toString()}`);
}
