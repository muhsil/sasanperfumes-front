import type { CoCartItem } from "@/lib/api/cocart";
import type { DiscountRule } from "@/types/discount";

export interface CartDiscount {
  ruleId: string;
  label: string;
  amount: number;
  freeQuantity: number;
}

interface CartDiscountOptions {
  categoryIdsByProductId?: Record<number, number[]>;
  currencyMinorUnit?: number;
}

const DISABLED_STATUS_VALUES = new Set(["disabled", "inactive", "draft", "trash", "false", "0", "off"]);

function isExplicitFalse(value: unknown): boolean {
  if (value === false || value === 0) return true;
  if (typeof value === "string") {
    return DISABLED_STATUS_VALUES.has(value.trim().toLowerCase());
  }
  return false;
}

export function isDiscountRuleEnabled(rule: DiscountRule): boolean {
  if (
    isExplicitFalse(rule.enabled) ||
    isExplicitFalse(rule.is_active) ||
    isExplicitFalse(rule.active) ||
    isExplicitFalse(rule.status)
  ) {
    return false;
  }

  const now = new Date();
  if (rule.start_date && new Date(rule.start_date) > now) return false;
  if (rule.end_date && new Date(rule.end_date) < now) return false;

  return true;
}

export function getActiveDiscountRules(rules: DiscountRule[] | null | undefined): DiscountRule[] {
  if (!Array.isArray(rules)) return [];
  return rules.filter(isDiscountRuleEnabled);
}

export function includesNumericId(values: readonly unknown[] | null | undefined, id: number): boolean {
  if (!Array.isArray(values)) return false;
  return values.some((value) => Number(value) === id);
}

function getCartItemCandidateIds(item: CoCartItem): number[] {
  const ids = new Set<number>();
  if (Number.isFinite(item.id)) ids.add(item.id);
  if (item.variation_id && Number.isFinite(item.variation_id)) ids.add(item.variation_id);

  const parentId = item.meta?.variation?.Parent_id || item.meta?.variation?.parent_id;
  const parsedParentId = typeof parentId === "string" ? parseInt(parentId, 10) : Number(parentId);
  if (Number.isFinite(parsedParentId) && parsedParentId > 0) ids.add(parsedParentId);

  return Array.from(ids);
}

function isRuleApplicableToItem(rule: DiscountRule, item: CoCartItem, options?: CartDiscountOptions): boolean {
  if (rule.applies_to === "all") return true;

  const productIds = rule.product_ids || [];
  const candidateIds = getCartItemCandidateIds(item);

  if (rule.applies_to === "product" && productIds.length > 0) {
    return candidateIds.some((id) => includesNumericId(productIds, id));
  }

  const categoryIds = rule.category_ids || [];
  if (rule.applies_to === "category" && categoryIds.length > 0) {
    return candidateIds.some((id) =>
      (options?.categoryIdsByProductId?.[id] || []).some((categoryId) => includesNumericId(categoryIds, categoryId))
    );
  }

  return false;
}

function getCartItemUnitPrice(item: CoCartItem): number {
  const price = Math.round(parseFloat(item.price || "0") || 0);
  return price > 0 ? price : 0;
}

function getRuleLabel(rule: DiscountRule): string {
  return rule.badge_text || rule.name || "Promotion";
}

function toMinorUnits(value: number, minorUnit: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * Math.pow(10, minorUnit));
}

function getCartItemQuantity(item: CoCartItem): number {
  return Math.max(0, Math.floor(item.quantity?.value || 0));
}

function getRuleEligibleItems(
  rule: DiscountRule,
  items: CoCartItem[],
  options?: CartDiscountOptions
): Array<{ item: CoCartItem; unitPrice: number; quantity: number; total: number }> {
  return items
    .filter((item) => !item.item_key.startsWith("temp-"))
    .filter((item) => isRuleApplicableToItem(rule, item, options))
    .map((item) => {
      const unitPrice = getCartItemUnitPrice(item);
      const quantity = getCartItemQuantity(item);
      return {
        item,
        unitPrice,
        quantity,
        total: unitPrice * quantity,
      };
    })
    .filter((entry) => entry.unitPrice > 0 && entry.quantity > 0);
}

function passesRuleMinimums(
  rule: DiscountRule,
  eligibleQuantity: number,
  cartSubtotal: number,
  minorUnit: number
): boolean {
  if (rule.min_quantity && eligibleQuantity < rule.min_quantity) return false;
  if (rule.min_cart_total && cartSubtotal < toMinorUnits(rule.min_cart_total, minorUnit)) return false;
  return true;
}

function calculateBogoDiscount(rule: DiscountRule, eligibleItems: Array<{ unitPrice: number; quantity: number }>): number {
  const buyQuantity = Math.max(1, Math.floor(rule.buy_quantity || 0));
  const getQuantity = Math.max(1, Math.floor(rule.get_quantity || 0));
  const groupSize = buyQuantity + getQuantity;
  const eligiblePrices: number[] = [];

  for (const item of eligibleItems) {
    for (let i = 0; i < item.quantity; i++) {
      eligiblePrices.push(item.unitPrice);
    }
  }

  if (eligiblePrices.length < groupSize) return 0;

  const completeGroups = Math.floor(eligiblePrices.length / groupSize);
  const remainder = eligiblePrices.length % groupSize;
  const freeQuantity = completeGroups * getQuantity + Math.max(0, remainder - buyQuantity);

  return eligiblePrices
    .sort((a, b) => a - b)
    .slice(0, Math.min(freeQuantity, eligiblePrices.length))
    .reduce((sum, price) => sum + price, 0);
}

function calculatePercentageDiscount(rule: DiscountRule, eligibleTotal: number): number {
  const percentage = Math.min(Math.max(rule.discount_value || 0, 0), 100);
  return Math.round((eligibleTotal * percentage) / 100);
}

function calculateFixedDiscount(
  rule: DiscountRule,
  eligibleItems: Array<{ unitPrice: number; quantity: number }>,
  minorUnit: number
): number {
  const fixedDiscount = toMinorUnits(rule.discount_value || 0, minorUnit);
  if (fixedDiscount <= 0) return 0;

  return eligibleItems.reduce((total, item) => {
    return total + Math.min(item.unitPrice, fixedDiscount) * item.quantity;
  }, 0);
}

function calculateBulkDiscount(
  rule: DiscountRule,
  eligibleItems: Array<{ unitPrice: number; quantity: number; total: number }>,
  minorUnit: number
): number {
  if (!Array.isArray(rule.bulk_tiers) || rule.bulk_tiers.length === 0) return 0;

  return eligibleItems.reduce((total, item) => {
    const tier = rule.bulk_tiers
      .filter((candidate) => item.quantity >= Math.max(1, candidate.min_qty || 0))
      .filter((candidate) => !candidate.max_qty || item.quantity <= candidate.max_qty)
      .sort((a, b) => (b.min_qty || 0) - (a.min_qty || 0))[0];

    if (!tier) return total;

    const amount = tier.discount_unit === "percentage"
      ? Math.round((item.total * Math.min(Math.max(tier.discount_value || 0, 0), 100)) / 100)
      : Math.min(item.total, toMinorUnits(tier.discount_value || 0, minorUnit) * item.quantity);

    return total + amount;
  }, 0);
}

export function calculateCartDiscounts(
  items: CoCartItem[],
  rules: DiscountRule[],
  options?: CartDiscountOptions
): CartDiscount[] {
  const activeRules = getActiveDiscountRules(rules);
  const discounts: CartDiscount[] = [];
  const minorUnit = options?.currencyMinorUnit ?? 2;
  const cartSubtotal = items.reduce((total, item) => total + getCartItemUnitPrice(item) * getCartItemQuantity(item), 0);

  for (const rule of activeRules) {
    const eligibleItems = getRuleEligibleItems(rule, items, options);
    const eligibleQuantity = eligibleItems.reduce((total, item) => total + item.quantity, 0);
    const eligibleTotal = eligibleItems.reduce((total, item) => total + item.total, 0);
    if (eligibleQuantity <= 0 || eligibleTotal <= 0) continue;
    if (!passesRuleMinimums(rule, eligibleQuantity, cartSubtotal, minorUnit)) continue;

    let amount = 0;
    let freeQuantity = 0;
    if (rule.type === "bogo") {
      amount = calculateBogoDiscount(rule, eligibleItems);
      freeQuantity = Math.max(0, Math.floor(rule.get_quantity || 0));
    } else if (rule.type === "percentage") {
      amount = calculatePercentageDiscount(rule, eligibleTotal);
    } else if (rule.type === "fixed") {
      amount = calculateFixedDiscount(rule, eligibleItems, minorUnit);
    } else if (rule.type === "bulk") {
      amount = calculateBulkDiscount(rule, eligibleItems, minorUnit);
    }

    if (amount > 0) {
      discounts.push({
        ruleId: rule.id,
        label: getRuleLabel(rule),
        amount,
        freeQuantity,
      });
    }
  }

  return discounts;
}

export function getCartDiscountTotal(discounts: CartDiscount[]): number {
  return discounts.reduce((total, discount) => total + discount.amount, 0);
}
