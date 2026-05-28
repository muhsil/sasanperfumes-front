"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useCurrency, type CurrencyData } from "./CurrencyContext";

// Event for notifying when a new gift is added (used by MiniCartDrawer)
export const NEW_GIFT_ADDED_EVENT = "ShapeHive:new-gift-added";

const RULES_CACHE_KEY = "sasanperfumes_free_gift_rules_cache";
const RULES_CACHE_TTL = 5 * 60 * 1000;

interface CachedRulesData {
  rules: FreeGiftRule[];
  currency: string;
  locale: string;
  timestamp: number;
}

function getCachedRules(currency: string, locale: string): FreeGiftRule[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = sessionStorage.getItem(RULES_CACHE_KEY);
    if (!cached) return null;
    const data: CachedRulesData = JSON.parse(cached);
    if (data.currency !== currency || data.locale !== locale) return null;
    if (Date.now() - data.timestamp > RULES_CACHE_TTL) {
      sessionStorage.removeItem(RULES_CACHE_KEY);
      return null;
    }
    return data.rules;
  } catch {
    return null;
  }
}

function setCachedRules(rules: FreeGiftRule[], currency: string, locale: string): void {
  if (typeof window === "undefined") return;
  try {
    const data: CachedRulesData = { rules, currency, locale, timestamp: Date.now() };
    sessionStorage.setItem(RULES_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export interface FreeGiftRule {
  id: string;
  enabled: boolean;
  name: string;
  min_cart_value: number;
  max_cart_value?: number;
  currency: string;
  product_id: number;
  product_id_ar?: number;
  priority: number;
  message_en: string;
  message_ar: string;
  hide_from_shop?: boolean;
  product?: {
    id: number;
    name: string;
    slug: string;
    price: string;
    image: string;
  };
  product_ar?: {
    id: number;
    name: string;
    slug: string;
    price: string;
    image: string;
  };
}

// Helper function to detect if a string contains Arabic characters
export function containsArabic(text: string | undefined): boolean {
  if (!text) return false;
  // Arabic Unicode range: \u0600-\u06FF (Arabic), \u0750-\u077F (Arabic Supplement), \u08A0-\u08FF (Arabic Extended-A)
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicPattern.test(text);
}

// Helper function to get the correct product_id based on locale
export function getLocalizedProductId(rule: FreeGiftRule, locale: string): number {
  if (locale === "ar" && rule.product_id_ar) {
    return rule.product_id_ar;
  }
  return rule.product_id;
}

// Helper function to get the correct product data based on locale
// For English locale, ensures we don't return Arabic product data
export function getLocalizedProduct(rule: FreeGiftRule, locale: string): FreeGiftRule["product"] | undefined {
  if (locale === "ar" && rule.product_ar) {
    return rule.product_ar;
  }
  // For non-Arabic locales, check if the product name contains Arabic characters
  // If so, return undefined to trigger the fallback text
  if (locale !== "ar" && rule.product && containsArabic(rule.product.name)) {
    return undefined;
  }
  return rule.product;
}

interface GiftProgress {
  hasNextGift: boolean;
  amountNeeded: number;
  amountNeededCurrency: string;
  nextGiftRule: FreeGiftRule | null;
  currentSubtotal: number;
}

interface NewGiftCelebration {
  isVisible: boolean;
  giftName: string | null;
}

interface FreeGiftContextType {
  rules: FreeGiftRule[];
  isLoading: boolean;
  activeGifts: FreeGiftRule[];
  freeGiftItemKeys: string[];
  isFreeGiftItem: (itemKey: string) => boolean;
  isFreeGiftProduct: (productId: number) => boolean;
  getFreeGiftProductIds: () => number[];
  refreshRules: () => Promise<void>;
  getGiftMessages: (locale: string) => string[];
  getGiftProgress: () => GiftProgress;
  newGiftCelebration: NewGiftCelebration;
  dismissGiftCelebration: () => void;
}

const FreeGiftContext = createContext<FreeGiftContextType | undefined>(undefined);

const FREE_GIFT_ITEM_DATA_KEY = "_sasanperfumes_free_gift";
const FREE_GIFT_RULE_ID_KEY = "_sasanperfumes_free_gift_rule_id";
const FREE_GIFT_UNIQUE_KEY = "_sasanperfumes_free_gift_unique_key";
const BASE_RULE_CURRENCY = "AED";

function getRuleThresholdCurrency(rule: FreeGiftRule, currentCurrency: string): string {
  return rule.currency && rule.currency !== "ALL" ? rule.currency : currentCurrency;
}

function convertCurrencyAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  currencies: CurrencyData[]
): number {
  if (amount === 0 || fromCurrency === toCurrency) return amount;

  const fromCurrencyInfo = currencies.find((c) => c.code === fromCurrency);
  const toCurrencyInfo = currencies.find((c) => c.code === toCurrency);

  if (!fromCurrencyInfo || !toCurrencyInfo) return amount;

  const amountInAED = amount / fromCurrencyInfo.rateFromAED;
  return amountInAED * toCurrencyInfo.rateFromAED;
}

function getApplicableRules(rules: FreeGiftRule[], currentCurrency: string): FreeGiftRule[] {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const currentCurrencyRules = enabledRules.filter(
    (rule) => rule.currency === currentCurrency || rule.currency === "ALL"
  );

  if (currentCurrencyRules.length > 0) {
    return currentCurrencyRules;
  }

  const baseCurrencyRules = enabledRules.filter((rule) => rule.currency === BASE_RULE_CURRENCY);
  return baseCurrencyRules.length > 0 ? baseCurrencyRules : enabledRules;
}

// Helper to generate a stable hash of cart state for comparison
// Only include non-gift items in the hash to prevent re-processing when gifts are added
function getCartStateHash(
  cartItems: Array<{ item_key: string; id: number; quantity: { value: number } }>,
  subtotal: string,
  giftProductIds: Set<number>
): string {
  const nonGiftItems = cartItems.filter(i => !giftProductIds.has(i.id));
  const itemsHash = nonGiftItems.map(i => `${i.id}:${i.quantity.value}`).join('|');
  return `${subtotal}::${itemsHash}`;
}

interface FreeGiftProviderProps {
  children: React.ReactNode;
  locale: string;
}

export function FreeGiftProvider({ children, locale }: FreeGiftProviderProps) {
  const { cart, cartItems, cartSubtotal, addToCart, removeCartItem, updateCartItem, setIsCartOpen } = useCart();
  const { currency, currencies } = useCurrency();
  const pathname = usePathname();
  const [rules, setRules] = useState<FreeGiftRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGifts, setActiveGifts] = useState<FreeGiftRule[]>([]);
  const [freeGiftItemKeys, setFreeGiftItemKeys] = useState<string[]>([]);
  const [newGiftCelebration, setNewGiftCelebration] = useState<NewGiftCelebration>({
    isVisible: false,
    giftName: null,
  });
    const isProcessingRef = useRef(false);
    const lastProcessedStateRef = useRef<string | null>(null);
    const correctedGiftKeysRef = useRef<Set<string>>(new Set());

  const currencyMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, currencyMinorUnit);

  const addToCartRef = useRef(addToCart);
  const removeCartItemRef = useRef(removeCartItem);
  const updateCartItemRef = useRef(updateCartItem);

  useEffect(() => {
    addToCartRef.current = addToCart;
    removeCartItemRef.current = removeCartItem;
    updateCartItemRef.current = updateCartItem;
  }, [addToCart, removeCartItem, updateCartItem]);

  const fetchRules = useCallback(async () => {
    const cached = getCachedRules("all", locale);
    if (cached) {
      setRules(cached);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/free-gifts?locale=${locale}`);
      const data = await response.json();

      if (data.success && data.rules) {
        setRules(data.rules);
        setCachedRules(data.rules, "all", locale);
      }
    } catch (error) {
      console.warn(`Failed to fetch free gift rules: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const isFreeGiftItem = useCallback((itemKey: string): boolean => {
    const item = cartItems.find((i) => i.item_key === itemKey);
    if (!item) return false;

    // Primary check: cart_item_data flag (if CoCart preserves it)
    if (item.cart_item_data?.[FREE_GIFT_ITEM_DATA_KEY] === true) {
      return true;
    }

    // Secondary check: product ID matches a gift rule (check both EN and AR product IDs)
    // This handles cases where CoCart doesn't preserve the flag
    // and where the gift product has a non-zero price
    const matchesRule = rules.some((rule) => {
      const localizedProductId = getLocalizedProductId(rule, locale);
      return localizedProductId === item.id || rule.product_id === item.id || rule.product_id_ar === item.id;
    });
    if (matchesRule) return true;

    // Tertiary check: item has price 0 and slug is exactly "free-gift" or name is exactly "Free Gift"/"هدية مجانية"
    // This handles edge cases where the product ID might not match due to WPML translation issues
    // Note: Using exact matches to avoid false positives with products like "gift-set" or "gift-box"
    const itemPrice = parseFloat(item.price);
    const itemSlug = item.slug?.toLowerCase() || '';
    const itemName = item.name?.toLowerCase() || '';
    if (itemPrice === 0 && (itemSlug === 'free-gift' || itemName === 'free gift' || itemName === 'هدية مجانية')) {
      return true;
    }

    return false;
  }, [cartItems, rules, locale]);

  const isFreeGiftProduct = useCallback((productId: number): boolean => {
    // Check if the product ID matches any gift rule (both EN and AR product IDs)
    return rules.some((rule) => {
      const localizedProductId = getLocalizedProductId(rule, locale);
      return localizedProductId === productId || rule.product_id === productId || rule.product_id_ar === productId;
    });
  }, [rules, locale]);

  const getFreeGiftProductIds = useCallback((): number[] => {
    // Return all gift product IDs (both EN and AR) to ensure proper filtering
    const ids: number[] = [];
    for (const rule of rules) {
      ids.push(rule.product_id);
      if (rule.product_id_ar) {
        ids.push(rule.product_id_ar);
      }
    }
    return [...new Set(ids)];
  }, [rules]);

    const getGiftMessages = useCallback((locale: string): string[] => {
      return activeGifts
        .map((gift) => locale === "ar" ? gift.message_ar : gift.message_en)
        .filter((msg) => msg && msg.trim() !== "");
    }, [activeGifts]);

    const dismissGiftCelebration = useCallback(() => {
      setNewGiftCelebration({ isVisible: false, giftName: null });
    }, []);

  const getGiftProgress = useCallback((): GiftProgress => {
    // Calculate subtotal without gift items (include both EN and AR product IDs)
    const giftProductIds = new Set<number>();
    for (const r of rules) {
      giftProductIds.add(r.product_id);
      if (r.product_id_ar) {
        giftProductIds.add(r.product_id_ar);
      }
    }
    const subtotalValue = parseFloat(cartSubtotal) / divisor;
    
    // Calculate gift items total to subtract from subtotal
    let giftsTotalValue = 0;
    for (const item of cartItems) {
      if (giftProductIds.has(item.id)) {
        giftsTotalValue += (parseFloat(item.price) / divisor * item.quantity.value);
      }
    }
    const subtotalWithoutGifts = subtotalValue - giftsTotalValue;

    // Use exact current-currency rules when present; otherwise use AED base rules
    // and convert thresholds for the selected cart currency.
    const eligibleRules = getApplicableRules(rules, currency)
      .map((rule) => {
        const thresholdCurrency = getRuleThresholdCurrency(rule, currency);
        return {
          rule,
          thresholdCurrency,
          thresholdInCurrentCurrency: convertCurrencyAmount(
            rule.min_cart_value,
            thresholdCurrency,
            currency,
            currencies
          ),
        };
      })
      .sort((a, b) => a.thresholdInCurrentCurrency - b.thresholdInCurrentCurrency);

    // Find the next gift rule that hasn't been unlocked yet
    const nextGiftRuleEntry = eligibleRules.find(({ thresholdInCurrentCurrency }) => {
      return subtotalWithoutGifts < thresholdInCurrentCurrency;
    });

    if (nextGiftRuleEntry) {
      const subtotalInRuleCurrency = convertCurrencyAmount(
        subtotalWithoutGifts,
        currency,
        nextGiftRuleEntry.thresholdCurrency,
        currencies
      );
      const amountNeeded = nextGiftRuleEntry.rule.min_cart_value - subtotalInRuleCurrency;
      return {
        hasNextGift: true,
        amountNeeded: Math.ceil(amountNeeded),
        amountNeededCurrency: nextGiftRuleEntry.thresholdCurrency,
        nextGiftRule: nextGiftRuleEntry.rule,
        currentSubtotal: subtotalInRuleCurrency,
      };
    }

    return {
      hasNextGift: false,
      amountNeeded: 0,
      amountNeededCurrency: currency,
      nextGiftRule: null,
      currentSubtotal: subtotalWithoutGifts,
    };
  }, [rules, cartItems, cartSubtotal, currency, divisor, currencies]);

  useEffect(() => {
    const processGiftLogic = async () => {
      if (isProcessingRef.current) return;
      if (rules.length === 0) return;
      if (!cart) return;

      // Get all gift product IDs for hash calculation (include both EN and AR product IDs)
      const giftProductIds = new Set<number>();
      for (const r of rules) {
        giftProductIds.add(r.product_id);
        if (r.product_id_ar) {
          giftProductIds.add(r.product_id_ar);
        }
      }
      const currentStateHash = getCartStateHash(cartItems, cartSubtotal, giftProductIds);

      if (lastProcessedStateRef.current === currentStateHash) {
        return;
      }

      // Find existing gift items in cart
      // A gift item is identified by:
      // 1. Having the _sasanperfumes_free_gift flag in cart_item_data (if CoCart preserves it)
      // 2. OR having a product_id that matches a gift rule (check both EN and AR product IDs)
      // We now also track the rule ID to support multiple rules with the same product
      const existingFreeGifts: Array<{ item: typeof cartItems[0]; rule: FreeGiftRule | undefined; ruleId: string | undefined }> = [];
      for (const item of cartItems) {
        const isFreeGiftFlag = item.cart_item_data?.[FREE_GIFT_ITEM_DATA_KEY] === true;
        const storedRuleId = item.cart_item_data?.[FREE_GIFT_RULE_ID_KEY] as string | undefined;
        
        // If we have a stored rule ID, find that specific rule
        // Otherwise, find any matching rule by product ID (for backwards compatibility)
        let matchingRule: FreeGiftRule | undefined;
        if (storedRuleId) {
          matchingRule = rules.find((rule) => rule.id === storedRuleId);
        } else {
          // Check if item matches any gift rule (both EN and AR product IDs)
          matchingRule = rules.find((rule) => {
            const localizedProductId = getLocalizedProductId(rule, locale);
            return localizedProductId === item.id || rule.product_id === item.id || rule.product_id_ar === item.id;
          });
        }
        
        // If the product matches a gift rule, treat it as a gift
        // This handles cases where CoCart doesn't preserve the flag
        if (isFreeGiftFlag || matchingRule) {
          existingFreeGifts.push({ item, rule: matchingRule, ruleId: storedRuleId || matchingRule?.id });
        }
      }

      const subtotalValue = parseFloat(cartSubtotal) / divisor;
      const giftsTotalValue = existingFreeGifts.reduce((sum, { item }) => {
        return sum + (parseFloat(item.price) / divisor * item.quantity.value);
      }, 0);
      const subtotalWithoutGifts = subtotalValue - giftsTotalValue;

      const matchingRules = getApplicableRules(rules, currency).filter((rule) => {
        const thresholdCurrency = getRuleThresholdCurrency(rule, currency);
        const subtotalInRuleCurrency = convertCurrencyAmount(
          subtotalWithoutGifts,
          currency,
          thresholdCurrency,
          currencies
        );

        if (subtotalInRuleCurrency < rule.min_cart_value) return false;
        if (rule.max_cart_value && subtotalInRuleCurrency > rule.max_cart_value) return false;
        return true;
      });
      matchingRules.sort((a, b) => a.priority - b.priority);

      const currentGiftKeys: string[] = [];
      const currentActiveGifts: FreeGiftRule[] = [];

      for (const { item, rule } of existingFreeGifts) {
        if (rule) {
          currentGiftKeys.push(item.item_key);
          currentActiveGifts.push(rule);
        }
      }

      setFreeGiftItemKeys(currentGiftKeys);
      setActiveGifts(currentActiveGifts);

      for (const { item } of existingFreeGifts) {
        if (item.quantity.value > 1 && !correctedGiftKeysRef.current.has(item.item_key)) {
          isProcessingRef.current = true;
          correctedGiftKeysRef.current.add(item.item_key);
          try {
            await updateCartItemRef.current(item.item_key, 1);
          } catch (error) {
            console.error("Failed to correct gift quantity:", error);
          } finally {
            isProcessingRef.current = false;
          }
          return;
        }
      }

      // Track by rule ID to support multiple rules with the same product
      const existingGiftRuleIds = new Set(existingFreeGifts.map(({ ruleId }) => ruleId).filter(Boolean));
      const matchingRuleIds = new Set(matchingRules.map((r) => r.id));

      // Remove gifts whose rules no longer match (by rule ID)
      const giftsToRemove = existingFreeGifts.filter(({ ruleId }) => !ruleId || !matchingRuleIds.has(ruleId));
      // Add gifts for rules that don't have a gift yet (by rule ID)
      const rulesToAdd = matchingRules.filter((rule) => !existingGiftRuleIds.has(rule.id));

      if (giftsToRemove.length === 0 && rulesToAdd.length === 0) {
        // Only update the hash when no changes are needed
        // This prevents re-processing the same state
        lastProcessedStateRef.current = currentStateHash;
        setActiveGifts(matchingRules);
        return;
      }

      isProcessingRef.current = true;
      try {
        for (const { item } of giftsToRemove) {
          try {
            await removeCartItemRef.current(item.item_key);
          } catch (error) {
            console.error("Failed to remove gift:", error);
          }
        }

        for (const rule of rulesToAdd) {
          try {
            // Use locale-aware product ID when adding to cart
            // Include rule ID and a unique key in cart_item_data to support multiple rules with the same product
            // The unique key ensures CoCart creates separate line items even for the same product
            const localizedProductId = getLocalizedProductId(rule, locale);
            const uniqueKey = `${rule.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await addToCartRef.current(localizedProductId, 1, undefined, undefined, {
              [FREE_GIFT_ITEM_DATA_KEY]: true,
              [FREE_GIFT_RULE_ID_KEY]: rule.id,
              [FREE_GIFT_UNIQUE_KEY]: uniqueKey,
            });
            
            // Open mini cart and dispatch event for gift highlight effect
            // Don't open cart on order confirmation page
            const isOrderConfirmationPage = pathname?.includes("/order-confirmation");
            if (!isOrderConfirmationPage) {
              setIsCartOpen(true);
            }
            // Use locale-aware product data for gift name
            // For non-Arabic locales, ensure we don't show Arabic text
            const localizedProduct = getLocalizedProduct(rule, locale);
            let giftName = localizedProduct?.name;
            if (!giftName && locale !== "ar") {
              // For English locale, use "Free Gift" as fallback if product name contains Arabic
              giftName = (rule.product?.name && !containsArabic(rule.product.name)) ? rule.product.name : "Free Gift";
            } else if (!giftName) {
              giftName = rule.product?.name || rule.name;
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent(NEW_GIFT_ADDED_EVENT, { 
                detail: { giftName, productId: localizedProductId } 
              }));
            }
          } catch (error) {
            console.error("Failed to add gift:", error);
          }
        }

        setActiveGifts(matchingRules);
        // Update the hash after all gifts have been added/removed
        // This allows the effect to re-run and add remaining gifts if needed
        lastProcessedStateRef.current = currentStateHash;
      } finally {
        isProcessingRef.current = false;
      }
    };

    const timeoutId = setTimeout(processGiftLogic, 500);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cart,
    cartItems,
    cartSubtotal,
    rules,
    currency,
    divisor,
    locale,
    currencies,
  ]);

  return (
    <FreeGiftContext.Provider
      value={{
        rules,
        isLoading,
        activeGifts,
        freeGiftItemKeys,
        isFreeGiftItem,
        isFreeGiftProduct,
        getFreeGiftProductIds,
        refreshRules: fetchRules,
        getGiftMessages,
        getGiftProgress,
        newGiftCelebration,
        dismissGiftCelebration,
      }}
    >
      {children}
    </FreeGiftContext.Provider>
  );
}

export function useFreeGift() {
  const context = useContext(FreeGiftContext);
  if (context === undefined) {
    throw new Error("useFreeGift must be used within a FreeGiftProvider");
  }
  return context;
}
