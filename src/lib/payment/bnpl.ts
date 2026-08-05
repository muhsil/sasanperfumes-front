export const BNPL_CONVENIENCE_FEE_RATE = 0.07;

const BNPL_PAYMENT_METHODS = new Set([
  "paymob_tabby",
  "paymob_tamara",
  "tabby",
  "tabby_checkout",
  "tabby_installments",
  "tamara",
  "tamara-gateway",
]);

export function isBnplPaymentMethod(paymentMethod: string): boolean {
  return BNPL_PAYMENT_METHODS.has((paymentMethod || "").trim().toLowerCase());
}

export function calculateBnplConvenienceFeeMinor(
  discountedMerchandiseSubtotalMinor: number,
  paymentMethod: string
): number {
  if (!isBnplPaymentMethod(paymentMethod)) return 0;
  if (!Number.isFinite(discountedMerchandiseSubtotalMinor) || discountedMerchandiseSubtotalMinor <= 0) {
    return 0;
  }

  return Math.round(discountedMerchandiseSubtotalMinor * BNPL_CONVENIENCE_FEE_RATE);
}
