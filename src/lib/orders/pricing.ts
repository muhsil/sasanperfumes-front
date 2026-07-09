type MoneyLike = string | number | null | undefined;

export interface OrderPricingLineItemLike {
  total?: MoneyLike;
  total_tax?: MoneyLike;
  quantity?: number | null;
}

export interface OrderPricingFeeLike {
  total?: MoneyLike;
  total_tax?: MoneyLike;
}

interface OrderPricingShippingLineLike {
  total_tax?: MoneyLike;
}

export interface OrderPricingOrderLike {
  total?: MoneyLike;
  shipping_total?: MoneyLike;
  shipping_tax?: MoneyLike;
  shipping_lines?: OrderPricingShippingLineLike[] | null;
  discount_total?: MoneyLike;
  discount_tax?: MoneyLike;
  fee_lines?: OrderPricingFeeLike[] | null;
}

export function parseOrderMoney(value: MoneyLike): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const raw = typeof value === "number" ? String(value) : String(value);
  const parsed = Number.parseFloat(raw.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getInclusiveAmount(amount: MoneyLike, tax: MoneyLike = 0): number {
  return Math.round((parseOrderMoney(amount) + parseOrderMoney(tax) + Number.EPSILON) * 100) / 100;
}

export function getGrossLineItemTotal(item: OrderPricingLineItemLike): number {
  return getInclusiveAmount(item.total, item.total_tax);
}

export function getGrossLineItemUnitPrice(item: OrderPricingLineItemLike): number {
  const quantity = Math.max(1, Number(item.quantity || 0) || 1);
  return Math.round((getGrossLineItemTotal(item) / quantity + Number.EPSILON) * 100) / 100;
}

function getShippingTaxFromLines(order: Pick<OrderPricingOrderLike, "shipping_lines">): number {
  if (!order.shipping_lines || order.shipping_lines.length === 0) {
    return 0;
  }

  return order.shipping_lines.reduce((sum, line) => sum + parseOrderMoney(line.total_tax), 0);
}

export function getGrossShippingTotal(order: Pick<OrderPricingOrderLike, "shipping_total" | "shipping_tax" | "shipping_lines">): number {
  if (order.shipping_lines && order.shipping_lines.length > 0) {
    return getInclusiveAmount(order.shipping_total, getShippingTaxFromLines(order));
  }

  return getInclusiveAmount(order.shipping_total, order.shipping_tax);
}

export function getGrossDiscountTotal(order: Pick<OrderPricingOrderLike, "discount_total" | "discount_tax">): number {
  return getInclusiveAmount(order.discount_total, order.discount_tax);
}

export function getGrossFeeTotal(order: Pick<OrderPricingOrderLike, "fee_lines">): number {
  return (order.fee_lines || []).reduce((sum, fee) => sum + getInclusiveAmount(fee.total, fee.total_tax), 0);
}

export function getGrossOrderSubtotal(order: OrderPricingOrderLike): number {
  const orderTotal = parseOrderMoney(order.total);
  const shippingTotal = getGrossShippingTotal(order);
  const feeTotal = getGrossFeeTotal(order);
  const discountTotal = getGrossDiscountTotal(order);

  return Math.max(0, Math.round((orderTotal - shippingTotal - feeTotal + discountTotal + Number.EPSILON) * 100) / 100);
}
