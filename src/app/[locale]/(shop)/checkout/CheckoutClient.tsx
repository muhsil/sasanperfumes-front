"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Checkbox } from "@/components/common/Checkbox";
import { Radio } from "@/components/common/Radio";
import { CountrySelect, type CountryOption } from "@/components/common/CountrySelect";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { useCart } from "@/contexts/CartContext";
import { useDiscountRules } from "@/contexts/DiscountRulesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getCustomer, getSavedAddressesFromCustomer, saveSavedAddresses, generateAddressId, resolveCountryCode, type Customer, type SavedAddress } from "@/lib/api/customer";
import { featureFlags, type Locale } from "@/config/site";
import { MapPin, Check, ChevronDown, ChevronUp, Tag, X, Truck } from "lucide-react";
import { BundleItemsList, getBundleItems, getBundleItemsTotal, getBoxPrice, getPricingMode, getFixedPrice, getBundleTotal } from "@/components/cart/BundleItemsList";
import { PhoneInput } from "@/components/common/PhoneInput";
import { useProductMeta } from "@/hooks/useProductCategories";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { useCustomerTracking } from "@/hooks/useCustomerTracking";
import { omnisendIdentify, omnisendTrackStartedCheckout, type OmnisendLineItem } from "@/lib/utils/omnisend";
import { fbTrackInitiateCheckout } from "@/lib/utils/fbpixel";
import { trackAnalyticsEvent } from "@/lib/utils/analytics";
import type { CoCartItem } from "@/lib/api/cocart";
import { decodeHtmlEntities } from "@/lib/utils";
import { GiftWrapOption } from "@/components/checkout/GiftWrapOption";
import { useMarketPrefix } from "@/hooks/useMarketPrefix";
import { calculateCartDiscounts, getCartDiscountTotal } from "@/lib/discountRules";
import { getMarketDefaultCurrency } from "@/config/market";

interface ShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  taxes: string;
  instance_id: number;
  method_id: string;
  meta_data: Array<{ key: string; value: string }>;
  selected: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
  free_shipping_min_amount?: number;
  free_shipping_eligible?: boolean;
}

interface ShippingPackage {
  package_id: number;
  name: string;
  destination: {
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  items: Array<{
    key: string;
    name: string;
    quantity: number;
  }>;
  shipping_rates: ShippingRate[];
}

interface PaymentMethodCountryAvailability {
  type: "include" | "exclude";
  countries: string[];
}

interface PaymentGateway {
  id: string;
  title: string;
  description: string;
  method_title: string;
}

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  AED: "AE",
  BHD: "BH",
  KWD: "KW",
  OMR: "OM",
  QAR: "QA",
  SAR: "SA",
  USD: "US",
};

const PAYMENT_METHOD_COUNTRY_AVAILABILITY: Record<string, PaymentMethodCountryAvailability> = {
  tabby_installments: { type: "include", countries: ["AE", "SA", "KW", "BH", "QA"] },
  tabby_checkout: { type: "include", countries: ["AE", "SA", "KW", "BH", "QA"] },
  tabby: { type: "include", countries: ["AE", "SA", "KW", "BH", "QA"] },
  "tamara-gateway": { type: "include", countries: ["AE", "SA", "BH"] },
  tamara: { type: "include", countries: ["AE", "SA", "BH"] },
  cod: { type: "include", countries: ["AE"] },
};

const MARKET_DEFAULT_COUNTRIES: Record<string, string> = {
  qa: "QA",
  om: "OM",
  sa: "SA",
};

const WOO_PAYMENTS_METHODS = new Set(["woocommerce_payments", "stripe", "card"]);

const isWooPaymentsMethod = (paymentMethod: string): boolean => {
  const normalized = (paymentMethod || "").toLowerCase();
  if (WOO_PAYMENTS_METHODS.has(normalized)) return true;

  // WooPayments method IDs can vary by version (for example: stripe_card).
  return (
    normalized.includes("stripe") ||
    normalized.includes("woocommerce_payments") ||
    (normalized.includes("card") && !normalized.includes("check"))
  );
};

function isPaymentMethodAvailableForCountry(
  methodId: string,
  countryCode: string,
  apiAvailability?: Record<string, PaymentMethodCountryAvailability>
): boolean {
  const availability = apiAvailability?.[methodId] ?? PAYMENT_METHOD_COUNTRY_AVAILABILITY[methodId];
  if (!availability) {
    return true;
  }
  if (availability.type === "include") {
    return availability.countries.includes(countryCode);
  }
  return !availability.countries.includes(countryCode);
}

interface AddressFormData {
  firstName: string;
  lastName: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

interface CheckoutFormData {
  shipping: AddressFormData;
  billing: AddressFormData;
  sameAsShipping: boolean;
  paymentMethod: string;
  orderNotes: string;
}

const emptyAddress: AddressFormData = {
  firstName: "",
  lastName: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "AE",
  phone: "",
  email: "",
};

const sanitizeCheckoutMessage = (message: string): string => {
  const decoded = decodeHtmlEntities(message || "");
  const cleaned = decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // Replace raw WordPress authentication errors with user-friendly messages
  if (/unknown username/i.test(cleaned) || /invalid_username/i.test(cleaned)) {
    return "Could not process your order. Please try again or use a different email address.";
  }
  return cleaned;
};

export default function CheckoutClient() {
  const marketPrefix = useMarketPrefix();
  const marketCode = useMemo(() => marketPrefix.replace(/^\//, "").toLowerCase(), [marketPrefix]);
  const marketCurrency = getMarketDefaultCurrency(marketCode || "intl");
  const defaultCheckoutCountry = MARKET_DEFAULT_COUNTRIES[marketCode] || "AE";
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
        const { cart, cartItems, cartSubtotal, cartTotal, clearCart, removeCoupon, selectedCoupons, couponDiscount, clearSelectedCoupons, isLoading: isCartLoading } = useCart();
        const { rules: discountRules } = useDiscountRules();
        const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
        const { currency, convertPrice, getCurrencyInfo } = useCurrency();
    // For variable products, use parent_id for brand/category lookup
    const getParentId = (item: CoCartItem): number => {
      const pid = item.meta?.variation?.Parent_id || item.meta?.variation?.parent_id;
      return pid ? parseInt(pid, 10) : item.id;
    };
    const productIds = cartItems.map((item) => getParentId(item));
    const { categories: productCategories, categoryIds: productCategoryIds, brands: productBrands } = useProductMeta(productIds, locale as Locale);
    const getItemLookupId = (item: CoCartItem): number => getParentId(item);
    const isRTL = locale === "ar";
    const isKeyboardVisible = useKeyboardVisible();
    const { getOrderMetaData, clearTracking } = useCustomerTracking();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [customerData, setCustomerData] = useState<Customer | null>(null);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddressSelector, setShowAddressSelector] = useState(false);
        const [showBillingSection, setShowBillingSection] = useState(false);
        const [emptyCartCountdown, setEmptyCartCountdown] = useState<number | null>(null);
        const [paymentError, setPaymentError] = useState<string | null>(null);
        const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  
            const [giftWrap, setGiftWrap] = useState(false);
        const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
        const [apiCountryAvailability, setApiCountryAvailability] = useState<Record<string, PaymentMethodCountryAvailability>>({});
        const [isLoadingGateways, setIsLoadingGateways] = useState(true);
        const [shippingPackages, setShippingPackages] = useState<ShippingPackage[]>([]);
        const [isLoadingShipping, setIsLoadingShipping] = useState(false);
        const [selectedShippingRate, setSelectedShippingRate] = useState<string | null>(null);
        const [shippingTotal, setShippingTotal] = useState<string>("0");
        const [shippingCountries, setShippingCountries] = useState<CountryOption[] | undefined>(undefined);
        
        const [createAccount, setCreateAccount] = useState(false);
        const [accountPassword, setAccountPassword] = useState("");
        const [confirmPassword, setConfirmPassword] = useState("");
        const [passwordError, setPasswordError] = useState<string | null>(null);
        const [isCreatingAccount, setIsCreatingAccount] = useState(false);
        
        // Email registration check state
        const [isEmailRegistered, setIsEmailRegistered] = useState(false);
        const [isCheckingEmail, setIsCheckingEmail] = useState(false);
        const [showLoginPrompt, setShowLoginPrompt] = useState(false);
        const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const beginCheckoutTrackedRef = useRef(false);
        const shippingInfoTrackedRef = useRef<string | null>(null);
        const paymentInfoTrackedRef = useRef(false);

  const [addressErrors, setAddressErrors] = useState<{ shippingAddress?: string; shippingCity?: string; billingAddress?: string; billingCity?: string }>({});

  const buildCheckoutApiUrl = useCallback((path: string, params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    if (marketCode) {
      searchParams.set("market", marketCode);
    }
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }, [marketCode]);

  const getCheckoutApiHeaders = useCallback((extra: HeadersInit = {}): HeadersInit => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extra as Record<string, string>),
    };
    if (typeof window !== "undefined") {
      const host = window.location.hostname.replace(/^www\./, "");
      if (host) {
        headers["X-Frontend-Host"] = marketCode ? `${host}/${marketCode}` : host;
      }
    }
    if (marketCode) {
      headers["X-Market"] = marketCode;
    }
    return headers;
  }, [marketCode]);
  
  const currencyMinorUnit = cart?.currency?.currency_minor_unit ?? 2;
  const divisor = Math.pow(10, currencyMinorUnit);
  const selectedShippingRateDetails = useMemo(() => {
    if (!selectedShippingRate || shippingPackages.length === 0) return null;
    return (
      shippingPackages.flatMap((pkg) => pkg.shipping_rates || []).find((rate) => rate.rate_id === selectedShippingRate) ||
      shippingPackages.flatMap((pkg) => pkg.shipping_rates || []).find((rate) => rate.selected) ||
      null
    );
  }, [selectedShippingRate, shippingPackages]);
  const shippingCurrencyMinorUnit = selectedShippingRateDetails?.currency_minor_unit ?? currencyMinorUnit;
  const shippingDivisor = Math.pow(10, shippingCurrencyMinorUnit);
  const cartDiscounts = useMemo(
    () => {
      try {
        return calculateCartDiscounts(cartItems, discountRules, { categoryIdsByProductId: productCategoryIds, currencyMinorUnit });
      } catch (err) {
        console.error("[Checkout] Failed to calculate cart discounts:", err);
        return [];
      }
    },
    [cartItems, discountRules, productCategoryIds, currencyMinorUnit]
  );
  const promotionalDiscountTotal = getCartDiscountTotal(cartDiscounts);

  const [formData, setFormData] = useState<CheckoutFormData>({
    shipping: { ...emptyAddress, country: defaultCheckoutCountry },
    billing: { ...emptyAddress, country: defaultCheckoutCountry },
    sameAsShipping: true,
    paymentMethod: "stripe",
    orderNotes: "",
  });

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (isAuthenticated && user?.user_id) {
        setIsLoadingCustomer(true);
        try {
          const response = await getCustomer(user.user_id);
          if (response.success && response.data) {
            const customer = response.data;
            setCustomerData(customer);
            
            const addresses = getSavedAddressesFromCustomer(customer);
            setSavedAddresses(addresses);
            
            const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
            
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress.id);
              const addressFormData: AddressFormData = {
                firstName: defaultAddress.first_name || "",
                lastName: defaultAddress.last_name || "",
                address: defaultAddress.address_1 || "",
                address2: defaultAddress.address_2 || "",
                city: defaultAddress.city || "",
                state: defaultAddress.state || "",
                postalCode: defaultAddress.postcode || "",
                country: resolveCountryCode(defaultAddress.country) || defaultCheckoutCountry,
                phone: defaultAddress.phone || "",
                email: defaultAddress.email || customer.email || "",
              };
              
              setFormData(prev => ({
                ...prev,
                shipping: addressFormData,
                billing: prev.sameAsShipping ? addressFormData : prev.billing,
              }));
            } else {
              const shippingAddress: AddressFormData = {
                firstName: customer.shipping?.first_name || "",
                lastName: customer.shipping?.last_name || "",
                address: customer.shipping?.address_1 || "",
                address2: customer.shipping?.address_2 || "",
                city: customer.shipping?.city || "",
                state: customer.shipping?.state || "",
                postalCode: customer.shipping?.postcode || "",
                country: resolveCountryCode(customer.shipping?.country || "") || defaultCheckoutCountry,
                phone: customer.shipping?.phone || customer.billing?.phone || "",
                email: customer.billing?.email || customer.email || "",
              };
              
              const billingAddress: AddressFormData = {
                firstName: customer.billing?.first_name || "",
                lastName: customer.billing?.last_name || "",
                address: customer.billing?.address_1 || "",
                address2: customer.billing?.address_2 || "",
                city: customer.billing?.city || "",
                state: customer.billing?.state || "",
                postalCode: customer.billing?.postcode || "",
                country: resolveCountryCode(customer.billing?.country || "") || defaultCheckoutCountry,
                phone: customer.billing?.phone || "",
                email: customer.billing?.email || customer.email || "",
              };
              
              setFormData(prev => ({
                ...prev,
                shipping: shippingAddress,
                billing: prev.sameAsShipping ? shippingAddress : billingAddress,
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch customer data:", err);
          if (user) {
            const nameParts = user.user_display_name?.split(" ") || ["", ""];
            setFormData(prev => ({
              ...prev,
              shipping: {
                ...prev.shipping,
                firstName: prev.shipping.firstName || nameParts[0] || "",
                lastName: prev.shipping.lastName || nameParts.slice(1).join(" ") || "",
                email: prev.shipping.email || user.user_email || "",
              },
              billing: prev.sameAsShipping ? {
                ...prev.shipping,
                firstName: prev.shipping.firstName || nameParts[0] || "",
                lastName: prev.shipping.lastName || nameParts.slice(1).join(" ") || "",
                email: prev.shipping.email || user.user_email || "",
              } : prev.billing,
            }));
          }
        } finally {
          setIsLoadingCustomer(false);
        }
      }
    };
      fetchCustomerData();
    }, [isAuthenticated, user]);

        useEffect(() => {
          const fetchPaymentGateways = async () => {
            setIsLoadingGateways(true);
            try {
              const response = await fetch(buildCheckoutApiUrl("/api/payment-gateways"));
              const data = await response.json();
              if (data.success && data.gateways) {
                setPaymentGateways(data.gateways);
                if (data.country_availability) {
                  setApiCountryAvailability(data.country_availability);
                }
              }
            } catch (err) {
              console.error("Failed to fetch payment gateways:", err);
            } finally {
              setIsLoadingGateways(false);
            }
          };
                  fetchPaymentGateways();
                }, [marketPrefix]);

        useEffect(() => {
          const fetchShippingCountries = async () => {
            try {
              const response = await fetch(buildCheckoutApiUrl("/api/shipping-countries"));
              const data = await response.json();
              if (data.success && data.countries) {
                const mapped: CountryOption[] = data.countries.map((c: { code: string; name: string }) => ({
                  value: c.code,
                  label: c.name,
                }));
                if (mapped.length > 0) {
                  setShippingCountries(mapped);
                }
              }
            } catch (err) {
              console.error("Failed to fetch shipping countries:", err);
            }
          };
          fetchShippingCountries();
        }, []);

        useEffect(() => {
          if (!currency) return;
          const mappedCountry = CURRENCY_TO_COUNTRY[currency];
          if (mappedCountry && mappedCountry !== formData.shipping.country) {
            setFormData((prev) => ({
              ...prev,
              shipping: { ...prev.shipping, country: mappedCountry },
              billing: prev.sameAsShipping ? { ...prev.shipping, country: mappedCountry } : prev.billing,
            }));
          }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [currency]);

        const filteredPaymentGateways = paymentGateways.filter((gateway) =>
          isPaymentMethodAvailableForCountry(gateway.id, formData.shipping.country, apiCountryAvailability)
        );

        useEffect(() => {
          const available = paymentGateways.filter((gateway) =>
            isPaymentMethodAvailableForCountry(gateway.id, formData.shipping.country, apiCountryAvailability)
          );
          if (available.length > 0) {
            const currentMethodAvailable = available.some(
              (gateway) => gateway.id === formData.paymentMethod
            );
            if (!currentMethodAvailable) {
              setFormData((prev) => ({
                ...prev,
                paymentMethod: available[0].id,
              }));
            }
          }
        }, [paymentGateways, formData.shipping.country, formData.paymentMethod, apiCountryAvailability]);

        // Check for payment error from redirect (Tabby, Tamara)
        useEffect(() => {
          const verifyFailedPayment = async () => {
            const tabbyPaymentId = searchParams.get("payment_id");
            const tamaraOrderId = searchParams.get("orderId");
            const orderId = searchParams.get("order_id");
            
            // Only verify if we have payment params and an order_id (indicates redirect from payment gateway)
            if (!orderId) return;
            
            const hasPaymentParams = tabbyPaymentId || tamaraOrderId;
            if (!hasPaymentParams) return;
            
            setIsVerifyingPayment(true);
            
            try {
              let verifyUrl = "";
              
              if (tabbyPaymentId) {
                verifyUrl = buildCheckoutApiUrl("/api/tabby/verify-payment", { payment_id: tabbyPaymentId });
              } else if (tamaraOrderId) {
                verifyUrl = buildCheckoutApiUrl("/api/tamara/verify-payment", { order_id: tamaraOrderId });
              }
              
              if (verifyUrl) {
                const verifyResponse = await fetch(verifyUrl);
                const verifyData = await verifyResponse.json();
                
                if (verifyData.success && verifyData.payment_status === "failed") {
                  const errorMessage = verifyData.status_message || verifyData.error_message || 
                    (isRTL ? "فشل الدفع. يرجى المحاولة مرة أخرى أو استخدام طريقة دفع مختلفة." : "Payment failed. Please try again or use a different payment method.");
                  setPaymentError(errorMessage);
                } else if (!verifyData.success) {
                  // API call failed, show generic error
                  setPaymentError(isRTL ? "فشل الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
                }
              }
            } catch (err) {
              console.error("Failed to verify payment:", err);
              setPaymentError(isRTL ? "فشل الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
            } finally {
              setIsVerifyingPayment(false);
            }
          };
          
          verifyFailedPayment();
        }, [searchParams, isRTL]);

// Grace period: allow cart data (including localStorage seed) to resolve
        // before treating the cart as truly empty. Prevents false redirects when
        // the backend is slow or the SWR cache hasn't hydrated from localStorage.
        const [cartInitReady, setCartInitReady] = useState(false);
        useEffect(() => {
          if (!isCartLoading && cartItems.length > 0) {
            setCartInitReady(true);
            return;
          }
          const timer = setTimeout(() => setCartInitReady(true), 5000);
          return () => clearTimeout(timer);
        }, [isCartLoading, cartItems.length]);

// Empty cart detection and auto-redirect
        const isEmptyCart = cartInitReady && !isCartLoading && cartItems.length === 0 && parseFloat(cartTotal) === 0;
        
        useEffect(() => {
          if (isEmptyCart) {
            setEmptyCartCountdown(10);
          } else {
            setEmptyCartCountdown(null);
          }
        }, [isEmptyCart]);

        useEffect(() => {
          if (emptyCartCountdown === null || emptyCartCountdown <= 0) return;
          
          const timer = setInterval(() => {
            setEmptyCartCountdown((prev) => {
              if (prev === null || prev <= 1) {
                router.push(`${marketPrefix}/${locale}`);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        }, [emptyCartCountdown, router, locale, marketPrefix]);

        const discountedCartSubtotal = Math.max((parseFloat(cartSubtotal) || 0) - couponDiscount - promotionalDiscountTotal, 0);

        const fetchShippingMethods = async (country: string, city: string, postcode: string) => {
          setIsLoadingShipping(true);
          try {
            const subtotal = discountedCartSubtotal;
            const weight = cart?.items_weight || 0;
            const shippingCountry = country || defaultCheckoutCountry;
            const params = new URLSearchParams({
              country: shippingCountry,
              city: city || "",
              postcode: postcode || "",
              cart_subtotal: String(subtotal),
              cart_weight: String(weight),
              currency_code: currency || marketCurrency,
            });
            const response = await fetch(buildCheckoutApiUrl("/api/shipping", Object.fromEntries(params.entries())));
            const data = await response.json();
            if (data.success && data.shipping_rates) {
              setShippingPackages(data.shipping_rates);
              if (data.totals?.shipping_total) {
                setShippingTotal(data.totals.shipping_total);
              }
              const allRates = data.shipping_rates.flatMap((pkg: ShippingPackage) => pkg.shipping_rates || []);
              const selectedRate = allRates.find((rate: ShippingRate) => rate.selected);
              if (selectedRate) {
                setSelectedShippingRate(selectedRate.rate_id);
              } else if (allRates.length > 0) {
                setSelectedShippingRate(allRates[0].rate_id);
                handleSelectShippingRate(allRates[0].rate_id, 0);
              }
            }
          } catch (err) {
            console.error("Failed to fetch shipping methods:", err);
          } finally {
            setIsLoadingShipping(false);
          }
        };

        useEffect(() => {
          if (formData.shipping.country) {
            const timeoutId = setTimeout(() => {
              fetchShippingMethods(
                formData.shipping.country,
                formData.shipping.city,
                formData.shipping.postalCode
              );
            }, 500);
            return () => clearTimeout(timeoutId);
          }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [couponDiscount, promotionalDiscountTotal, formData.shipping.country, formData.shipping.city, formData.shipping.postalCode, cartSubtotal]);

        // Calculate customs fee client-side for every storefront so QA/SA/OM
        // follow the same charge model as the main site.
        const customsFee = useMemo(() => {
          const country = formData.shipping.country;
          if (!country || country === "AE") return null;
          // 20% of cart subtotal (subtotal is in minor units)
          const subtotal = parseFloat(cartSubtotal) || 0;
          if (subtotal <= 0) return null;
          const feeAmount = Math.round(subtotal * 0.20);
          return {
            name: "Customs fees",
            fee: String(feeAmount),
          };
        }, [formData.shipping.country, cartSubtotal]);

        const handleSelectShippingRate = async (rateId: string, packageId: number = 0) => {
          setSelectedShippingRate(rateId);
          try {
            const response = await fetch("/api/shipping", {
              method: "POST",
              headers: getCheckoutApiHeaders(),
              body: JSON.stringify({ rate_id: rateId, package_id: packageId, shipping_rates: shippingPackages }),
            });
            const data = await response.json();
            if (data.success) {
              const ratesSource = data.shipping_rates || shippingPackages;
              const allRates = ratesSource.flatMap((pkg: ShippingPackage) => pkg.shipping_rates || []);
              const selectedRate = allRates.find((rate: ShippingRate) => rate.rate_id === rateId) || allRates.find((rate: ShippingRate) => rate.selected);
              const shippingInfoKey = `${rateId}:${packageId}`;

              if (data.shipping_rates) {
                setShippingPackages(data.shipping_rates);
              }
              if (data.totals?.shipping_total) {
                setShippingTotal(data.totals.shipping_total);
              }

              if (shippingInfoTrackedRef.current !== shippingInfoKey && selectedRate) {
                trackAnalyticsEvent("add_shipping_info", {
                  currency: currency || marketCurrency,
                  value: parseFloat(data.totals?.shipping_total || shippingTotal || "0") / Math.pow(10, selectedRate.currency_minor_unit || shippingCurrencyMinorUnit),
                  shipping_tier: selectedRate.name || rateId,
                  items: checkoutAnalyticsItems,
                });
                shippingInfoTrackedRef.current = shippingInfoKey;
              }
            }
          } catch (err) {
            console.error("Failed to select shipping rate:", err);
          }
        };

    const handleRemoveCoupon = async (code: string) => {
      try {
        await removeCoupon(code);
      } catch (error) {
        console.error("Failed to remove coupon:", error);
      }
    };



    // Calculate total fees -- merge client-side customs fee with any existing cart.fees
    const cartFeeTotal = useMemo(() => {
      try {
        let total = 0;
        const fees = Array.isArray(cart?.fees) ? cart.fees : [];
        const nonCustomsFeesTotal = fees
          .filter(fee => fee?.name?.toLowerCase() !== "customs fees")
          .reduce((sum, fee) => sum + (parseFloat(fee?.fee) || 0), 0);
        const customsFeesTotal = customsFee
          ? (parseFloat(customsFee.fee) || 0)
          : fees
              .filter(fee => fee?.name?.toLowerCase() === "customs fees")
              .reduce((sum, fee) => sum + (parseFloat(fee?.fee) || 0), 0);
        total += nonCustomsFeesTotal + customsFeesTotal;
        return total;
      } catch (err) {
        console.error("[Checkout] Failed to calculate fees:", err);
        return 0;
      }
    }, [customsFee, cart?.fees]);

    const checkoutTotal = useMemo(() => {
      try {
        if (shippingPackages.length > 0) {
          const subtotalMajor = (discountedCartSubtotal || 0) / divisor;
          const shippingMajor = (parseFloat(shippingTotal) || 0) / shippingDivisor;
          const feesMajor = (cartFeeTotal || 0) / divisor;
          return subtotalMajor + shippingMajor + feesMajor;
        }
        const baseTotal = parseFloat(cartTotal) || 0;
        const serverCustomsFeeTotal = (Array.isArray(cart?.fees) ? cart.fees : [])
          .filter(fee => fee?.name?.toLowerCase() === "customs fees")
          .reduce((sum, fee) => sum + (parseFloat(fee?.fee) || 0), 0);
        const clientCustomsFee = customsFee ? (parseFloat(customsFee.fee) || 0) : 0;
        return Math.max(baseTotal - promotionalDiscountTotal - serverCustomsFeeTotal + clientCustomsFee, 0);
      } catch (err) {
        console.error("[Checkout] Failed to calculate checkout total:", err);
        return Math.max(parseFloat(cartTotal) || 0, 0);
      }
    }, [discountedCartSubtotal, shippingTotal, shippingPackages, cartTotal, cartFeeTotal, customsFee, cart?.fees, promotionalDiscountTotal, divisor, shippingDivisor]);

    const checkoutAnalyticsItems = useMemo(() => {
      return cartItems
        .filter((item) => !item.item_key.startsWith("temp-"))
        .map((item) => ({
          item_id: String(getItemLookupId(item)),
          item_name: decodeHtmlEntities(item.name || item.title || ""),
          price: parseFloat(item.price || "0") / divisor,
          quantity: item.quantity?.value || 1,
          item_variant: item.variation_id ? String(item.variation_id) : undefined,
        }));
    }, [cartItems, divisor, getItemLookupId]);

    const breadcrumbItems = [
    { name: isRTL ? "السلة" : "Cart", href: `${marketPrefix}/${locale}/cart` },
    { name: isRTL ? "الدفع" : "Checkout", href: `${marketPrefix}/${locale}/checkout` },
  ];

  const checkoutTitle = breadcrumbItems[1]?.name || "Checkout";
  const checkoutSubtitle = isRTL ? "" : "Review your details and complete your order securely.";

  const isNumericOnly = (value: string): boolean => {
    return /^[\d\s.,/-]+$/.test(value.trim());
  };

  const handleShippingChange = (field: keyof AddressFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      shipping: { ...prev.shipping, [field]: value },
      billing: prev.sameAsShipping ? { ...prev.shipping, [field]: value } : prev.billing,
    }));
    setError(null);
    if (field === "address" && addressErrors.shippingAddress) {
      setAddressErrors((prev) => ({ ...prev, shippingAddress: undefined }));
    }
    if (field === "city" && addressErrors.shippingCity) {
      setAddressErrors((prev) => ({ ...prev, shippingCity: undefined }));
    }
  };

  const handleBillingChange = (field: keyof AddressFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      billing: { ...prev.billing, [field]: value },
    }));
    setError(null);
    if (field === "address" && addressErrors.billingAddress) {
      setAddressErrors((prev) => ({ ...prev, billingAddress: undefined }));
    }
    if (field === "city" && addressErrors.billingCity) {
      setAddressErrors((prev) => ({ ...prev, billingCity: undefined }));
    }
  };

  const handleSameAsShippingChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      sameAsShipping: checked,
      billing: checked ? { ...prev.shipping } : prev.billing,
    }));
  };

  const handlePaymentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, paymentMethod: value }));
  };

  const handleNotesChange = (value: string) => {
    setFormData((prev) => ({ ...prev, orderNotes: value }));
  };

  // Check if email is registered (debounced)
  const checkEmailRegistration = useCallback(async (email: string) => {
    // Don't check if user is already authenticated
    if (isAuthenticated) {
      setIsEmailRegistered(false);
      setShowLoginPrompt(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setIsEmailRegistered(false);
      setShowLoginPrompt(false);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const response = await fetch(buildCheckoutApiUrl("/api/customer/check-email", { email }));
      const data = await response.json();
      
      if (data.success && data.data.isRegistered) {
        setIsEmailRegistered(true);
        // Auto-uncheck create account if email is already registered
        if (createAccount) {
          setCreateAccount(false);
          setAccountPassword("");
          setConfirmPassword("");
          setPasswordError(null);
        }
        // Show non-blocking login suggestion (does not prevent guest checkout)
        setShowLoginPrompt(true);
      } else {
        setIsEmailRegistered(false);
        setShowLoginPrompt(false);
      }
    } catch (error) {
      console.error("Failed to check email registration:", error);
      setIsEmailRegistered(false);
      setShowLoginPrompt(false);
    } finally {
      setIsCheckingEmail(false);
    }
  }, [isAuthenticated, createAccount]);

  // Debounced email check when email changes
  useEffect(() => {
    const email = formData.shipping.email;
    
    // Clear any existing timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Set a new timeout to check email after 500ms of no typing
    emailCheckTimeoutRef.current = setTimeout(() => {
      checkEmailRegistration(email);

      // Identify user in Omnisend when guest enters email at checkout
      // This enables abandoned cart/checkout email recovery for guest users
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && emailRegex.test(email)) {
          omnisendIdentify(email);

        // Also fire "started checkout" event so Omnisend can track checkout abandonment
        if (cart && cartItems.length > 0 && !beginCheckoutTrackedRef.current) {
          const currMinorUnit = cart.currency?.currency_minor_unit ?? 2;
          const currDivisor = Math.pow(10, currMinorUnit);
          const cartValue = parseFloat(cart.totals?.total || "0") / currDivisor;

          const lineItems: OmnisendLineItem[] = cartItems.map((ci: CoCartItem) => ({
            productID: String(ci.id),
            productTitle: ci.name || ci.title || "",
            productPrice: parseFloat(ci.price || "0") / currDivisor,
            productImageURL: ci.featured_image || "",
            productURL: ci.slug
              ? `${window.location.origin}/en/product/${ci.slug}`
              : "",
          }));

          omnisendTrackStartedCheckout({
            lineItems,
            value: cartValue,
            currency: cart.currency?.currency_code || currency || marketCurrency,
            cartID: cart.cart_key || "",
            email,
          });

          // Facebook Pixel: InitiateCheckout
          fbTrackInitiateCheckout({
            contentIds: cartItems.map((ci: CoCartItem) => String(ci.id)),
            value: cartValue,
            currency: cart.currency?.currency_code || currency || marketCurrency,
            numItems: cartItems.reduce((sum: number, ci: CoCartItem) => sum + ci.quantity.value, 0),
          });

          trackAnalyticsEvent("begin_checkout", {
            value: cartValue,
            currency: cart.currency?.currency_code || currency || marketCurrency,
            item_count: cartItems.length,
            total_quantity: cartItems.reduce((sum: number, ci: CoCartItem) => sum + ci.quantity.value, 0),
            items: cartItems
              .filter((ci: CoCartItem) => !ci.item_key.startsWith("temp-"))
              .map((ci: CoCartItem) => ({
                item_id: String(getItemLookupId(ci)),
                item_name: decodeHtmlEntities(ci.name || ci.title || ""),
                price: parseFloat(ci.price || "0") / currDivisor,
                quantity: ci.quantity.value,
                item_variant: ci.variation_id ? String(ci.variation_id) : undefined,
              })),
          });

          beginCheckoutTrackedRef.current = true;
        }
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [formData.shipping.email, checkEmailRegistration, cart, cartItems]);

  const handleSelectSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setShowAddressSelector(false);
    
    const addressFormData: AddressFormData = {
      firstName: address.first_name || "",
      lastName: address.last_name || "",
      address: address.address_1 || "",
      address2: address.address_2 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postcode || "",
      country: resolveCountryCode(address.country),
      phone: address.phone || "",
      email: address.email || customerData?.email || "",
    };
    
    setFormData(prev => ({
      ...prev,
      shipping: addressFormData,
      billing: prev.sameAsShipping ? addressFormData : prev.billing,
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setPasswordError(null);
    setAddressErrors({});

    try {
      const newAddressErrors: typeof addressErrors = {};
      if (formData.shipping.address && isNumericOnly(formData.shipping.address)) {
        newAddressErrors.shippingAddress = isRTL ? "يجب أن يحتوي العنوان على أحرف، ولا يمكن أن يكون أرقامًا فقط" : "Address must contain letters, not only numbers";
      }
      if (formData.shipping.city && isNumericOnly(formData.shipping.city)) {
        newAddressErrors.shippingCity = isRTL ? "يجب أن تحتوي المدينة على أحرف، ولا يمكن أن تكون أرقامًا فقط" : "City must contain letters, not only numbers";
      }
      if (!formData.sameAsShipping) {
        if (formData.billing.address && isNumericOnly(formData.billing.address)) {
          newAddressErrors.billingAddress = isRTL ? "يجب أن يحتوي العنوان على أحرف، ولا يمكن أن يكون أرقامًا فقط" : "Address must contain letters, not only numbers";
        }
        if (formData.billing.city && isNumericOnly(formData.billing.city)) {
          newAddressErrors.billingCity = isRTL ? "يجب أن تحتوي المدينة على أحرف، ولا يمكن أن تكون أرقامًا فقط" : "City must contain letters, not only numbers";
        }
      }
      if (Object.keys(newAddressErrors).length > 0) {
        setAddressErrors(newAddressErrors);
        setIsSubmitting(false);
        return;
      }

      if (!isAuthenticated && isCheckingEmail) {
        setError(isRTL ? "يرجى الانتظار لحظة حتى نتحقق من البريد الإلكتروني." : "Please wait a moment while we verify your email address.");
        setIsSubmitting(false);
        return;
      }

      // Validate password if creating account
      let newCustomerId: number | undefined;
      
      if (createAccount && !isAuthenticated) {
        // Validate passwords
        if (!accountPassword || accountPassword.length < 6) {
          setPasswordError(isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
          setIsSubmitting(false);
          return;
        }
        
        if (accountPassword !== confirmPassword) {
          setPasswordError(isRTL ? "كلمات المرور غير متطابقة" : "Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        
        // Create account
        setIsCreatingAccount(true);
        try {
          const customerResponse = await fetch("/api/customer", {
            method: "POST",
            headers: getCheckoutApiHeaders(),
            body: JSON.stringify({
              email: formData.shipping.email,
              username: formData.shipping.email,
              password: accountPassword,
              first_name: formData.shipping.firstName,
              last_name: formData.shipping.lastName,
              billing: {
                first_name: formData.shipping.firstName,
                last_name: formData.shipping.lastName,
                address_1: formData.shipping.address,
                address_2: formData.shipping.address2,
                city: formData.shipping.city,
                state: formData.shipping.state,
                postcode: formData.shipping.postalCode,
                country: formData.shipping.country,
                email: formData.shipping.email,
                phone: formData.shipping.phone,
              },
              shipping: {
                first_name: formData.shipping.firstName,
                last_name: formData.shipping.lastName,
                address_1: formData.shipping.address,
                address_2: formData.shipping.address2,
                city: formData.shipping.city,
                state: formData.shipping.state,
                postcode: formData.shipping.postalCode,
                country: formData.shipping.country,
                phone: formData.shipping.phone,
              },
            }),
          });
          
          const customerData = await customerResponse.json();
          
          if (!customerData.success) {
            const errorMessage = sanitizeCheckoutMessage(
              customerData.error?.message || (isRTL ? "فشل إنشاء الحساب" : "Failed to create account")
            );
            setPasswordError(errorMessage);
            setIsSubmitting(false);
            setIsCreatingAccount(false);
            return;
          }
          
          newCustomerId = customerData.data?.id;
        } catch {
          setPasswordError(isRTL ? "حدث خطأ أثناء إنشاء الحساب" : "An error occurred while creating account");
          setIsSubmitting(false);
          setIsCreatingAccount(false);
          return;
        }
        setIsCreatingAccount(false);
      }

      // Create line items with price information to ensure bundle totals are correct
      // The subtotal/total from cart items include the full bundle price (box + bundled items)
      const lineItems = cartItems.map((item) => {
        const lineItem: {
          product_id: number;
          quantity: number;
          variation_id?: number;
          subtotal?: string;
          total?: string;
          meta_data?: Array<{ key: string; value: string }>;
        } = {
          product_id: item.id,
          quantity: item.quantity.value,
          variation_id: item.variation_id || undefined,
        };

        // Check if this is a bundle product and calculate correct total
        const bundleItems = getBundleItems(item);
        const isBundleProduct = bundleItems && bundleItems.length > 0;
        
        if (isBundleProduct) {
          // For bundle products, calculate the correct total based on pricing mode
          // CoCart only knows about the base WooCommerce product price, not the bundled items
          const bundleItemsTotal = getBundleItemsTotal(bundleItems);
          const boxPrice = getBoxPrice(item);
          const pricingMode = getPricingMode(item);
          const fixedPrice = getFixedPrice(item);
          const storedBundleTotal = getBundleTotal(item);
          
          // Calculate the correct bundle total per item based on pricing mode
          let correctBundleTotal: number;
          
          if (pricingMode === "fixed") {
            correctBundleTotal = fixedPrice || storedBundleTotal || boxPrice || 0;
          } else {
            const cartItemPriceAED = parseFloat(item.price) / divisor;
            correctBundleTotal = cartItemPriceAED > 0 ? cartItemPriceAED : bundleItemsTotal + (boxPrice || 0);
          }
          
          correctBundleTotal = convertPrice(correctBundleTotal);
          
          // Multiply by quantity for the line item total
          const quantity = item.quantity?.value || 1;
          const lineItemTotal = correctBundleTotal * quantity;
          
          lineItem.subtotal = lineItemTotal.toFixed(getCurrencyInfo().decimals);
          lineItem.total = lineItemTotal.toFixed(getCurrencyInfo().decimals);
          
          const metaData: Array<{ key: string; value: string }> = [];
          
          // Add structured bundle data for frontend order display (OrderBundleItemsList)
          // This allows the order details page to show the bundle breakdown
          metaData.push({
            key: "_bundle_items",
            value: JSON.stringify(bundleItems),
          });
          
          // Add box price as structured data for frontend
          if (boxPrice && boxPrice > 0) {
            metaData.push({
              key: "_box_price",
              value: boxPrice.toString(),
            });
          }
          
          // Add pricing mode for frontend order display
          metaData.push({
            key: "_pricing_mode",
            value: pricingMode,
          });
          
          // Add fixed price if applicable
          if (pricingMode === "fixed" && fixedPrice) {
            metaData.push({
              key: "_fixed_price",
              value: fixedPrice.toString(),
            });
          }
          
          // Add each bundle item as a separate meta entry for better display in WooCommerce admin
          bundleItems.forEach((bundleItem, index) => {
            const itemName = bundleItem.name || `Product #${bundleItem.product_id}`;
            const itemQty = bundleItem.quantity || 1;
            const itemPrice = typeof bundleItem.price === "string" 
              ? parseFloat(bundleItem.price) 
              : (bundleItem.price || 0);
            
                        // Format: "Product Name x1 - 145.00 USD"
                        const displayValue = itemPrice > 0 
                          ? `${itemName} x${itemQty} - ${itemPrice.toFixed(2)} ${currency}`
                          : `${itemName} x${itemQty}`;
            
            metaData.push({
              key: bundleItem.is_addon ? `Add-on ${index + 1}` : `Bundled Product ${index + 1}`,
              value: displayValue,
            });
          });
          
                    // Add human-readable totals for WooCommerce admin
                    if (bundleItemsTotal > 0) {
                      metaData.push({
                        key: "Items Total",
                        value: `${bundleItemsTotal.toFixed(2)} ${currency}`,
                      });
                    }
          
                    if (boxPrice && boxPrice > 0) {
                      metaData.push({
                        key: "Box Price",
                        value: `${boxPrice.toFixed(2)} ${currency}`,
                      });
                    }
          
          lineItem.meta_data = metaData;
        }

        if (!lineItem.subtotal) {
          const unitPrice = convertPrice(parseFloat(item.price) / divisor);
          const qty = item.quantity?.value || 1;
          const lineTotal = unitPrice * qty;
          lineItem.subtotal = lineTotal.toFixed(getCurrencyInfo().decimals);
          lineItem.total = lineTotal.toFixed(getCurrencyInfo().decimals);
        }

        return lineItem;
      });

      const billingData= formData.sameAsShipping ? formData.shipping : formData.billing;

      const couponLines = selectedCoupons.map(coupon => ({ code: coupon.code }));

      const shippingLines: Array<{ method_id: string; method_title: string; total: string }> = [];
      if (selectedShippingRate && shippingPackages.length > 0) {
        const allRates = shippingPackages.flatMap((pkg) => pkg.shipping_rates || []);
        const selectedRate = allRates.find((rate) => rate.rate_id === selectedShippingRate);
        if (selectedRate) {
          shippingLines.push({
            method_id: selectedRate.method_id,
            method_title: selectedRate.name,
            total: ((parseFloat(shippingTotal) || 0) / shippingDivisor).toFixed(getCurrencyInfo().decimals),
          });
        }
      }

      const billingEmail = billingData.email || formData.shipping.email || (isAuthenticated && user?.user_email ? user.user_email : "");
      const selectedPaymentGateway = filteredPaymentGateways.find((gateway) => gateway.id === formData.paymentMethod);

      const orderPayload = {
        payment_method: formData.paymentMethod,
        payment_method_title: selectedPaymentGateway?.title || formData.paymentMethod,
        currency: currency || marketCurrency,
        billing: {
          first_name: billingData.firstName,
          last_name: billingData.lastName,
          address_1: billingData.address,
          address_2: billingData.address2,
          city: billingData.city,
          state: billingData.state,
          postcode: billingData.postalCode,
          country: billingData.country,
          email: billingEmail,
          phone: billingData.phone || formData.shipping.phone,
        },
        shipping: {
          first_name: formData.shipping.firstName,
          last_name: formData.shipping.lastName,
          address_1: formData.shipping.address,
          address_2: formData.shipping.address2,
          city: formData.shipping.city,
          state: formData.shipping.state,
          postcode: formData.shipping.postalCode,
          country: formData.shipping.country,
          phone: formData.shipping.phone,
        },
        line_items: lineItems,
        shipping_lines: shippingLines,
        coupon_lines: couponLines,
        ...(() => {
          const feeLines: Array<{ name: string; total: string }> = [];
          // Add non-customs fees from cart.fees
          if (Array.isArray(cart?.fees) && cart.fees.length > 0) {
            cart.fees
              .filter(fee => fee?.name?.toLowerCase() !== "customs fees")
              .forEach(fee => {
                feeLines.push({
                  name: fee.name,
                  total: convertPrice(parseFloat(fee.fee) / divisor).toFixed(getCurrencyInfo().decimals),
                });
              });
          }
          cartDiscounts.forEach((discount) => {
            const discountAmount = convertPrice(discount.amount / divisor);
            if (discountAmount > 0) {
              feeLines.push({
                name: discount.label,
                total: (-discountAmount).toFixed(getCurrencyInfo().decimals),
              });
            }
          });
          // Add client-side customs fee, or server-side customs fees if no client-side
          if (customsFee) {
            feeLines.push({
              name: customsFee.name,
              total: convertPrice(parseFloat(customsFee.fee) / divisor).toFixed(getCurrencyInfo().decimals),
            });
          } else if (Array.isArray(cart?.fees) && cart.fees.length > 0) {
            cart.fees
              .filter(fee => fee?.name?.toLowerCase() === "customs fees")
              .forEach(fee => {
                feeLines.push({
                  name: fee.name,
                  total: convertPrice(parseFloat(fee.fee) / divisor).toFixed(getCurrencyInfo().decimals),
                });
              });
          }
          return feeLines.length > 0 ? { fee_lines: feeLines } : {};
        })(),
        customer_note: formData.orderNotes,
        ...(isAuthenticated && user?.user_id ? { customer_id: user.user_id } : newCustomerId ? { customer_id: newCustomerId } : {}),
        meta_data: [...getOrderMetaData(), ...(giftWrap ? [{ key: "_gift_wrap", value: "yes" }] : [])],
      };

      const response = await fetch(buildCheckoutApiUrl("/api/orders"), {
        method: "POST",
        headers: getCheckoutApiHeaders(),
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(sanitizeCheckoutMessage(data.error?.message || "Failed to create order"));
      }

      if (!paymentInfoTrackedRef.current) {
        trackAnalyticsEvent("add_payment_info", {
          currency: currency || marketCurrency,
          value: checkoutTotal,
          payment_type: selectedPaymentGateway?.title || formData.paymentMethod,
          items: checkoutAnalyticsItems,
        });
        paymentInfoTrackedRef.current = true;
      }

      if (isAuthenticated && user?.user_id) {
        (async () => {
          try {
            const addressExists = savedAddresses.some(
              (addr) =>
                addr.address_1 === formData.shipping.address &&
                addr.city === formData.shipping.city &&
                addr.country === formData.shipping.country
            );

            if (!addressExists) {
              const newAddress: SavedAddress = {
                id: generateAddressId(),
                label: savedAddresses.length === 0 ? "Home" : "Home",
                first_name: formData.shipping.firstName,
                last_name: formData.shipping.lastName,
                company: "",
                address_1: formData.shipping.address,
                address_2: formData.shipping.address2,
                city: formData.shipping.city,
                state: formData.shipping.state,
                postcode: formData.shipping.postalCode,
                country: formData.shipping.country,
                phone: formData.shipping.phone,
                email: formData.shipping.email || user.user_email || "",
                is_default: savedAddresses.length === 0,
              };
              const updatedAddresses = newAddress.is_default
                ? [newAddress, ...savedAddresses]
                : [...savedAddresses, newAddress];
              await saveSavedAddresses(user.user_id, updatedAddresses);
            }

            await fetch(buildCheckoutApiUrl("/api/customer", { customerId: String(user.user_id) }), {
              method: "PUT",
              headers: getCheckoutApiHeaders(),
              body: JSON.stringify({
                billing: orderPayload.billing,
                shipping: orderPayload.shipping,
              }),
            });
          } catch (err) {
            console.error("Failed to save address to profile:", err);
          }
        })();
      }

            // Check payment method type and handle accordingly
            const normalizedPaymentMethod = formData.paymentMethod.toLowerCase();
            const isTabbyPayment = normalizedPaymentMethod.startsWith("tabby");
            const isTamaraPayment = normalizedPaymentMethod.startsWith("tamara");
            const isWooPayments = isWooPaymentsMethod(normalizedPaymentMethod);
            const isExternalPayment = isTabbyPayment || isTamaraPayment || isWooPayments;

            // Clear customer tracking data after successful order creation
            clearTracking();

            // Only clear cart for non-external payment methods (like COD)
            // For external payments, cart will be cleared in order-confirmation after payment is verified
            // Note: We don't await clearCart() to avoid blocking the redirect if the cart API is slow
            // The order is already created successfully, so we should redirect immediately
            if (!isExternalPayment) {
              if (clearCart) {
                clearCart().catch((err) => console.error("Failed to clear cart:", err));
              }
              clearSelectedCoupons();
            }
      
            const billingInfo = formData.sameAsShipping ? formData.shipping : formData.billing;
            const baseUrl = window.location.origin;
            
            // Use the order total from WooCommerce as the source of truth for payment amount
            // This ensures the payment gateway receives the exact amount calculated by the backend
            // and avoids any potential mismatch between frontend and backend calculations
            const orderTotal = parseFloat(data.order?.total) || 0;
            const paymentCurrencyDecimals = getCurrencyInfo().decimals;
            
            // Calculate frontend amount for comparison/logging purposes
            const frontendPaymentAmount = checkoutTotal;
            
            // Use the WooCommerce order total as the payment amount at the active currency precision
            const paymentAmount = Number(orderTotal.toFixed(paymentCurrencyDecimals));
            
            // Log if there's a significant difference between frontend and backend calculations
            // This helps identify potential pricing discrepancies for debugging
            const amountDifference = Math.abs(paymentAmount - frontendPaymentAmount);
            if (amountDifference > 0.01) {
              console.warn("Payment amount mismatch detected:", {
                frontendAmount: frontendPaymentAmount,
                backendAmount: paymentAmount,
                difference: amountDifference,
                orderId: data.order_id,
              });
            }
      
            if (isTabbyPayment) {
              // Initiate Tabby payment directly
              const tabbyResponse = await fetch(buildCheckoutApiUrl("/api/tabby/create-session"), {
                method: "POST",
                headers: getCheckoutApiHeaders(),
                body: JSON.stringify({
                  order_id: data.order_id,
                  order_key: data.order_key,
                  amount: paymentAmount,
                  currency: data.order?.currency || currency || marketCurrency,
                  description: `Order #${data.order_id}`,
                  buyer: {
                    name: `${billingInfo.firstName} ${billingInfo.lastName}`,
                    email: billingInfo.email || formData.shipping.email,
                    phone: billingInfo.phone || formData.shipping.phone,
                  },
                  shipping_address: {
                    city: formData.shipping.city,
                    address: formData.shipping.address,
                    zip: formData.shipping.postalCode,
                  },
                  order_items: cartItems.map((item) => ({
                    title: item.name,
                    quantity: item.quantity.value,
                    unit_price: parseFloat(item.totals.subtotal) / item.quantity.value / divisor,
                    category: "General",
                  })),
                  language: locale === "ar" ? "ar" : "en",
                  success_url: `${baseUrl}/${locale}/order-confirmation`,
                  cancel_url: `${baseUrl}/${locale}/order-confirmation`,
                  failure_url: `${baseUrl}/${locale}/order-confirmation`,
                }),
              });

              const tabbyData = await tabbyResponse.json();

              if (tabbyData.success && tabbyData.payment_url) {
                window.location.href = tabbyData.payment_url;
              } else {
                throw new Error(tabbyData.error?.message || "Failed to initiate Tabby payment");
              }
            } else if (isTamaraPayment) {
              // Initiate Tamara payment directly
              const tamaraResponse = await fetch(buildCheckoutApiUrl("/api/tamara/create-checkout"), {
                method: "POST",
                headers: getCheckoutApiHeaders(),
                body: JSON.stringify({
                  order_id: data.order_id,
                  order_key: data.order_key,
                  total_amount: paymentAmount,
                  currency: data.order?.currency || currency || marketCurrency,
                  country_code: formData.shipping.country || "AE",
                  locale: locale === "ar" ? "ar_SA" : "en_US",
                  consumer: {
                    first_name: billingInfo.firstName,
                    last_name: billingInfo.lastName,
                    email: billingInfo.email || formData.shipping.email,
                    phone_number: billingInfo.phone || formData.shipping.phone,
                  },
                  billing_address: {
                    first_name: billingInfo.firstName,
                    last_name: billingInfo.lastName,
                    line1: billingInfo.address,
                    city: billingInfo.city,
                    country_code: billingInfo.country || "AE",
                    phone_number: billingInfo.phone,
                  },
                  shipping_address: {
                    first_name: formData.shipping.firstName,
                    last_name: formData.shipping.lastName,
                    line1: formData.shipping.address,
                    city: formData.shipping.city,
                    country_code: formData.shipping.country || "AE",
                    phone_number: formData.shipping.phone,
                  },
                  items: cartItems.map((item) => ({
                    name: item.name,
                    quantity: item.quantity.value,
                    unit_price: parseFloat(item.totals.subtotal) / item.quantity.value / divisor,
                    sku: item.id?.toString() || "",
                  })),
                  success_url: `${baseUrl}/${locale}/order-confirmation`,
                  failure_url: `${baseUrl}/${locale}/order-confirmation`,
                  cancel_url: `${baseUrl}/${locale}/order-confirmation`,
                }),
              });

              const tamaraData = await tamaraResponse.json();

              if (tamaraData.success && tamaraData.checkout_url) {
                window.location.href = tamaraData.checkout_url;
              } else {
                throw new Error(tamaraData.error?.message || "Failed to initiate Tamara payment");
              }
              } else if (isWooPayments) {
              const stripeResponse = await fetch(buildCheckoutApiUrl("/api/stripe/create-checkout-session"), {
                method: "POST",
                headers: getCheckoutApiHeaders(),
                body: JSON.stringify({
                  order_id: data.order_id,
                  order_key: data.order_key,
                  locale,
                  market_prefix: marketPrefix,
                  order_total: data.order?.total,
                  order_currency: data.order?.currency,
                  customer_email: billingInfo.email || formData.shipping.email || data.order?.billing?.email,
                }),
              });

              const stripeData = await stripeResponse.json();

              if (stripeData.success && stripeData.checkout_url) {
                window.location.href = stripeData.checkout_url;
                return;
              }

              throw new Error(stripeData.error?.message || "Failed to initiate Stripe payment");
            } else {
              router.push(`${marketPrefix}/${locale}/order-confirmation?order_id=${data.order_id}&order_key=${data.order_key}`);
            }
    } catch (err) {
      setError(sanitizeCheckoutMessage(err instanceof Error ? err.message : "An error occurred while placing your order"));
      setIsSubmitting(false);
    }
  };

  return (
                <div className="min-h-screen bg-transparent pb-44 md:pb-8">
                  <div className="container mx-auto px-4 py-3 md:py-8">

        {/* Modern User Status Card */}
        <div className="luxury-panel mb-3 flex items-center justify-between p-3 md:mb-6 md:p-4">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white md:h-10 md:w-10 md:text-sm ${isAuthenticated ? 'bg-emerald-600' : 'bg-brand-primary'}`}>
              {isAuthenticated ? (user?.user_email?.charAt(0).toUpperCase() || 'U') : 'G'}
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-primary md:text-sm">
                {isAuthenticated ? user?.user_email : (isRTL ? "ضيف" : "Guest")}
              </p>
              <p className="text-[11px] text-brand-muted md:text-xs">
                {isAuthenticated 
                  ? (isRTL ? "حساب مسجل" : "Registered account")
                  : (isRTL ? "الدفع كضيف" : "Checkout as guest")}
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-emerald-700">{isRTL ? "متصل" : "Connected"}</span>
            </div>
          )}
        </div>

        <Breadcrumbs items={breadcrumbItems} locale={locale as Locale} contained={false} />

        <div className="mb-4 border-b border-brand-border/70 pb-4 md:mb-6 md:pb-6">
          <h1 className="font-title text-2xl leading-none text-brand-primary md:text-4xl">
            {checkoutTitle}
          </h1>
          {checkoutSubtitle && (
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted md:mt-3 md:text-base">
              {checkoutSubtitle}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Payment Error from Gateway Redirect */}
        {isVerifyingPayment && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
              <span className="text-blue-700">
                {isRTL ? "جاري التحقق من حالة الدفع..." : "Verifying payment status..."}
              </span>
            </div>
          </div>
        )}

        {paymentError && !isVerifyingPayment && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">
                  {isRTL ? "فشل الدفع" : "Payment Failed"}
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {paymentError}
                </p>
                <p className="mt-2 text-sm text-red-600">
                  {isRTL ? "يرجى التحقق من تفاصيل الدفع والمحاولة مرة أخرى." : "Please check your payment details and try again."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

              {/* Cart still initializing (grace period for SWR + localStorage hydration) */}
              {!cartInitReady && (isCartLoading || cartItems.length === 0) && (
                <div className="mb-6 flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-border border-t-brand-primary"></div>
                  <span className="ml-3 text-brand-muted">{isRTL ? "جاري تحميل سلة التسوق..." : "Loading your cart..."}</span>
                </div>
              )}

              {isLoadingCustomer && (
                <div className="mb-6 flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary"></div>
                  <span className="ml-2 text-brand-muted">{isRTL ? "جاري تحميل بياناتك..." : "Loading your data..."}</span>
                </div>
              )}

              {/* Empty Cart Message with Auto-Redirect */}
              {isEmptyCart && emptyCartCountdown !== null && (
                <div className="mb-6 rounded-lg border border-brand-primary bg-brand-beige p-6 text-center">
                  <div className="mb-4">
                    <svg className="mx-auto h-16 w-16 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h2 className="mb-2 font-title text-xl text-brand-primary md:text-2xl">
                    {isRTL ? "سلة التسوق فارغة" : "Your cart is empty"}
                  </h2>
                  <p className="mb-4 text-brand-muted">
                    {isRTL 
                      ? "لا يمكنك المتابعة للدفع بدون منتجات في السلة." 
                      : "You cannot proceed to checkout without any products in your cart."}
                  </p>
                  <p className="text-sm text-brand-primary">
                    {isRTL 
                      ? `سيتم توجيهك إلى الصفحة الرئيسية خلال ${emptyCartCountdown} ثانية...` 
                      : `Redirecting to home page in ${emptyCartCountdown} seconds...`}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`${marketPrefix}/${locale}`)}
                    className="mt-4 inline-flex items-center rounded-full bg-brand-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
                  >
                    {isRTL ? "العودة للرئيسية الآن" : "Go to Home Now"}
                  </button>
                </div>
              )}

            {!isEmptyCart && (
            <form id="checkout-form" onSubmit={handleSubmit}>
        <div className="grid gap-3 lg:grid-cols-3 lg:items-start lg:gap-3">
          <div className="space-y-3 lg:col-span-2">
            {/* Contact Information */}
            <div className="luxury-panel p-4 md:p-6">
                            <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-5 md:text-2xl">
                              {isRTL ? "معلومات الاتصال" : "Contact Information"}
                            </h2>
              <div className={`grid gap-3 md:gap-4 ${isAuthenticated ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
                {!isAuthenticated && (
                <div className="relative">
                  <Input
                    label={isRTL ? "البريد الإلكتروني" : "Email"}
                    type="email"
                    required
                    value={formData.shipping.email}
                    onChange={(e) => handleShippingChange("email", e.target.value)}
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-9 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                  )}
                </div>
                )}
                <PhoneInput
                  label={isRTL ? "رقم الهاتف" : "Phone"}
                  required
                  value={formData.shipping.phone}
                  onChange={(phone) => handleShippingChange("phone", phone)}
                  countryCode={formData.shipping.country}
                  isRTL={isRTL}
                />
              </div>
              
              {/* Login Suggestion for Registered Email (non-blocking — guest checkout still allowed) */}
              {showLoginPrompt && !isAuthenticated && (
                <div className="mt-4 rounded-lg border border-brand-border/70 bg-brand-beige/55 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-brand-muted">
                        {isRTL 
                          ? "يبدو أن لديك حسابًا بهذا البريد الإلكتروني. يمكنك تسجيل الدخول لتتبع طلباتك، أو المتابعة كضيف."
                          : "It looks like you have an account with this email. You can log in to track your orders, or continue as a guest."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`${marketPrefix}/${locale}/login?redirect=${encodeURIComponent(`${marketPrefix}/${locale}/checkout`)}`)}
                        >
                          {isRTL ? "تسجيل الدخول" : "Log In"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Create Account Option - Only for guest users with unregistered email */}
              {!isAuthenticated && !isEmailRegistered && (
                <div className="mt-4 rounded-lg border border-brand-border/70 bg-brand-beige/55 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="create-account"
                      checked={createAccount}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCreateAccount(checked);
                        if (!checked) {
                          setAccountPassword("");
                          setConfirmPassword("");
                          setPasswordError(null);
                        }
                      }}
                    />
                    <div className="flex-1">
                      <label htmlFor="create-account" className="cursor-pointer text-sm font-semibold text-brand-primary">
                        {isRTL ? "إنشاء حساب لتتبع طلباتك" : "Create an account to track your orders"}
                      </label>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {isRTL ? "يمكنك تتبع طلباتك وحفظ عناوينك" : "Track your orders and save your addresses"}
                      </p>
                    </div>
                  </div>
                  
                  {createAccount && (
                    <div className="mt-4 space-y-3 border-t border-brand-border/70 pt-4">
                      {passwordError && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                          {passwordError}
                        </div>
                      )}
                      {isCreatingAccount && (
                        <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-600">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
                          {isRTL ? "جاري إنشاء الحساب..." : "Creating account..."}
                        </div>
                      )}
                      <Input
                        label={isRTL ? "كلمة المرور" : "Password"}
                        type="password"
                        required={createAccount}
                        value={accountPassword}
                        onChange={(e) => {
                          setAccountPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder={isRTL ? "أدخل كلمة المرور" : "Enter password"}
                        disabled={isCreatingAccount}
                      />
                      <Input
                        label={isRTL ? "تأكيد كلمة المرور" : "Confirm Password"}
                        type="password"
                        required={createAccount}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        placeholder={isRTL ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                        disabled={isCreatingAccount}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="luxury-panel p-4 md:p-6">
                            <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-5 md:text-2xl">
                              {isRTL ? "عنوان الشحن" : "Delivery"}
                            </h2>

              {/* Show saved addresses selector for authenticated users */}
              {isAuthenticated && savedAddresses.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full rounded-lg border border-brand-border/70 bg-brand-beige/55 p-4 text-left transition-colors hover:border-brand-primary/35 hover:bg-brand-beige"
                      onClick={() => setShowAddressSelector(!showAddressSelector)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 text-brand-muted" />
                          <div>
                            <p className="font-semibold text-brand-primary">
                              {selectedAddressId 
                                ? savedAddresses.find(a => a.id === selectedAddressId)?.label || (isRTL ? "العنوان المحدد" : "Selected Address")
                                : (isRTL ? "اختر عنوان محفوظ" : "Select a saved address")}
                            </p>
                            {selectedAddressId && (
                              <p className="mt-1 text-sm text-brand-muted">
                                {(() => {
                                  const addr = savedAddresses.find(a => a.id === selectedAddressId);
                                  if (!addr) return "";
                                  return `${addr.first_name} ${addr.last_name}${addr.address_1 ? `, ${addr.address_1}` : ""}${addr.city ? `, ${addr.city}` : ""}`;
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        {showAddressSelector ? (
                          <ChevronUp className="h-5 w-5 text-brand-muted" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-brand-muted" />
                        )}
                      </div>
                    </button>
                    
                    {showAddressSelector && (
                      <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-brand-border/70 bg-brand-ivory shadow-lg">
                        {savedAddresses.map((address) => (
                          <button
                            key={address.id}
                            type="button"
                            className={`w-full border-b border-brand-border/70 p-4 text-left transition-colors last:border-b-0 hover:bg-brand-beige/55 ${
                              selectedAddressId === address.id ? "bg-brand-beige/55" : ""
                            }`}
                            onClick={() => handleSelectSavedAddress(address)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-brand-primary">{address.label}</p>
                                  {address.is_default && (
                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                      {isRTL ? "افتراضي" : "Default"}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-brand-muted">
                                  {address.first_name} {address.last_name}
                                </p>
                                <p className="text-sm text-brand-muted">
                                  {address.address_1}
                                  {address.city && `, ${address.city}`}
                                  {address.country && `, ${address.country}`}
                                </p>
                              </div>
                              {selectedAddressId === address.id && (
                                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                <Input
                  label={isRTL ? "الاسم الأول" : "First Name"}
                  required
                  value={formData.shipping.firstName}
                  onChange={(e) => handleShippingChange("firstName", e.target.value)}
                />
                <Input
                  label={isRTL ? "اسم العائلة" : "Last Name"}
                  required
                  value={formData.shipping.lastName}
                  onChange={(e) => handleShippingChange("lastName", e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label={isRTL ? "العنوان" : "Address"}
                    required
                    value={formData.shipping.address}
                    onChange={(e) => handleShippingChange("address", e.target.value)}
                    error={addressErrors.shippingAddress}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label={isRTL ? "العنوان (سطر 2)" : "Address Line 2"}
                    value={formData.shipping.address2}
                    onChange={(e) => handleShippingChange("address2", e.target.value)}
                    placeholder={isRTL ? "شقة، جناح، وحدة، إلخ. (اختياري)" : "Apartment, suite, unit, etc. (optional)"}
                  />
                </div>
                <Input
                  label={isRTL ? "المدينة" : "City"}
                  required
                  value={formData.shipping.city}
                  onChange={(e) => handleShippingChange("city", e.target.value)}
                  error={addressErrors.shippingCity}
                />
                <Input
                  label={isRTL ? "المنطقة" : "State/Province"}
                  value={formData.shipping.state}
                  onChange={(e) => handleShippingChange("state", e.target.value)}
                />
                <Input
                  label={isRTL ? "الرمز البريدي" : "Postal Code"}
                  value={formData.shipping.postalCode}
                  onChange={(e) => handleShippingChange("postalCode", e.target.value)}
                />
                <CountrySelect
                  label={isRTL ? "الدولة" : "Country"}
                  required
                  value={formData.shipping.country}
                  onChange={(value) => handleShippingChange("country", value)}
                  isRTL={isRTL}
                  availableCountries={shippingCountries}
                />
              </div>
            </div>

            {/* Shipping Method Selection */}
            <div className="luxury-panel p-4 md:p-6">
              <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-5 md:text-2xl">
                {isRTL ? "طريقة الشحن" : "Shipping Method"}
              </h2>
              
              {isLoadingShipping ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary"></div>
                  <span className="ml-2 text-brand-muted">{isRTL ? "جاري تحميل طرق الشحن..." : "Loading shipping methods..."}</span>
                </div>
              ) : shippingPackages.length === 0 || shippingPackages.every(pkg => !pkg.shipping_rates || pkg.shipping_rates.length === 0) ? (
                <div className="rounded-lg border border-brand-primary bg-brand-beige p-4">
                  <p className="text-sm text-brand-primary">
                    {isRTL 
                      ? "يرجى إدخال عنوان الشحن لعرض طرق الشحن المتاحة" 
                      : "Please enter your shipping address to see available shipping methods"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shippingPackages.map((pkg) => (
                    <div key={pkg.package_id}>
                      {pkg.shipping_rates && pkg.shipping_rates.map((rate) => {
                        const ratePrice = parseFloat(rate.price) / Math.pow(10, rate.currency_minor_unit || 2);
                        const isSelected = selectedShippingRate === rate.rate_id;
                        
                        return (
                          <div
                            key={rate.rate_id}
                            className={`rounded-lg border p-3 transition-colors md:p-4 ${
                              rate.method_id === "free_shipping" && rate.free_shipping_eligible === false
                                ? "border-brand-border/60 bg-brand-beige/35 opacity-60"
                                : isSelected
                                  ? "border-brand-primary bg-brand-beige cursor-pointer"
                                  : "border-brand-border/70 hover:bg-brand-beige cursor-pointer"
                            }`}
                            onClick={() => {
                              if (rate.method_id === "free_shipping" && rate.free_shipping_eligible === false) return;
                              handleSelectShippingRate(rate.rate_id, pkg.package_id);
                            }}
                          >
                              <div className="flex items-center gap-2.5 md:gap-3">
                               <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory md:h-10 md:w-10">
                                <Truck className="h-4 w-4 text-brand-muted md:h-5 md:w-5" />
                              </div>
                              <div className="flex-1">
                                <Radio
                                  name="shipping_method"
                                  value={rate.rate_id}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (rate.method_id === "free_shipping" && rate.free_shipping_eligible === false) return;
                                    handleSelectShippingRate(rate.rate_id, pkg.package_id);
                                  }}
                                  label={rate.name}
                                  description={rate.delivery_time || rate.description || ""}
                                  disabled={rate.method_id === "free_shipping" && rate.free_shipping_eligible === false}
                                />
                                {rate.method_id === "free_shipping" && rate.free_shipping_min_amount && rate.free_shipping_min_amount > 0 && (
                                  <p className={`mt-1 text-xs ${
                                    rate.free_shipping_eligible === false ? "text-brand-gold" : "text-green-600"
                                  }`}>
                                    {rate.free_shipping_eligible === false
                                      ? (isRTL
                                          ? `الحد الأدنى للشراء ${rate.free_shipping_min_amount} ${rate.currency_code}`
                                          : `Minimum purchase of ${rate.free_shipping_min_amount} ${rate.currency_code} required`)
                                      : (isRTL
                                          ? `الحد الأدنى للشراء ${rate.free_shipping_min_amount} ${rate.currency_code} - تم الاستيفاء!`
                                          : `Minimum purchase of ${rate.free_shipping_min_amount} ${rate.currency_code} met!`)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {ratePrice === 0 ? (
                                  <span className={`font-semibold ${
                                    rate.method_id === "free_shipping" && rate.free_shipping_eligible === false
                                      ? "text-brand-muted"
                                      : "text-green-600"
                                  }`}>
                                    {isRTL ? "مجاني" : "Free"}
                                  </span>
                                ) : (
                                  <FormattedPrice
                                    price={ratePrice}
                                    className="font-semibold"
                                    iconSize="xs"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Address */}
            <div className="luxury-panel p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-title text-xl text-brand-primary md:text-2xl">
                                  {isRTL ? "عنوان الفاتورة" : "Billing Address"}
                                </h2>
                <button
                  type="button"
                  onClick={() => setShowBillingSection(!showBillingSection)}
                  className="flex items-center gap-1 text-sm text-brand-muted hover:text-brand-primary"
                >
                  {showBillingSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Same as shipping checkbox */}
              <div className="rounded-lg border border-brand-border/70 p-3 transition-colors hover:bg-brand-beige/55 md:p-4">
                <Checkbox
                  checked={formData.sameAsShipping}
                  onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                  label={isRTL ? "نفس عنوان الشحن" : "Same as shipping address"}
                />
              </div>

              {/* Billing address form - only show if not same as shipping */}
              {(!formData.sameAsShipping || showBillingSection) && !formData.sameAsShipping && (
                <div className="mt-4 grid gap-3 md:gap-4 sm:grid-cols-2">
                  <Input
                    label={isRTL ? "الاسم الأول" : "First Name"}
                    required
                    value={formData.billing.firstName}
                    onChange={(e) => handleBillingChange("firstName", e.target.value)}
                  />
                  <Input
                    label={isRTL ? "اسم العائلة" : "Last Name"}
                    required
                    value={formData.billing.lastName}
                    onChange={(e) => handleBillingChange("lastName", e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label={isRTL ? "العنوان" : "Address"}
                      required
                      value={formData.billing.address}
                      onChange={(e) => handleBillingChange("address", e.target.value)}
                      error={addressErrors.billingAddress}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label={isRTL ? "العنوان (سطر 2)" : "Address Line 2"}
                      value={formData.billing.address2}
                      onChange={(e) => handleBillingChange("address2", e.target.value)}
                      placeholder={isRTL ? "شقة، جناح، وحدة، إلخ. (اختياري)" : "Apartment, suite, unit, etc. (optional)"}
                    />
                  </div>
                  <Input
                    label={isRTL ? "المدينة" : "City"}
                    required
                    value={formData.billing.city}
                    onChange={(e) => handleBillingChange("city", e.target.value)}
                    error={addressErrors.billingCity}
                  />
                  <Input
                    label={isRTL ? "المنطقة" : "State/Province"}
                    value={formData.billing.state}
                    onChange={(e) => handleBillingChange("state", e.target.value)}
                  />
                  <Input
                    label={isRTL ? "الرمز البريدي" : "Postal Code"}
                    value={formData.billing.postalCode}
                    onChange={(e) => handleBillingChange("postalCode", e.target.value)}
                  />
                  <CountrySelect
                    label={isRTL ? "الدولة" : "Country"}
                    required
                    value={formData.billing.country}
                    onChange={(value) => handleBillingChange("country", value)}
                    isRTL={isRTL}
                  />
                  <PhoneInput
                    label={isRTL ? "رقم الهاتف" : "Phone"}
                    value={formData.billing.phone}
                    onChange={(phone) => handleBillingChange("phone", phone)}
                    countryCode={formData.billing.country}
                    isRTL={isRTL}
                  />
                  <Input
                    label={isRTL ? "البريد الإلكتروني" : "Email"}
                    type="email"
                    value={formData.billing.email}
                    onChange={(e) => handleBillingChange("email", e.target.value)}
                  />
                </div>
              )}
            </div>

                        {/* Payment Method */}
                        <div className="luxury-panel p-4 md:p-6">
                                        <div className="mb-3 flex items-center justify-between md:mb-5">
                                          <h2 className="font-title text-xl text-brand-primary md:text-2xl">
                                            {isRTL ? "طريقة الدفع" : "Payment Method"}
                                          </h2>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src="/images/payment-cards.png" alt="Visa & Mastercard" width={80} height={26} className="h-[22px] w-auto" />
                                        </div>
                          
                          <div className="space-y-3">
                            {isLoadingGateways ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-border border-t-brand-primary"></div>
                                <span className="ml-2 text-brand-muted">{isRTL ? "جاري تحميل طرق الدفع..." : "Loading payment methods..."}</span>
                              </div>
                            ) : filteredPaymentGateways.length === 0 ? (
                              <div className="py-4 text-center text-brand-muted">
                                {isRTL ? "لا توجد طرق دفع متاحة" : "No payment methods available"}
                              </div>
                            ) : (
                              filteredPaymentGateways.map((gateway) => {
                                                                const getGatewayLabel = (id: string, title: string) => {
                                                                  const labels: Record<string, { en: string; ar: string }> = {
                                                                    tabby_installments: { en: "Pay with Tabby", ar: "الدفع مع تابي" },
                                                                    tabby_checkout: { en: "Pay with Tabby", ar: "الدفع مع تابي" },
                                                                    tabby: { en: "Pay with Tabby", ar: "الدفع مع تابي" },
                                                                    tamara: { en: "Tamara - Buy Now Pay Later", ar: "تمارا - اشترِ الآن وادفع لاحقاً" },
                                                                    "tamara-gateway": { en: "Tamara - Buy Now Pay Later", ar: "تمارا - اشترِ الآن وادفع لاحقاً" },
                                                                    cod: { en: "Cash on Delivery", ar: "الدفع عند الاستلام" },
                                                                    bacs: { en: "Bank Transfer", ar: "تحويل بنكي" },
                                                                    cheque: { en: "Check Payment", ar: "الدفع بشيك" },
                                                                    paypal: { en: "PayPal", ar: "باي بال" },
                                                                    woocommerce_payments: { en: "Credit Card", ar: "بطاقة ائتمان" },
                                                                    stripe: { en: "Credit Card", ar: "بطاقة ائتمان" },
                                                                    card: { en: "Credit Card", ar: "بطاقة ائتمان" },
                                                                  };
                                                                  return labels[id]?.[isRTL ? "ar" : "en"] || title;
                                                                };

                                                                const getGatewayDescription = (id: string, description: string) => {
                                                                  const descriptions: Record<string, { en: string; ar: string }> = {
                                                                    tabby_installments: { en: "Split your payment into 4 interest-free installments", ar: "قسّم دفعتك إلى 4 أقساط بدون فوائد" },
                                                                    tabby_checkout: { en: "Split your payment into 4 interest-free installments", ar: "قسّم دفعتك إلى 4 أقساط بدون فوائد" },
                                                                    tabby: { en: "Split your payment into 4 interest-free installments", ar: "قسّم دفعتك إلى 4 أقساط بدون فوائد" },
                                                                    tamara: { en: "Pay in easy installments with Tamara", ar: "ادفع بأقساط سهلة مع تمارا" },
                                                                    "tamara-gateway": { en: "Pay in easy installments with Tamara", ar: "ادفع بأقساط سهلة مع تمارا" },
                                                                    cod: { en: "Pay with cash when your order is delivered", ar: "ادفع نقداً عند استلام طلبك" },
                                                                    bacs: { en: "Make payment directly to our bank account", ar: "قم بالدفع مباشرة إلى حسابنا البنكي" },
                                                                    cheque: { en: "Pay with a check", ar: "الدفع بشيك" },
                                                                    paypal: { en: "Pay securely with PayPal", ar: "ادفع بأمان مع باي بال" },
                                                                    woocommerce_payments: { en: "Pay securely with your card", ar: "ادفع بأمان ببطاقتك" },
                                                                    stripe: { en: "Pay securely with your card", ar: "ادفع بأمان ببطاقتك" },
                                                                    card: { en: "Pay securely with your card", ar: "ادفع بأمان ببطاقتك" },
                                                                  };
                                                                  return descriptions[id]?.[isRTL ? "ar" : "en"] || description || "";
                                                                };

                                                                const getGatewayIcon = (id: string) => {
                                                                  if (id === "tabby" || id === "tabby_installments" || id === "tabby_checkout") {
                                                                    return (
                                                                      <Image
                                                                        src="/images/payment/tabby.png"
                                                                        alt="Tabby"
                                                                        width={60}
                                                                        height={32}
                                                                        className="h-8 w-auto object-contain"
                                                                      />
                                                                    );
                                                                  }
                                                                  if (id === "tamara" || id === "tamara-gateway" || id.startsWith("tamara")) {
                                                                    return (
                                                                      <Image
                                                                        src="/images/payment/tamara.png"
                                                                        alt="Tamara"
                                                                        width={60}
                                                                        height={32}
                                                                        className="h-8 w-auto object-contain"
                                                                      />
                                                                    );
                                                                  }
                                                                  if (id === "woocommerce_payments" || id === "stripe" || id === "card") {
                                                                    return (
                                                                      <Image
                                                                        src="/images/payment/credit-debit-card.png"
                                                                        alt="Card"
                                                                        width={80}
                                                                        height={32}
                                                                        className="h-8 w-auto object-contain"
                                                                      />
                                                                    );
                                                                  }
                                  if (id === "cod") {
                                    return (
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                                        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                      </div>
                                    );
                                  }
                                  if (id === "paypal") {
                                    return (
                                      <div className="flex h-8 w-12 items-center justify-center rounded bg-[#003087] px-1">
                                        <span className="text-xs font-bold text-white">PayPal</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-beige">
                                      <svg className="h-5 w-5 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                      </svg>
                                    </div>
                                  );
                                };

                                return (
                                  <div
                                    key={gateway.id}
                                    className={`cursor-pointer rounded-lg border p-3 transition-colors md:p-4 ${
                                      formData.paymentMethod === gateway.id
                                        ? "border-brand-primary bg-brand-beige"
                                        : "border-brand-border/70 hover:border-brand-primary/45 hover:bg-brand-beige/55"
                                    }`}
                                    onClick={() => handlePaymentChange(gateway.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      {getGatewayIcon(gateway.id)}
                                      <div className="flex-1">
                                        <Radio
                                          name="payment"
                                          value={gateway.id}
                                          checked={formData.paymentMethod === gateway.id}
                                          onChange={(e) => handlePaymentChange(e.target.value)}
                                          label={getGatewayLabel(gateway.id, gateway.title)}
                                          description={getGatewayDescription(gateway.id, gateway.description)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

            <GiftWrapOption locale={locale as Locale} onChange={setGiftWrap} />

            {/* Order Notes */}
            <div className="luxury-panel p-4 md:p-6">
                            <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-5 md:text-2xl">
                              {isRTL ? "ملاحظات الطلب" : "Order Notes"}
                            </h2>
              <textarea
                className="w-full rounded-lg border border-brand-border/80 bg-brand-beige/50 p-3 text-sm text-brand-primary transition-colors hover:border-brand-primary/45 focus:border-brand-primary/55 focus:outline-none focus:ring-2 focus:ring-brand-gold/15"
                rows={4}
                placeholder={
                  isRTL
                    ? "ملاحظات إضافية حول طلبك (اختياري)"
                    : "Additional notes about your order (optional)"
                }
                value={formData.orderNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <div className="luxury-panel p-4 md:p-6">
                            <h2 className="mb-3 font-title text-xl text-brand-primary md:mb-5 md:text-2xl">
                              {isRTL ? "ملخص الطلب" : "Order Summary"}
                            </h2>

                            {/* Cart Items with Thumbnails */}
                            <div className="space-y-3 border-b border-brand-border/70 pb-3 md:max-h-80 md:space-y-4 md:overflow-y-auto md:pb-4">
                                {cartItems.map((item) => (
                                  <div key={item.item_key} className="flex items-center gap-2.5 md:gap-3">
                                    {/* Product Thumbnail */}
                                    <div className="relative h-14 w-14 flex-shrink-0 md:h-16 md:w-16">
                                      <div className="h-full w-full overflow-hidden rounded-md border border-brand-border/70 bg-brand-beige">
                                      {item.featured_image ? (
                                        <Image
                                          src={item.featured_image}
                                          alt={item.name}
                                          fill
                                          className="object-cover"
                                          sizes="(max-width: 767px) 56px, 64px"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-brand-muted">
                                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                      )}
                                      </div>
                                    </div>
                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-xs font-semibold text-brand-primary md:text-sm">{decodeHtmlEntities(item.name)}</p>
                                    {(productBrands[getItemLookupId(item)] || productCategories[getItemLookupId(item)]) && (
                                      <p className="font-medium uppercase tracking-wider text-brand-gold mt-0.5" style={{ fontSize: '9px' }}>
                                        {productBrands[getItemLookupId(item)] && <span>{decodeHtmlEntities(productBrands[getItemLookupId(item)])}</span>}
                                        {productBrands[getItemLookupId(item)] && productCategories[getItemLookupId(item)] && <span className="mx-1 text-brand-muted/45">/</span>}
                                        {productCategories[getItemLookupId(item)] && <span className="text-brand-muted">{decodeHtmlEntities(productCategories[getItemLookupId(item)])}</span>}
                                      </p>
                                    )}
                                    {item.meta?.sku && (
                                      <p className="mt-0.5 text-[10px] uppercase text-brand-muted">
                                        SKU: {item.meta.sku}
                                      </p>
                                    )}
                                    {item.meta?.variation && Object.keys(item.meta.variation).length > 0 && (
                                      <p className="mt-0.5 text-[11px] leading-snug text-brand-muted md:text-xs">
                                        {Object.entries(item.meta.variation)
                                          .filter(([key]) => key.toLowerCase() !== "parent_id")
                                          .map(([key, value]) => `${key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${value}`)
                                          .join(", ")}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-brand-muted md:text-xs">
                                      {isRTL ? "الكمية:" : "Qty:"} {item.quantity.value}
                                    </p>
                                    <BundleItemsList item={item} locale={locale} compact />
                                  </div>
                                  {/* Price */}
                                  {item.regular_price && item.sale_price && parseFloat(item.sale_price) < parseFloat(item.regular_price) ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <FormattedPrice
                                        price={parseFloat(item.regular_price) * item.quantity.value / divisor}
                                    className="text-xs text-brand-muted line-through"
                                        iconSize="xs"
                                      />
                                      <FormattedPrice
                                        price={parseFloat(item.sale_price) * item.quantity.value / divisor}
                                        className="text-xs font-medium text-red-600 md:text-sm"
                                        iconSize="xs"
                                      />
                                    </div>
                                  ) : (
                                    <FormattedPrice
                                      price={parseFloat(item.price) * item.quantity.value / divisor}
                                      className="text-xs font-medium md:text-sm"
                                      iconSize="xs"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Coupon Code Section - Read-only display only */}
                            {featureFlags.enableCoupons && (
                            <div className="border-b border-brand-border/70 py-4">
                              {selectedCoupons.length === 0 && (
                                <p className="mb-3 text-sm text-brand-muted">
                                  {isRTL ? "لا توجد كوبونات مطبقة. العودة إلى السلة لإضافة كود خصم." : "No coupons applied. Go back to cart to add a coupon code."}
                                </p>
                              )}

                              {/* Applied Coupons */}
                              {selectedCoupons.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {selectedCoupons.map((coupon) => (
                                    <div
                                      key={coupon.code}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Tag className="h-4 w-4 text-green-600 flex-shrink-0" />
                                        <span className="text-sm font-medium text-green-700 truncate">
                                          {coupon.code}
                                        </span>
                                        {parseFloat(coupon.discount) > 0 && (
                                          <span className="text-xs text-green-600 flex-shrink-0">
                                            -<FormattedPrice
                                              price={parseFloat(coupon.discount) / divisor}
                                              iconSize="xs"
                                            />
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCoupon(coupon.code)}
                                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 flex-shrink-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}


                            </div>
                            )}

                                          {/* Totals */}
                            <div className="space-y-3 border-b border-brand-border/70 py-4">
                              <div className="flex justify-between text-sm text-brand-muted">
                                <span>{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
                                <FormattedPrice
                                  price={parseFloat(cartSubtotal) / divisor}
                                  iconSize="xs"
                                />
                              </div>
                              {couponDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>{isRTL ? "الخصم" : "Discount"}</span>
                                  <span className="inline-flex items-center gap-1">
                                    -<FormattedPrice
                                      price={couponDiscount / divisor}
                                      iconSize="xs"
                                    />
                                  </span>
                                </div>
                              )}
                              {cartDiscounts.map((discount) => (
                                <div key={discount.ruleId} className="flex justify-between text-sm text-green-600">
                                  <span>{discount.label}</span>
                                  <span className="inline-flex items-center gap-1">
                                    -<FormattedPrice
                                      price={discount.amount / divisor}
                                      iconSize="xs"
                                    />
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm text-brand-muted">
                                <span>{isRTL ? "الشحن" : "Shipping"}</span>
                                {parseFloat(shippingTotal) > 0 ? (
                                  <FormattedPrice
                                    price={(parseFloat(shippingTotal) || 0) / shippingDivisor}
                                    iconSize="xs"
                                  />
                                ) : parseFloat(cart?.totals?.shipping_total || "0") > 0 ? (
                                  <FormattedPrice
                                    price={(parseFloat(cart?.totals?.shipping_total || "0") || 0) / shippingDivisor}
                                    iconSize="xs"
                                  />
                                ) : (
                                  <span className="text-green-600 font-medium">{isRTL ? "مجاني" : "Free"}</span>
                                )}
                              </div>
                              {/* Fees -- show non-customs fees from cart, plus client-side customs fee */}
                              {Array.isArray(cart?.fees) && cart.fees.length > 0 && cart.fees
                                .filter(fee => fee?.name?.toLowerCase() !== "customs fees")
                                .map((fee, index) => (
                                <div key={`cart-fee-${index}`} className="flex justify-between text-sm text-brand-muted">
                                  <span>{fee?.name || ""}</span>
                                  <FormattedPrice
                                    price={parseFloat(fee?.fee) / divisor}
                                    iconSize="xs"
                                  />
                                </div>
                              ))}
                              {customsFee ? (
                                <div className="flex justify-between text-sm text-brand-muted">
                                  <span>{isRTL ? "رسوم جمركية" : customsFee.name}</span>
                                  <FormattedPrice
                                    price={parseFloat(customsFee.fee) / divisor}
                                    iconSize="xs"
                                  />
                                </div>
                              ) : Array.isArray(cart?.fees) && cart.fees.length > 0 && cart.fees
                                .filter(fee => fee?.name?.toLowerCase() === "customs fees")
                                .map((fee, index) => (
                                <div key={`customs-fee-${index}`} className="flex justify-between text-sm text-brand-muted">
                                  <span>{isRTL ? "رسوم جمركية" : (fee?.name || "")}</span>
                                  <FormattedPrice
                                    price={parseFloat(fee.fee) / divisor}
                                    iconSize="xs"
                                  />
                                </div>
                              ))}
                            </div>

              <div className="hidden py-4 text-lg font-bold text-brand-primary lg:flex lg:justify-between">
                <span>{isRTL ? "الإجمالي" : "Total"}</span>
                <FormattedPrice
                  price={checkoutTotal}
                  iconSize="sm"
                />
              </div>

              <Button
                type="submit"
                className="hidden w-full lg:flex"
                size="lg"
                isLoading={isSubmitting || isAuthLoading}
                disabled={isAuthLoading}
              >
                {isRTL ? "تأكيد الطلب" : "Place Order"}
              </Button>

              <p className="mt-2 hidden text-center text-xs text-brand-muted lg:block">
                {isRTL ? "جميع الأسعار شاملة ضريبة القيمة المضافة" : "All prices are inclusive of VAT"}
              </p>

              <p className="mt-4 hidden text-center text-xs text-brand-muted lg:block">
                {isRTL
                  ? "بالنقر على تأكيد الطلب، فإنك توافق على شروط الخدمة وسياسة الخصوصية."
                  : "By clicking Place Order, you agree to our Terms of Service and Privacy Policy."}
              </p>

              {/* WhatsApp Help */}
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-sm text-brand-primary">
                  {isRTL ? "هل تحتاج مساعدة في طلبك؟" : "Need help with your order?"}
                </p>
                <a
                  href="https://wa.me/97143442448"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {isRTL ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </form>
      )}
      </div>

      {/* Mobile Sticky Order Summary */}
      {!isEmptyCart && !isKeyboardVisible && (
      <div
        className="fixed left-3 right-3 z-40 rounded-full border border-brand-border/70 bg-brand-ivory/96 px-4 py-2 shadow-[0_16px_40px_rgba(20,15,10,0.16)] backdrop-blur-xl lg:hidden"
        style={{ bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 4.75rem)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-brand-muted">{isRTL ? "الإجمالي" : "Total"}</span>
            <FormattedPrice
              price={checkoutTotal}
              className="text-base font-bold text-brand-primary"
              iconSize="xs"
            />
          </div>
          <Button 
            type="submit"
            form="checkout-form"
            size="lg" 
            className="h-10 max-w-[180px] flex-1 px-4 text-xs"
            isLoading={isSubmitting || isAuthLoading}
            disabled={isAuthLoading}
          >
            {isRTL ? "تأكيد الطلب" : "Place Order"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
