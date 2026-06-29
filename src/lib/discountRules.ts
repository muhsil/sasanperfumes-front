import type { CoCartItem } from "@/lib/api/cocart";
import type { DiscountRule } from "@/types/discount";

export interface CartDiscount {
  ruleId: string;
  label: string;
  amount: number;
  freeQuantity: number;
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

function getCartItemCandidateIds(item: CoCartItem): number[] {
  const ids = new Set<number>();
  if (Number.isFinite(item.id)) ids.add(item.id);
  if (item.variation_id && Number.isFinite(item.variation_id)) ids.add(item.variation_id);

  const parentId = item.meta?.variation?.Parent_id || item.meta?.variation?.parent_id;
  const parsedParentId = typeof parentId === "string" ? parseInt(parentId, 10) : Number(parentId);
  if (Number.isFinite(parsedParentId) && parsedParentId > 0) ids.add(parsedParentId);

  return Array.from(ids);
}

function isRuleApplicableToItem(rule: DiscountRule, item: CoCartItem): boolean {
  if (rule.applies_to === "all") return true;

  const productIds = rule.product_ids || [];
  if (rule.applies_to === "product" && productIds.length > 0) {
    const candidateIds = getCartItemCandidateIds(item);
    return candidateIds.some((id) => productIds.includes(id));
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

export function calculateCartDiscounts(items: CoCartItem[], rules: DiscountRule[]): CartDiscount[] {
  const activeRules = getActiveDiscountRules(rules);
  const discounts: CartDiscount[] = [];

  for (const rule of activeRules) {
    if (rule.type !== "bogo") continue;

    const buyQuantity = Math.max(1, Math.floor(rule.buy_quantity || 0));
    const getQuantity = Math.max(1, Math.floor(rule.get_quantity || 0));
    const eligiblePrices: number[] = [];

    for (const item of items) {
      if (item.item_key.startsWith("temp-")) continue;
      if (!isRuleApplicableToItem(rule, item)) continue;

      const unitPrice = getCartItemUnitPrice(item);
      if (unitPrice <= 0) continue;

      const quantity = Math.max(0, Math.floor(item.quantity?.value || 0));
      for (let i = 0; i < quantity; i++) {
        eligiblePrices.push(unitPrice);
      }
    }

    const freeQuantity = Math.floor(eligiblePrices.length / buyQuantity) * getQuantity;
    if (freeQuantity <= 0) continue;

    const amount = eligiblePrices
      .sort((a, b) => a - b)
      .slice(0, Math.min(freeQuantity, eligiblePrices.length))
      .reduce((sum, price) => sum + price, 0);

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
