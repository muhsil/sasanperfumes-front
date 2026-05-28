"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Plus, Minus, Search, Check, ChevronDown } from "lucide-react";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { PaymentWidgets } from "@/components/payment/PaymentWidgets";
import { useCart } from "@/contexts/CartContext";
import { useNotification } from "@/contexts/NotificationContext";
import { useFreeGift } from "@/contexts/FreeGiftContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { saveBundleData } from "@/lib/utils/bundleStorage";
import type { WCProduct } from "@/types/woocommerce";
import type { Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";
import { BESTSELLER_PRODUCT_IDS, type BundleConfig } from "@/lib/api/woocommerce";

function sanitizeProductDescription(html: string): string {
  if (!html) return "";
  
  let sanitized = html;
  
  sanitized = sanitized.replace(/<div[^>]*class="[^"]*tinv[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  sanitized = sanitized.replace(/<div[^>]*class="[^"]*yith[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  sanitized = sanitized.replace(/<a[^>]*class="[^"]*tinvwl[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");
  sanitized = sanitized.replace(/<a[^>]*aria-label="Add to Wishlist"[^>]*>[\s\S]*?<\/a>/gi, "");
  sanitized = sanitized.replace(/<p>\s*<\/p>/gi, "");
  sanitized = sanitized.replace(/Add to Wishlist/gi, "");
  sanitized = sanitized.trim();
  
  return sanitized;
}

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium uppercase tracking-wide text-gray-900">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-[500px] pb-4" : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

type CategoryFilter = "all" | "perfumes" | "oils" | "lotions" | "home";

interface ProductOption {
  id: number;
  name: string;
  price: number;
  slug: string;
  image: string;
  category: CategoryFilter;
  categoryName: string;
}

interface BuildYourOwnSetClientProps {
  products: WCProduct[];
  locale: Locale;
  bundleProduct?: WCProduct | null;
  bundleConfig?: BundleConfig | null;
  freeShippingThreshold?: number | null;
}

export function BuildYourOwnSetClient({
  products,
  locale,
  bundleProduct,
  bundleConfig,
  freeShippingThreshold,
}: BuildYourOwnSetClientProps) {
  const isRTL = locale === "ar";
  const { addToCart } = useCart();
  const { notify } = useNotification();
  const { getFreeGiftProductIds } = useFreeGift();
  const { currency, convertPrice, getCurrencyInfo } = useCurrency();
  const currencyInfo = getCurrencyInfo();
  const convertedShippingThreshold = freeShippingThreshold ? Math.ceil(convertPrice(freeShippingThreshold)) : null;
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const toggleAccordion = (section: string) => {
      setOpenAccordion(openAccordion === section ? null : section);
    };

    // Get required and optional slots from bundle config
  // Use optional_slots directly from API (defaults to 0 if not set)
  const requiredSlots = bundleConfig?.required_slots || 3;
  const optionalSlots = bundleConfig?.optional_slots ?? 0;
  const totalSlots = requiredSlots + optionalSlots;

  // Check if a slot is fixed (pre-selected and not changeable)
  const isSlotFixed = (index: number): boolean => {
    return bundleConfig?.slots?.[index]?.is_fixed === true;
  };

  // Initialize selections array based on total slots, pre-populating fixed slots
  const [selections, setSelections] = useState<(ProductOption | null)[]>(() => {
    const initial: (ProductOption | null)[] = Array(totalSlots).fill(null);
    // Pre-populate fixed slots from bundleConfig
    if (bundleConfig?.slots) {
      bundleConfig.slots.forEach((slotConfig, idx) => {
        if (idx < totalSlots && slotConfig.is_fixed && slotConfig.fixed_product_id) {
          const fixedProduct = products.find(p => p.id === slotConfig.fixed_product_id);
          if (fixedProduct) {
            const categoryName = fixedProduct.categories?.[0]?.name?.toLowerCase() || "";
            let category: CategoryFilter = "all";
            if (categoryName.includes("perfume") || categoryName.includes("عطر")) category = "perfumes";
            else if (categoryName.includes("oil") || categoryName.includes("زيت")) category = "oils";
            else if (categoryName.includes("lotion") || categoryName.includes("لوشن") || categoryName.includes("care") || categoryName.includes("عناية")) category = "lotions";
            else if (categoryName.includes("home") || categoryName.includes("منزل")) category = "home";
            initial[idx] = {
              id: fixedProduct.id,
              name: fixedProduct.name,
              price: parseInt(fixedProduct.prices.price) / Math.pow(10, fixedProduct.prices.currency_minor_unit),
              slug: fixedProduct.slug,
              image: fixedProduct.images?.[0]?.src || "/images/placeholder-product.jpg",
              category,
              categoryName: fixedProduct.categories?.[0]?.name || "",
            };
          }
        }
      });
    }
    return initial;
  });

  // Get eligible product IDs from bundle config (if configured)
  const eligibleProductIds = useMemo(() => {
    if (!bundleConfig?.eligible_products?.length) return null;
    return new Set(bundleConfig.eligible_products);
  }, [bundleConfig]);

  // Get eligible category IDs from bundle config (if configured)
  const eligibleCategoryIds = useMemo(() => {
    if (!bundleConfig?.eligible_categories?.length) return null;
    return new Set(bundleConfig.eligible_categories);
  }, [bundleConfig]);

  // Get exclude product IDs from bundle config
  const excludeProductIds = useMemo(() => {
    if (!bundleConfig?.exclude_products?.length) return new Set<number>();
    return new Set(bundleConfig.exclude_products);
  }, [bundleConfig]);

  // Get exclude category IDs from bundle config
  const excludeCategoryIds = useMemo(() => {
    if (!bundleConfig?.exclude_categories?.length) return new Set<number>();
    return new Set(bundleConfig.exclude_categories);
  }, [bundleConfig]);

  // Get slot-specific configuration for the active slot
  const activeSlotConfig = useMemo(() => {
    if (activeSlot === null || !bundleConfig?.slots?.length) return null;
    return bundleConfig.slots[activeSlot] || null;
  }, [activeSlot, bundleConfig]);

  // Get slot-specific eligible product IDs (if configured for active slot)
  const slotEligibleProductIds = useMemo(() => {
    if (!activeSlotConfig?.eligible_products?.length) return null;
    return new Set(activeSlotConfig.eligible_products);
  }, [activeSlotConfig]);

  // Get slot-specific eligible category IDs (if configured for active slot)
  const slotEligibleCategoryIds = useMemo(() => {
    if (!activeSlotConfig?.eligible_categories?.length) return null;
    return new Set(activeSlotConfig.eligible_categories);
  }, [activeSlotConfig]);

  // Get slot-specific exclude product IDs (if configured for active slot)
  const slotExcludeProductIds = useMemo(() => {
    if (!activeSlotConfig?.exclude_products?.length) return new Set<number>();
    return new Set(activeSlotConfig.exclude_products);
  }, [activeSlotConfig]);

  // Get slot-specific exclude category IDs (if configured for active slot)
  const slotExcludeCategoryIds = useMemo(() => {
    if (!activeSlotConfig?.exclude_categories?.length) return new Set<number>();
    return new Set(activeSlotConfig.exclude_categories);
  }, [activeSlotConfig]);

  const productOptions: ProductOption[] = useMemo(() => {
    // Get free gift product IDs to exclude from bundle selection
    const freeGiftProductIds = new Set(getFreeGiftProductIds());
    
    // Get the bundle product ID to exclude from bundle selection
    const bundleProductId = bundleProduct?.id;
    
    // Filter products based on eligibility rules
    const filteredProducts = products.filter((p) => {
      // Exclude the bundle product itself
      if (bundleProductId && p.id === bundleProductId) return false;
      
      // Exclude free gift products
      if (freeGiftProductIds.has(p.id)) return false;
      
      // Exclude products in exclude_products list
      if (excludeProductIds.has(p.id)) return false;
      
      // Exclude products in excluded categories
      if (excludeCategoryIds.size > 0) {
        const productCategoryIds = p.categories?.map(c => c.id) || [];
        if (productCategoryIds.some(catId => excludeCategoryIds.has(catId))) return false;
      }
      
      // Check eligibility - if both eligible_products and eligible_categories are empty, allow all
      const hasEligibleProducts = eligibleProductIds && eligibleProductIds.size > 0;
      const hasEligibleCategories = eligibleCategoryIds && eligibleCategoryIds.size > 0;
      
      if (!hasEligibleProducts && !hasEligibleCategories) {
        // No eligibility restrictions, allow all (except excluded)
        return true;
      }
      
      // Check if product is in eligible_products list
      if (hasEligibleProducts && eligibleProductIds.has(p.id)) {
        return true;
      }
      
      // Check if product is in an eligible category
      if (hasEligibleCategories) {
        const productCategoryIds = p.categories?.map(c => c.id) || [];
        if (productCategoryIds.some(catId => eligibleCategoryIds.has(catId))) {
          return true;
        }
      }
      
      // If eligibility rules exist but product doesn't match any, exclude it
      return false;
    });

    return filteredProducts.map((product) => {
      const categoryName = product.categories?.[0]?.name?.toLowerCase() || "";
      let category: CategoryFilter = "all";
      if (categoryName.includes("perfume") || categoryName.includes("عطر")) {
        category = "perfumes";
      } else if (categoryName.includes("oil") || categoryName.includes("زيت")) {
        category = "oils";
      } else if (categoryName.includes("lotion") || categoryName.includes("لوشن") || categoryName.includes("care") || categoryName.includes("عناية")) {
        category = "lotions";
      } else if (categoryName.includes("home") || categoryName.includes("منزل")) {
        category = "home";
      }

      return {
        id: product.id,
        name: product.name,
        price:
          parseInt(product.prices.price) /
          Math.pow(10, product.prices.currency_minor_unit),
        slug: product.slug,
        image: product.images?.[0]?.src || "/images/placeholder-product.jpg",
        category,
        categoryName: product.categories?.[0]?.name || "",
      };
    });
  }, [products, eligibleProductIds, eligibleCategoryIds, excludeProductIds, excludeCategoryIds, getFreeGiftProductIds, bundleProduct]);

  const selectedIds = useMemo(() => {
    return new Set(selections.filter((s) => s !== null).map((s) => s!.id));
  }, [selections]);

  // Compute which categories have available products
  const availableCategories = useMemo(() => {
    const categoriesWithProducts = new Set<CategoryFilter>(["all"]);
    productOptions.forEach((product) => {
      if (product.category !== "all") {
        categoriesWithProducts.add(product.category);
      }
    });
    return categoriesWithProducts;
  }, [productOptions]);

  const bestsellerIdSet = useMemo(() => new Set(BESTSELLER_PRODUCT_IDS), []);

  const filteredProducts = useMemo(() => {
    const filtered = productOptions.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      
      // If no active slot or no slot-specific config, use global filtering only
      if (!matchesSearch || !matchesCategory) return false;
      
      // Apply slot-specific filtering if configured
      if (activeSlotConfig) {
        // Check slot-specific excludes first
        if (slotExcludeProductIds.has(product.id)) return false;
        
        // Check slot-specific category excludes
        // Note: We need to find the original product to check categories
        const originalProduct = products.find(p => p.id === product.id);
        if (originalProduct && slotExcludeCategoryIds.size > 0) {
          const productCategoryIds = originalProduct.categories?.map(c => c.id) || [];
          if (productCategoryIds.some(catId => slotExcludeCategoryIds.has(catId))) return false;
        }
        
        // Check slot-specific eligibility
        const hasSlotEligibleProducts = slotEligibleProductIds && slotEligibleProductIds.size > 0;
        const hasSlotEligibleCategories = slotEligibleCategoryIds && slotEligibleCategoryIds.size > 0;
        
        if (hasSlotEligibleProducts || hasSlotEligibleCategories) {
          // If slot has specific eligibility rules, product must match at least one
          if (hasSlotEligibleProducts && slotEligibleProductIds.has(product.id)) {
            return true;
          }
          
          if (hasSlotEligibleCategories && originalProduct) {
            const productCategoryIds = originalProduct.categories?.map(c => c.id) || [];
            if (productCategoryIds.some(catId => slotEligibleCategoryIds.has(catId))) {
              return true;
            }
          }
          
          // Slot has eligibility rules but product doesn't match any
          return false;
        }
      }
      
      return true;
    });
    const bestsellers: ProductOption[] = [];
    const others: ProductOption[] = [];
    for (const product of filtered) {
      if (bestsellerIdSet.has(product.id)) {
        bestsellers.push(product);
      } else {
        others.push(product);
      }
    }
    return [...bestsellers, ...others];
  }, [productOptions, searchQuery, categoryFilter, activeSlotConfig, slotEligibleProductIds, slotEligibleCategoryIds, slotExcludeProductIds, slotExcludeCategoryIds, products, bestsellerIdSet]);

  // Get the bundle product's base price from WooCommerce
  const bundleProductPrice = useMemo(() => {
    if (!bundleProduct?.prices?.price) return 0;
    return parseInt(bundleProduct.prices.price) / Math.pow(10, bundleProduct.prices.currency_minor_unit);
  }, [bundleProduct]);

  // Get pricing mode from bundle config (defaults to "sum" for backwards compatibility)
  const pricingMode = bundleConfig?.pricing_mode || "sum";
  
  // Get fixed price for "fixed" pricing mode
  const fixedPrice = bundleConfig?.fixed_price || bundleProductPrice;

  // Get box price for "sum" pricing mode: use config value if set, otherwise use bundle product's WooCommerce price
  // This represents the cost of the box/packaging itself
  const boxPrice = pricingMode === "fixed" 
    ? fixedPrice 
    : (bundleConfig?.with_box_price || bundleProductPrice);

  const isSlotFree = (index: number): boolean => {
    return bundleConfig?.slots?.[index]?.is_free === true;
  };

  // Calculate required products total (first requiredSlots items), excluding free and fixed slots
  const requiredProductsTotal = useMemo(() => {
    return selections.slice(0, requiredSlots).reduce((sum, selection, index) => {
      if (isSlotFree(index) || isSlotFixed(index)) return sum;
      return sum + (selection?.price || 0);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, requiredSlots, bundleConfig]);

  // Calculate add-on products total (items after requiredSlots), excluding free and fixed slots
  const addOnProductsTotal = useMemo(() => {
    return selections.slice(requiredSlots).reduce((sum, selection, index) => {
      if (isSlotFree(requiredSlots + index) || isSlotFixed(requiredSlots + index)) return sum;
      return sum + (selection?.price || 0);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, requiredSlots, bundleConfig]);

  // Total products price (required + add-ons)
  const productsTotal = requiredProductsTotal + addOnProductsTotal;

  // Check if any add-on products are selected
  const hasAddOns = selections.slice(requiredSlots).some((s) => s !== null);
  
  // Calculate total based on pricing mode:
  // - "fixed": Total is always the fixed price, regardless of selected products
  // - "sum": Total = box price + sum of selected product prices
  const total = pricingMode === "fixed" ? fixedPrice : (boxPrice + productsTotal);

  const requiredCount = selections.slice(0, requiredSlots).filter((s) => s !== null).length;
  const isValid = requiredCount === requiredSlots;

  // Helper function to get slot label from config or fallback to default
  const getSlotLabel = (index: number, isOptional: boolean = false) => {
    // Check if slot has a custom title from backend config
    const slotConfig = bundleConfig?.slots?.[index];
    if (slotConfig?.title) {
      return slotConfig.title;
    }
    // Fallback to default translation
    return isOptional ? t.addExtraWithPrice : `${t.chooseItem} ${index + 1}`;
  };

  const handleSlotClick = (index: number) => {
    if (isSlotFixed(index)) return;
    setActiveSlot(index);
    setSearchQuery("");
    setCategoryFilter("all");
  };

  const handleProductSelect = (product: ProductOption) => {
    if (activeSlot === null) return;

    const newSelections = [...selections];
    newSelections[activeSlot] = product;
    setSelections(newSelections);
    setActiveSlot(null);
  };

  const handleRemoveSelection = (index: number) => {
    if (isSlotFixed(index)) return;
    const newSelections = [...selections];
    newSelections[index] = null;
    setSelections(newSelections);
  };

  const handleAddToCart = async () => {
    if (!isValid) {
      notify("error", isRTL ? "يرجى اختيار 3 منتجات على الأقل" : "Please select at least 3 products");
      return;
    }

    if (!bundleProduct) {
      notify("error", isRTL ? "منتج الحزمة غير متوفر" : "Bundle product not available");
      return;
    }

    setIsAddingToCart(true);
    try {
      const selectedProducts = selections
        .map((s, idx) => s ? { product: s, slotIndex: idx } : null)
        .filter((entry): entry is { product: ProductOption; slotIndex: number } => entry !== null)
        .map((entry) => ({
          product_id: entry.product.id,
          name: entry.product.name,
          price: isSlotFixed(entry.slotIndex) ? 0 : isSlotFree(entry.slotIndex) ? 0 : entry.product.price,
          is_addon: entry.slotIndex >= requiredSlots,
          is_free: isSlotFree(entry.slotIndex),
          is_fixed: isSlotFixed(entry.slotIndex),
        }));

      const bundleData = {
        bundle_items: selectedProducts,
        bundle_total: total,
        box_price: boxPrice,
        products_total: productsTotal,
        required_items_total: requiredProductsTotal,
        addon_items_total: addOnProductsTotal,
        pricing_mode: pricingMode,
        fixed_price: pricingMode === "fixed" ? fixedPrice : undefined,
      };

      // Save bundle data to localStorage as fallback since CoCart doesn't persist cart_item_data
      saveBundleData(bundleProduct.id, bundleData);

      await addToCart(bundleProduct.id, quantity, undefined, undefined, bundleData);
      
      notify("success", isRTL ? "تمت إضافة الحزمة إلى السلة" : "Bundle added to cart");
    } catch (error) {
      console.error("Failed to add to cart:", error);
      notify("error", isRTL ? "فشل في إضافة الحزمة" : "Failed to add bundle");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const bundleImage = bundleProduct?.images?.[0]?.src || "/images/bundle-box.jpg";

  const translations = {
    en: {
      title: "Build Your Own Set",
      description:
        "Whether you're treating yourself or surprising someone special, our ShapeHive Bundle Boxes bring together the finest in fragrance and body care.",
      instructions:
        "Create a set that's as unique as your fragrance personality. Pick 3 or more products of your choice.",
      yourBox: "Your Box",
      required: "Required",
      optional: "Add on (optional)",
      chooseItem: "Choose item",
      addExtra: "Add extra",
      addExtraWithPrice: "Add extra (with price)",
      free: "FREE",
      fixed: "Included",
      change: "Change",
      total: "Total",
      boxPrice: "Box",
      products: "Products",
      addOns: "Add-ons",
      fixedPrice: "Fixed Price",
      addToCart: "Add to cart",
      adding: "Adding...",
      selectProduct: "Select a Product",
      searchProducts: "Search products...",
      all: "All",
      perfumes: "Perfumes",
      oils: "Oils",
      lotions: "Personal Care",
      home: "Home Fragrances",
      select: "Select",
      selected: "Selected",
      close: "Close",
                  itemsSelected: "items selected",
              requiredItems: "required",
              characteristics: "Characteristics",
              descriptionTab: "Description",
              paymentDelivery: "Payment & Delivery",
              category: "Category",
              sku: "SKU",
              noDescription: "No description available",
              paymentInfo: "We accept all major credit cards and cash on delivery.",
              deliveryInfo: convertedShippingThreshold
                ? `Free shipping on orders over ${convertedShippingThreshold} ${currencyInfo.code}. Delivery within 2-5 business days.`
                : "Delivery within 2-5 business days.",
            },
            ar:{
      title: "اصنع مجموعتك الخاصة",
      description:
        "سواء كنت تدلل نفسك أو تفاجئ شخصًا مميزًا، فإن صناديق ShapeHive تجمع أفضل العطور ومنتجات العناية بالجسم.",
      instructions:
        "أنشئ مجموعة فريدة مثل شخصيتك العطرية. اختر 3 منتجات أو أكثر من اختيارك.",
      yourBox: "صندوقك",
      required: "مطلوب",
      optional: "إضافة (اختياري)",
      chooseItem: "اختر منتج",
      addExtra: "أضف إضافي",
      addExtraWithPrice: "أضف إضافي (بسعر)",
      free: "مجاناً",
      fixed: "مشمول",
      change: "تغيير",
      total: "المجموع",
      boxPrice: "الصندوق",
      products: "المنتجات",
      addOns: "الإضافات",
      fixedPrice: "سعر ثابت",
      addToCart: "أضف إلى السلة",
      adding: "جاري الإضافة...",
      selectProduct: "اختر منتج",
      searchProducts: "ابحث عن المنتجات...",
      all: "الكل",
      perfumes: "العطور",
      oils: "الزيوت",
      lotions: "العناية الشخصية",
      home: "معطرات المنزل",
      select: "اختر",
      selected: "مختار",
      close: "إغلاق",
            itemsSelected: "منتجات مختارة",
          requiredItems: "مطلوب",
          characteristics: "الخصائص",
          descriptionTab: "الوصف",
          paymentDelivery: "الدفع والتوصيل",
          category: "الفئة",
          sku: "رمز المنتج",
          noDescription: "لا يوجد وصف متاح",
          paymentInfo: "نقبل جميع بطاقات الائتمان الرئيسية والدفع عند الاستلام.",
          deliveryInfo: convertedShippingThreshold
            ? `شحن مجاني للطلبات التي تزيد عن ${convertedShippingThreshold} ${currencyInfo.code}. التوصيل خلال 2-5 أيام عمل.`
            : "التوصيل خلال 2-5 أيام عمل.",
        },
      };

      const t = translations[isRTL ? "ar" : "en"];

  const allCategories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: t.all },
    { key: "perfumes", label: t.perfumes },
    { key: "oils", label: t.oils },
    { key: "lotions", label: t.lotions },
    { key: "home", label: t.home },
  ];

  // Only show categories that have available products
  const categories = allCategories.filter((cat) => availableCategories.has(cat.key));

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={bundleImage}
            alt={bundleProduct?.name || t.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-base font-medium text-gray-900 md:text-2xl uppercase">
            {bundleProduct?.name || t.title}
          </h1>

          {/* Price - Show bundle product price or calculated total */}
          <div className="text-xl font-bold text-gray-900">
            <FormattedPrice price={bundleProductPrice > 0 ? bundleProductPrice : total} iconSize="md" />
          </div>

          {/* Description - Use product short_description from WordPress if available */}
          {bundleProduct?.short_description ? (
            <div 
              className="space-y-2 text-sm text-gray-600 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: bundleProduct.short_description }}
            />
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <p>{t.description}</p>
              <p>{t.instructions}</p>
            </div>
          )}

                    {/* Your Box Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t.yourBox}</h2>
              <span className="text-sm text-gray-500">
                {requiredCount}/{requiredSlots} {t.requiredItems}
              </span>
            </div>

            {/* Required Slots */}
            <div className="space-y-3">
              {Array.from({ length: requiredSlots }, (_, i) => i).map((index) => (
                <div
                  key={`slot-${index}`}
                                    className={`relative flex items-center gap-4 border-2 p-3 transition-all ${
                                      selections[index]
                                        ? "border-brand-gold bg-brand-beige"
                                        : "border-dashed border-gray-300 bg-gray-50 hover:border-brand-gold hover:bg-brand-beige"
                                    }`}
                >
                  {selections[index] ? (
                    <>
                                        <div className={`relative h-16 w-16 flex-shrink-0 overflow-hidden bg-white ${isSlotFixed(index) ? "opacity-90" : ""}`}>
                                          <Image
                                            src={selections[index]!.image}
                                            alt={selections[index]!.name}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                                              <div className="flex-1 min-w-0 overflow-hidden">
                                                                <p className="line-clamp-2 break-words font-medium text-gray-900 text-xs sm:text-sm uppercase">
                                                                  {selections[index]!.name}
                                                                </p>
                                                                <p className={`text-xs sm:text-sm ${isSlotFixed(index) ? "text-gray-500 font-medium" : isSlotFree(index) ? "text-green-600 font-semibold" : "text-brand-primary"}`}>
                                                                  {isSlotFixed(index) ? t.fixed : isSlotFree(index) ? t.free : <FormattedPrice price={selections[index]!.price} iconSize="sm" />}
                                                                </p>
                                                              </div>
                                        {!isSlotFixed(index) && (
                                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                          <button
                                            onClick={() => handleSlotClick(index)}
                                            className="text-xs text-brand-gold hover:text-brand-primary hover:underline whitespace-nowrap"
                                          >
                                            {t.change}
                                          </button>
                                          <button
                                            onClick={() => handleRemoveSelection(index)}
                                            className="p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                        )}
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleSlotClick(index)}
                                        className="flex w-full items-center gap-4 text-left"
                                      >
                                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border-2 border-dashed border-gray-300 bg-white">
                        <Plus className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">
                          {getSlotLabel(index)}
                        </p>
                        <p className="text-xs text-red-500">{t.required}</p>
                      </div>
                    </button>
                  )}
                  <div className="absolute -top-2 left-3 bg-brand-gold px-2 py-0.5 text-xs font-medium text-white">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Slots - only show if optionalSlots > 0 */}
            {optionalSlots > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-gray-500">{t.optional}</p>
              {Array.from({ length: optionalSlots }, (_, i) => requiredSlots + i).map((index) => (
                <div
                  key={`slot-${index}`}
                                    className={`relative flex items-center gap-4 border-2 p-3 transition-all ${
                                      selections[index]
                                        ? "border-brand-gold bg-brand-beige"
                                        : "border-dashed border-gray-200 bg-gray-50/50 hover:border-brand-primary hover:bg-brand-beige"
                                    }`}
                >
                  {selections[index] ? (
                    <>
                                        <div className={`relative h-16 w-16 flex-shrink-0 overflow-hidden bg-white ${isSlotFixed(index) ? "opacity-90" : ""}`}>
                                          <Image
                                            src={selections[index]!.image}
                                            alt={selections[index]!.name}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                                              <div className="flex-1 min-w-0 overflow-hidden">
                                                                <p className="line-clamp-2 break-words font-medium text-gray-900 text-xs sm:text-sm uppercase">
                                                                  {selections[index]!.name}
                                                                </p>
                                                                <p className={`text-xs sm:text-sm ${isSlotFixed(index) ? "text-gray-500 font-medium" : isSlotFree(index) ? "text-green-600 font-semibold" : "text-brand-primary"}`}>
                                                                  {isSlotFixed(index) ? t.fixed : isSlotFree(index) ? t.free : <FormattedPrice price={selections[index]!.price} iconSize="sm" />}
                                                                </p>
                                                              </div>
                                        {!isSlotFixed(index) && (
                                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                          <button
                                            onClick={() => handleSlotClick(index)}
                                            className="text-xs text-brand-gold hover:text-brand-primary hover:underline whitespace-nowrap"
                                          >
                                            {t.change}
                                          </button>
                                          <button
                                            onClick={() => handleRemoveSelection(index)}
                                            className="p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                        )}
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleSlotClick(index)}
                                        className="flex w-full items-center gap-4 text-left"
                                      >
                                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center border-2 border-dashed border-gray-200 bg-white">
                        <Plus className="h-6 w-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-400">{getSlotLabel(index, true)}</p>
                        <p className={`text-xs ${isSlotFree(index) ? "text-green-600" : "text-gray-400"}`}>{isSlotFree(index) ? t.free : t.optional}</p>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 border-t border-gray-200 pt-4">
            {/* For "sum" pricing mode: show breakdown of box price + products */}
            {pricingMode === "sum" && (
              <>
                {/* Box Price */}
                {boxPrice > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{t.boxPrice}</span>
                    <span><FormattedPrice price={boxPrice} iconSize="sm" /></span>
                  </div>
                )}
                {/* Products Price (required items only) */}
                {requiredProductsTotal > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{t.products}</span>
                    <span><FormattedPrice price={requiredProductsTotal} iconSize="sm" /></span>
                  </div>
                )}
                {/* Add-ons Price */}
                {hasAddOns && addOnProductsTotal > 0 && (
                  <div className="flex items-center justify-between text-sm text-brand-gold">
                    <span>{t.addOns}</span>
                    <span>+<FormattedPrice price={addOnProductsTotal} iconSize="sm" /></span>
                  </div>
                )}
              </>
            )}
            {/* For "fixed" pricing mode: show fixed price label */}
            {pricingMode === "fixed" && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{t.fixedPrice}</span>
                <span><FormattedPrice price={fixedPrice} iconSize="sm" /></span>
              </div>
            )}
            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-900">{t.total}</span>
              <span className="text-xl font-bold text-gray-900">
                <FormattedPrice price={total} iconSize="md" />
              </span>
            </div>
          </div>

          {/* Payment Widgets - Only shows if payment gateway is enabled */}
          {total > 0 && (
            <PaymentWidgets price={total} currency={currency} locale={locale} />
          )}

          {/* Quantity and Add to Cart */}
          <div className="flex items-center gap-4">
            {/* Quantity Selector */}
            <div className="flex items-center overflow-hidden rounded-full bg-brand-beige">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-brand-brown transition-all duration-300 hover:bg-brand-beige-dark disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={isRTL ? "تقليل الكمية" : "Decrease quantity"}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(1, val), 99));
                }}
                className="h-10 w-10 bg-transparent text-center text-sm font-bold text-brand-brown focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                min={1}
                max={99}
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(quantity + 1, 99))}
                disabled={quantity >= 99}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-brand-gold text-white transition-all duration-300 hover:bg-brand-brown-light disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={isRTL ? "زيادة الكمية" : "Increase quantity"}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isValid || isAddingToCart}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-brand-gold bg-brand-gold px-8 py-3 text-sm font-medium uppercase tracking-wide text-white transition-all duration-300 hover:bg-transparent hover:text-brand-gold disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-400"
            >
                    {isAddingToCart ? t.adding : t.addToCart}
                  </button>
                </div>

                {/* Accordion Sections */}
                <div className="border-t border-gray-200 pt-2">
                  {/* Characteristics */}
                  <AccordionSection
                    title={t.characteristics}
                    isOpen={openAccordion === "characteristics"}
                    onToggle={() => toggleAccordion("characteristics")}
                  >
                    <div className="space-y-2 text-sm">
                      {bundleProduct?.categories && bundleProduct.categories.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t.category}</span>
                          <span className="text-gray-900">{bundleProduct.categories[0].name}</span>
                        </div>
                      )}
                      {bundleProduct?.sku && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t.sku}</span>
                          <span className="text-gray-900">{bundleProduct.sku}</span>
                        </div>
                      )}
                    </div>
                  </AccordionSection>

                                    {/* Description */}
                                    <AccordionSection
                                      title={t.descriptionTab}
                                      isOpen={openAccordion === "description"}
                                      onToggle={() => toggleAccordion("description")}
                                    >
                    {bundleProduct?.description && sanitizeProductDescription(bundleProduct.description) ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: sanitizeProductDescription(bundleProduct.description) }}
                      />
                    ) : (
                      <p className="text-sm text-gray-500">
                        {t.noDescription}
                      </p>
                    )}
                  </AccordionSection>

                  {/* Payment & Delivery */}
                  <AccordionSection
                    title={t.paymentDelivery}
                    isOpen={openAccordion === "payment"}
                    onToggle={() => toggleAccordion("payment")}
                  >
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>{t.paymentInfo}</p>
                      <p>{t.deliveryInfo}</p>
                    </div>
                  </AccordionSection>
                </div>
              </div>
            </div>

            {/* Product Picker Modal */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden bg-white">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t.selectProduct}
                </h3>
                <button
                  onClick={() => setActiveSlot(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.searchProducts}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* Category Filters */}
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      categoryFilter === cat.key
                        ? "bg-brand-gold text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredProducts.map((product) => {
                    // Check if product is already selected in another slot
                    const isSelected = selectedIds.has(product.id);
                    // Check if this product is currently in the active slot (allow re-selecting same product)
                    const isCurrentSlotProduct = activeSlot !== null && selections[activeSlot]?.id === product.id;
                    // Product is disabled if it's already selected in another slot
                    // Allow selecting the same product that's already in the current slot (for "change" action)
                    const isDisabled = isSelected && !isCurrentSlotProduct;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      disabled={isDisabled}
                      className={`group relative flex flex-col overflow-hidden border-2 bg-white text-left transition-all ${
                        isDisabled
                          ? "cursor-not-allowed border-gray-200 opacity-50"
                          : "border-transparent hover:border-brand-gold hover:shadow-lg"
                      }`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="rounded-full bg-white p-2">
                              <Check className="h-5 w-5 text-brand-gold" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-3 min-w-0">
                        <p className="line-clamp-2 text-xs sm:text-sm font-medium text-gray-900 uppercase break-words">
                          {decodeHtmlEntities(product.name)}
                        </p>
                        {product.categoryName && (
                          <p className="font-medium uppercase tracking-wider text-brand-gold mt-0.5" style={{ fontSize: '9px' }}>
                            {product.categoryName}
                          </p>
                        )}
                        <p className={`mt-1 text-xs sm:text-sm font-semibold ${activeSlot !== null && isSlotFree(activeSlot) ? "text-green-600" : "text-brand-primary"}`}>
                          {activeSlot !== null && isSlotFree(activeSlot) ? t.free : <FormattedPrice price={product.price} iconSize="sm" />}
                        </p>
                      </div>
                      {!isDisabled && (
                        <div className="absolute bottom-3 right-3 rounded-full bg-brand-gold px-3 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {t.select}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  {isRTL ? "لا توجد منتجات" : "No products found"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
