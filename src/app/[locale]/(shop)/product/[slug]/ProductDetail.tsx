"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Heart, Minus, Plus, ChevronDown, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Move, Check, Star } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { SocialShareModal } from "@/components/common/SocialShareModal";
import { BackInStockAlert } from "@/components/common/BackInStockAlert";
import { ClothingSizeGuideModal } from "@/components/common/ClothingSizeGuideModal";
import { ScentGuideContent } from "@/components/shop/ScentGuideContent";
import { RelatedProducts } from "@/components/shop/RelatedProducts";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { ProductAddons } from "@/components/shop/ProductAddons";
import { ProductAddToCartButton } from "@/components/shop/ProductAddToCartButton";
import VariationStockBadge from "@/components/shop/VariationStockBadge";
import { LoyaltyPointsBadge } from "@/components/shop/LoyaltyPointsBadge";
import { ProductBadges } from "@/components/shop/ProductBadges";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PaymentWidgets } from "@/components/payment/PaymentWidgets";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import type { WCProduct, WCProductVariation } from "@/types/woocommerce";
import type { WCPAForm, WCPAFormValues } from "@/types/wcpa";
import { siteConfig, type Locale } from "@/config/site";
import { decodeHtmlEntities, BLUR_DATA_URL, cn, formatProductDisplayName } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/utils/image";
import { BESTSELLER_PRODUCT_SLUGS } from "@/lib/api/woocommerce";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { triggerHaptic } from "@/lib/utils/haptics";
import { fbTrackViewContent } from "@/lib/utils/fbpixel";
import { trackAnalyticsEvent } from "@/lib/utils/analytics";

function getDisplayPrice(product: WCProduct, selectedVariation?: WCProductVariation | null) {
  if (selectedVariation?.prices) {
    return selectedVariation.prices;
  }
  if (selectedVariation?.price) {
    return {
      ...product.prices,
      price: selectedVariation.price,
      sale_price: selectedVariation.sale_price || "",
      regular_price: selectedVariation.regular_price || selectedVariation.price,
    };
  }
  return product.prices;
}

function hasDisplayPrice(product: WCProduct, selectedVariation?: WCProductVariation | null) {
  const displayPrice = getDisplayPrice(product, selectedVariation);
  const minorUnit = displayPrice.currency_minor_unit || product.prices.currency_minor_unit || 2;
  const price = parseInt(displayPrice.price || "0", 10) / Math.pow(10, minorUnit);
  return Number.isFinite(price) && price > 0;
}

function sanitizeProductDescription(html: string): string {
  if (!html) return "";
  
  let sanitized = html;
  const blockedHeadingText = [
    "shop by category",
    "why shop with us",
    "trust, speed, and service",
    "trust, speed &amp; service",
    "why shop with us",
    "why shop with us trust, speed and service",
    "trust speed and service",
    "why shop with us trust speed and service",
    "ÙºÙ‡ÙˆØµ Ù…Ø¨Ø§ÙØ³",
    "ÙƒØ§Ù… ÙˆØ´Ø±Ø§Ø¡ ØµØ§Ù„",
    "ÙºÙ‡ØªÙˆ Ø§Ø²Ù‚ÙˆÙ‚ Ø§Ù†ÙˆÙ† ØÙ…Ø¹Ø±Ø¶",
    "Ù‚Ù‡Ø§Øª Ø§Ù„ØºØ±Ù Ø§Ù„Ø´Ù‡Ø§Ù‚ ÙˆØ§Ù„Ø£ÙˆØ±",
    "Ø£Ø¨Ø³Ø±ÙŠØ© ÙŠÙƒÙŠØ± Ù…Ø±ÙŠØ¹",
    "ÙŠÙ‡Ù†Ø§ÙˆÙ† Ù‚Ù‡Ø§Øª Ø§Ù„ØªØ¹Ø¯Ø§",
  ];

  blockedHeadingText.push(
    "shop by categories",
    "trust speed and service",
    "trusted payment methods and protected checkout",
    "fast delivery",
    "simple returns",
    "why shop with us?",
    "why shop with us trust, speed and service",
    "why shop with us trust speed and service",
    "why shop with us trust speed and service.",
    "trust, speed, and service.",
    "shop by categories",
    "thiqa, sor3a, wa khidma",
    "thiqa, sor3a w al khidma",
    "thalak ashoraaa min sasan",
  );
  const normalizedBlockedHeadingText = blockedHeadingText.map((token) =>
    token.toLowerCase().trim()
  );
  const blockPattern = blockedHeadingText
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const headingTagPattern = new RegExp(
    `(<\\s*(?:h[1-6]|p|div|span|strong|b)\\b[^>]*>)\\s*(?:${blockPattern})\\s*(</\\s*(?:h[1-6]|p|div|span|strong|b)\\s*>)`,
    "gi"
  );

  // Remove leftover section titles or phrases from product descriptions that
  // were previously added on CMS product pages.
  sanitized = sanitized.replace(headingTagPattern, "");
  sanitized = sanitized.replace(new RegExp(`\\b(?:${blockPattern})\\b`, "gi"), "");
  
  sanitized = sanitized.replace(/<div[^>]*class="[^"]*tinv[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  sanitized = sanitized.replace(/<div[^>]*class="[^"]*yith[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  sanitized = sanitized.replace(/<a[^>]*class="[^"]*tinvwl[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");
  sanitized = sanitized.replace(/<a[^>]*aria-label="Add to Wishlist"[^>]*>[\s\S]*?<\/a>/gi, "");
  sanitized = sanitized.replace(/<p>\s*<\/p>/gi, "");
  sanitized = sanitized.replace(/Add to Wishlist/gi, "");
  sanitized = sanitized.replace(/<\/?b[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/?strong[^>]*>/gi, "");
  sanitized = sanitized.replace(
    /<\s*(h[1-6]|p|div|span|strong|b)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    (match) => {
      const text = decodeHtmlEntities(match.replace(/<[^>]*>/g, " "))
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[\u200e\u200f\u00ad]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return normalizedBlockedHeadingText.some((token) => text.includes(token)) ? "" : match;
    }
  );
  // Strip <a> tags but keep their text content (links point to CMS URLs that don't work on frontend)
  sanitized = sanitized.replace(/<a[^>]*>(.*?)<\/a>/gi, "$1");
  // Clean up extra Word/Office formatting spans
  sanitized = sanitized.replace(/<span[^>]*class="[^"]*(?:SCXW|BCX|EOP|TextRun|NormalTextRun)[^"]*"[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/span>/gi, "");
  sanitized = sanitized.trim();
  
  return sanitized;
}

function normalizeHtmlContent(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
}

function AccordionSection({ title, children }: AccordionSectionProps) {
  return (
    <div className="border-b border-brand-border/70">
      <div className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-[14px] font-semibold text-brand-primary">
          {title}
        </span>
        <ChevronDown className="h-4 w-4 rotate-180 text-brand-primary" />
      </div>
      <div className="pb-5">
        {children}
      </div>
    </div>
  );
}

interface FullscreenGalleryProps {
  images: { id: number; src: string; alt: string }[];
  selectedIndex: number;
  onClose: () => void;
  onSelectImage: (index: number) => void;
  productName: string;
  isRTL?: boolean;
  isMobile?: boolean;
}

function FullscreenGallery({ images, selectedIndex, onClose, onSelectImage, productName, isRTL, isMobile = false }: FullscreenGalleryProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockRef = useRef<{
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
    htmlOverflow: string;
    scrollY: number;
  } | null>(null);

  const handleZoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev + 0.5, 3)), []);
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const nextZoom = Math.max(prev - 0.5, 1);
      if (nextZoom === 1) setPosition({ x: 0, y: 0 });
      return nextZoom;
    });
  }, []);
  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const requestClose = useCallback(() => {
    setIsVisible(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 180);
  }, [onClose]);

  const goToPrev = useCallback(() => {
    onSelectImage(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    handleResetZoom();
  }, [handleResetZoom, images.length, onSelectImage, selectedIndex]);

  const goToNext = useCallback(() => {
    onSelectImage(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    handleResetZoom();
  }, [handleResetZoom, images.length, onSelectImage, selectedIndex]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    const scrollY = window.scrollY;
    scrollLockRef.current = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
      scrollY,
    };

    document.body.classList.add("gallery-fullscreen-open");
    document.documentElement.classList.add("gallery-fullscreen-open");
    window.dispatchEvent(new CustomEvent("gallery-fullscreen-change", { detail: { open: true } }));
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      window.cancelAnimationFrame(frame);
      const scrollLock = scrollLockRef.current;
      document.body.classList.remove("gallery-fullscreen-open");
      document.documentElement.classList.remove("gallery-fullscreen-open");
      window.dispatchEvent(new CustomEvent("gallery-fullscreen-change", { detail: { open: false } }));

      if (scrollLock) {
        document.body.style.overflow = scrollLock.bodyOverflow;
        document.body.style.position = scrollLock.bodyPosition;
        document.body.style.top = scrollLock.bodyTop;
        document.body.style.width = scrollLock.bodyWidth;
        document.documentElement.style.overflow = scrollLock.htmlOverflow;
        window.scrollTo(0, scrollLock.scrollY);
        scrollLockRef.current = null;
      }

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNext, goToPrev, handleZoomIn, handleZoomOut, requestClose]);

  const handleMobileScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (!clientWidth) return;

    const nextIndex = Math.min(images.length - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
    if (nextIndex !== selectedIndex) {
      onSelectImage(nextIndex);
    }
  };

  useEffect(() => {
    if (!isMobile) return;

    const scroller = mobileScrollerRef.current;
    if (!scroller || !scroller.clientWidth) return;

    const targetLeft = selectedIndex * scroller.clientWidth;
    if (Math.abs(scroller.scrollLeft - targetLeft) > 2) {
      scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }, [isMobile, selectedIndex]);

  if (typeof document === "undefined") {
    return null;
  }

  if (isMobile) {
    return createPortal((
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery"
        className={cn(
          "fixed inset-0 z-[2147483000] isolate h-[100dvh] w-screen overflow-hidden bg-black text-white transition-opacity duration-200 ease-out",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
            {selectedIndex + 1} / {images.length}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors active:bg-black/75"
            aria-label={isRTL ? "إغلاق" : "Close fullscreen"}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div
          ref={mobileScrollerRef}
          onScroll={handleMobileScroll}
          className={cn(
            "flex h-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-contain scroll-smooth transition-all duration-300 ease-out [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            isVisible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.985]"
          )}
        >
          {images.map((image, index) => (
            <div key={`${image.id}-${index}`} className="relative h-full min-w-full snap-center">
              <Image
                src={image.src}
                alt={image.alt || `${productName} ${index + 1}`}
                fill
                sizes="100vw"
                className="object-contain px-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))]"
                priority={index === selectedIndex}
                unoptimized={shouldUseUnoptimizedImage(image.src)}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-10">
            <div className="pointer-events-auto mx-auto flex max-w-full items-center gap-2">
              <button
                type="button"
                onClick={goToPrev}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm transition-colors active:bg-white/25"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 justify-center gap-2 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, index) => (
                <button
                  key={`${image.id}-thumb-${index}`}
                  type="button"
                  onClick={() => {
                    onSelectImage(index);
                    handleResetZoom();
                  }}
                  className={cn(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all",
                    selectedIndex === index
                      ? "border-white opacity-100 shadow-lg shadow-white/10"
                      : "border-white/20 opacity-65"
                  )}
                  aria-label={`View image ${index + 1}`}
                  aria-current={selectedIndex === index ? "true" : "false"}
                >
                  <Image
                    src={image.src}
                    alt={image.alt || `${productName} ${index + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(image.src)}
                  />
                </button>
              ))}
              </div>
              <button
                type="button"
                onClick={goToNext}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-sm transition-colors active:bg-white/25"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    ), document.body);
  }

  return createPortal((
    <div
      className={cn(
        "fixed inset-0 z-[2147483000] isolate flex items-center justify-center bg-black/95 transition-opacity duration-200 ease-out",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Top Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 1}
          className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isRTL ? "تصغير" : "Zoom out"}
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="min-w-[3rem] text-center text-sm font-medium text-white">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          className="rounded-full p-1.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isRTL ? "تكبير" : "Zoom in"}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        {zoomLevel > 1 && (
          <button
            type="button"
            onClick={handleResetZoom}
            className="ml-2 rounded-full p-1.5 text-white transition-colors hover:bg-white/20"
            aria-label={isRTL ? "إعادة تعيين" : "Reset zoom"}
          >
            <Move className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={requestClose}
        className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        aria-label={isRTL ? "إغلاق" : "Close fullscreen"}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110"
            aria-label={isRTL ? "الصورة السابقة" : "Previous image"}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70 hover:scale-110"
            aria-label={isRTL ? "الصورة التالية" : "Next image"}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      
      {/* Main Image with Zoom */}
      <div 
        className={`relative h-[75vh] w-[85vw] max-w-5xl overflow-hidden transition-all duration-300 ease-out ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.985]'} ${zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => zoomLevel === 1 && handleZoomIn()}
      >
        <div
          className="relative h-full w-full transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
          }}
        >
          <Image
            key={images[selectedIndex].src}
            src={images[selectedIndex].src}
            alt={images[selectedIndex].alt || productName}
            fill
            sizes="85vw"
            className="object-contain pointer-events-none select-none transition-opacity duration-200"
            priority
            draggable={false}
            unoptimized={shouldUseUnoptimizedImage(images[selectedIndex].src)}
          />
        </div>
      </div>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/50 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          {selectedIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-xl bg-black/50 p-2 backdrop-blur-sm">
          {images.map((image, index) => (
            <button
              key={`${image.id}-fullscreen-thumb-${index}`}
              type="button"
              onClick={() => {
                onSelectImage(index);
                handleResetZoom();
              }}
              className={`relative h-14 w-14 overflow-hidden border-2 transition-all hover:scale-105 ${
                selectedIndex === index 
                  ? "border-white shadow-lg shadow-white/20" 
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt || `${productName} ${index + 1}`}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized={shouldUseUnoptimizedImage(image.src)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  ), document.body);
}

interface ProductDetailProps {
  product: WCProduct;
  locale: Locale;
  relatedProducts?: WCProduct[];
  upsellProducts?: WCProduct[];
  addonForms?: WCPAForm[];
  englishCategorySlug?: string | null;
  localizedCategoryName?: string | null;
  hiddenGiftProductIds?: number[];
  freeShippingThreshold?: number | null;
  reviewsEnabled?: boolean;
}

export function ProductDetail({ product, locale, relatedProducts = [], upsellProducts = [], addonForms = [], englishCategorySlug, localizedCategoryName, hiddenGiftProductIds = [], freeShippingThreshold, reviewsEnabled = true }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [detailsMounted, setDetailsMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useSwipeBack();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mobileGalleryScrollerRef = useRef<HTMLDivElement | null>(null);
  const galleryThumbsRef = useRef<HTMLDivElement | null>(null);
  const prevVariationRef = useRef<number | null>(null);
  const [addonValues, setAddonValues] = useState<WCPAFormValues>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [addonPrice, setAddonPrice] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [addonErrors, setAddonErrors] = useState<Record<string, string>>({});
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [variationError, setVariationError] = useState<string | null>(null);
  const [variationStockBadgeEnabled, setVariationStockBadgeEnabled] = useState(true);
  const [variationImageEntries, setVariationImageEntries] = useState<{ variation_id: number; id: number; src: string; thumbnail: string; alt: string; attributes?: Record<string, string> }[]>([]);
  const [variationsWithPricing, setVariationsWithPricing] = useState<WCProductVariation[]>([]);
  const [showStickyAddToCart, setShowStickyAddToCart] = useState(false);
  const ctaSectionRef = useRef<HTMLDivElement | null>(null);
  const hasTrackedViewItemRef = useRef(false);
    const { addToCart } = useCart();
    const { currency, convertPrice, getCurrencyInfo } = useCurrency();
    const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId } = useWishlist();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const isRTL = locale === "ar";
    const currencyInfo = getCurrencyInfo();
  const convertedShippingThreshold = freeShippingThreshold ? Math.ceil(convertPrice(freeShippingThreshold)) : null;
  const rating = Number(product.average_rating || 0);
  const reviewCount = Number(product.review_count || 0);
  const showReviews = reviewsEnabled && reviewCount > 0;
  const freeShippingNotice = convertedShippingThreshold
    ? isRTL
      ? `مجاني الشحن عند الطلبات فوق ${currencyInfo.symbol}${convertedShippingThreshold}${currencyInfo.code === "AED" ? "" : ` ${currencyInfo.code}`}`
      : `Free shipping on orders over ${currencyInfo.symbol}${convertedShippingThreshold}`
    : "";

  useEffect(() => {
    setDetailsMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setShowStickyAddToCart(false);
      return;
    }

    const target = ctaSectionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyAddToCart(!entry.isIntersecting);
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -18% 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isMobileViewport]);

  const variationAttributes = useMemo(() => {
    if (product.type !== "variable") return [];
    return (product.attributes || []).filter((attr) => attr.has_variations && (attr.terms?.length ?? 0) > 0);
  }, [product.attributes, product.type]);

  const selectedVariation = useMemo(() => {
    if (product.type !== "variable") return null;
    if (variationAttributes.length === 0) return null;
    if ((product.variations?.length ?? 0) === 0) return null;

    const normalizeKey = (key: string) => key.toLowerCase().replace(/^attribute_/, "");
    const normalizeValue = (value: string) => decodeHtmlEntities(value).toLowerCase().trim();

    const allSelected = variationAttributes.every((attr) => {
      const key = attr.taxonomy || attr.name;
      return Boolean(selectedVariations[key]);
    });
    if (!allSelected) {
      console.log("[VariationMatch] Not all attributes selected:", { selectedVariations, variationAttributes: variationAttributes.map(a => a.name) });
      return null;
    }

    console.log("[VariationMatch] All selected, attempting match:", { selectedVariations, variationCount: product.variations.length });

    const found = product.variations.find((variation) => {
      const matches = variationAttributes.every((attr) => {
        const key = attr.taxonomy || attr.name;
        const selectedValue = selectedVariations[key];
        const selectedTermName = attr.terms.find((t) => t.slug === selectedValue)?.name || selectedValue;

        const vAttr = variation.attributes.find((a) => {
          const vKey = normalizeKey(a.name);
          const targetKey = normalizeKey(key);
          if (vKey === targetKey) return true;
          if (targetKey.startsWith("pa_") && vKey === targetKey.replace(/^pa_/, "")) return true;
          if (!targetKey.startsWith("pa_") && vKey === `pa_${targetKey}`) return true;
          if (vKey === `attribute_${targetKey}`) return true;
          return false;
        });

        if (!vAttr) {
          console.log(`[VariationMatch] No attr found for key="${key}" in variation ${variation.id}`);
          return false;
        }
        const vValue = normalizeValue(vAttr.value);
        const match = vValue === normalizeValue(selectedValue) || vValue === normalizeValue(selectedTermName);
        console.log(`[VariationMatch] Var ${variation.id}: key="${key}", vValue="${vValue}", selectedValue="${selectedValue}", selectedTermName="${selectedTermName}", match=${match}`);
        return match;
      });
      return matches;
    }) || null;

    if (found && variationsWithPricing.length > 0) {
      const pricingData = variationsWithPricing.find((v) => v.id === found.id);
      if (pricingData) {
        return { ...found, ...pricingData };
      }
    }

    console.log("[VariationMatch] Final result:", { found: found ? found.id : null });
    return found;
  }, [product.type, product.variations, selectedVariations, variationAttributes, variationsWithPricing]);

  const galleryImages = useMemo(() => {
    if (variationImageEntries.length === 0) return product.images;
    const existingSrcs = new Set(product.images.map((img) => img.src));
    const extras: { id: number; src: string; thumbnail: string; alt: string; srcset: string; sizes: string; name: string }[] = [];
    for (const v of variationImageEntries) {
      if (!existingSrcs.has(v.src)) {
        existingSrcs.add(v.src);
        extras.push({ id: v.id, src: v.src, thumbnail: v.thumbnail, alt: v.alt, srcset: "", sizes: "", name: "" });
      }
    }
    return [...product.images, ...extras];
  }, [product.images, variationImageEntries]);

  const variationImageIndexMap = useMemo(() => {
    // Map both by variation_id AND by attribute combination
    // This handles cases where variation IDs may be misaligned in WooCommerce
    const map: Record<number, number> = {};
    const attrMap: Record<string, number> = {};

    for (const entry of variationImageEntries) {
      const idx = galleryImages.findIndex((img) => img.src === entry.src);
      if (idx !== -1) {
        map[entry.variation_id] = idx;

        // Also map by attribute combination for fallback matching
        if (entry.attributes && typeof entry.attributes === 'object') {
          const attrKey = Object.entries(entry.attributes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`)
            .join('|');
          attrMap[attrKey] = idx;
        }
      }
    }
    return { byVariationId: map, byAttributes: attrMap };
  }, [variationImageEntries, galleryImages]);

  useEffect(() => {
    fetch("/api/product-detail-settings")
      .then((r) => r.json())
      .then((d) => { if (typeof d?.variationStockBadge === "boolean") setVariationStockBadgeEnabled(d.variationStockBadge); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (product.type !== "variable" || !product.id) return;
    fetch(`/api/variation-images?product_id=${product.id}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setVariationImageEntries(data); })
      .catch(() => {});
  }, [product.id, product.type]);

  // Fetch full variation data with pricing
  useEffect(() => {
    if (product.type !== "variable" || !product.id) return;
    fetch(`/api/product-variations?product_id=${product.id}&locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVariationsWithPricing(data);
      })
      .catch((err) => console.error("Failed to fetch variation pricing:", err));
  }, [product.id, product.type]);

  // Switch gallery image when variation changes
  useEffect(() => {
    if (selectedVariation && selectedVariation.id !== prevVariationRef.current) {
      prevVariationRef.current = selectedVariation.id;
      let imageIndex = -1;

      // Try variation ID first
      const byIdIndex = variationImageIndexMap.byVariationId[selectedVariation.id];
      imageIndex = byIdIndex ?? -1;

      // Fallback: match by attributes if variation ID didn't work
      if (imageIndex === -1 && variationAttributes.length > 0) {
        const attrKey = variationAttributes
          .map((attr) => {
            const key = attr.taxonomy || attr.name;
            // Strip "pa_" prefix to match API attribute keys (e.g., "pa_color" → "color")
            const normalizedKey = key.toLowerCase().replace(/^pa_/, '');
            return `${normalizedKey}=${(selectedVariations[key] || '').toLowerCase()}`;
          })
          .sort()
          .join('|');
        const byAttrIndex = variationImageIndexMap.byAttributes[attrKey];
        imageIndex = byAttrIndex ?? -1;
      }

      if (imageIndex !== -1) {
        setSelectedImage(imageIndex);
      }
    }
  }, [selectedVariation, variationImageIndexMap, selectedVariations, variationAttributes]);

  // Facebook Pixel: ViewContent
  useEffect(() => {
    const price = parseFloat(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit);
    fbTrackViewContent({
      productId: product.id,
      productName: decodeHtmlEntities(product.name),
      category: product.categories?.[0]?.name || "",
      value: price,
      currency: product.prices.currency_code || "AED",
    });
    if (!hasTrackedViewItemRef.current) {
      hasTrackedViewItemRef.current = true;
      trackAnalyticsEvent("view_item", {
        product_id: product.id,
        product_name: decodeHtmlEntities(product.name),
        category: product.categories?.[0]?.name || "",
        value: price,
        currency: product.prices.currency_code || "AED",
      });
    }
  }, [product.id, product.name, product.prices.price, product.prices.currency_minor_unit, product.prices.currency_code, product.categories]);

  const primaryCategory = product.categories?.[0];
  // Use English category slug for URLs (falls back to localized slug if English slug not available)
  const categorySlugForUrl = englishCategorySlug || primaryCategory?.slug;
  // Use the localized category name from the API (properly localized) or fall back to the embedded category name
  const categoryNameForBreadcrumb = localizedCategoryName || primaryCategory?.name;
  const breadcrumbItems = [
    { name: isRTL ? "المتجر" : "Shop", href: `/${locale}/shop` },
    ...(primaryCategory && categorySlugForUrl && categoryNameForBreadcrumb ? [{ name: decodeHtmlEntities(categoryNameForBreadcrumb), href: `/${locale}/category/${categorySlugForUrl}` }] : []),
    { name: decodeHtmlEntities(product.name), href: `/${locale}/product/${product.slug}` },
  ];
  const productDisplayName = formatProductDisplayName(product.name);
  const sanitizedShortDescription = product.short_description ? sanitizeProductDescription(product.short_description) : "";
  const sanitizedDescription = product.description ? sanitizeProductDescription(product.description) : "";
  const shortDescriptionText = normalizeHtmlContent(sanitizedShortDescription);
  const descriptionText = normalizeHtmlContent(sanitizedDescription);
  const shouldShowShortDescription = Boolean(sanitizedShortDescription);
  const descriptionHtml =
    sanitizedDescription && (!shortDescriptionText || descriptionText !== shortDescriptionText)
      ? sanitizedDescription
      : "";
  const characteristicAttributes = (product.attributes || []).filter((attr, index, attributes) => {
    const key = [
      decodeHtmlEntities(attr.name).trim().toLowerCase(),
      ...(attr.terms || []).map((term) => decodeHtmlEntities(term.name).trim().toLowerCase()),
    ].join("|");
    return attributes.findIndex((candidate) => {
      const candidateKey = [
        decodeHtmlEntities(candidate.name).trim().toLowerCase(),
        ...(candidate.terms || []).map((term) => decodeHtmlEntities(term.name).trim().toLowerCase()),
      ].join("|");
      return candidateKey === key;
    }) === index;
  });
  const productTags = (product.tags || []).filter((tag, index, tags) =>
    tags.findIndex((candidate) => candidate.slug === tag.slug) === index
  );
  const extraBadgeSlugs = BESTSELLER_PRODUCT_SLUGS.includes(product.slug) ? ["bestseller"] : [];

  const handleAddToCart = async () => {
    triggerHaptic();
    if (product.type === "variable" && variationAttributes.length > 0) {
      const allSelected = variationAttributes.every((attr) => {
        const key = attr.taxonomy || attr.name;
        return Boolean(selectedVariations[key]);
      });

      if (!allSelected) {
        setVariationError(isRTL ? "يرجى اختيار الخيارات" : "Please select options");
        return;
      }

      if (!selectedVariation) {
        setVariationError(isRTL ? "هذا الخيار غير متوفر" : "This option is unavailable");
        return;
      }
    }

    if (!product.is_in_stock || !product.is_purchasable || !hasDisplayPrice(product, selectedVariation)) {
      return;
    }

    setIsAddingToCart(true);
    try {
      const hasAddonValues = Object.keys(addonValues).length > 0;
      const itemData = hasAddonValues && addonForms && addonForms.length > 0 ? { wcpa_data: addonValues } : undefined;

      const variationId = product.type === "variable" ? selectedVariation?.id : undefined;
      const variation =
        product.type === "variable" && variationAttributes.length > 0
          ? Object.fromEntries(
              variationAttributes.map((attr) => {
                const key = attr.taxonomy || attr.name;
                // Slugify: lowercase, strip attribute_ prefix, replace spaces with hyphens
                const normalizedKey = key.toLowerCase().replace(/^attribute_/, "").replace(/\s+/g, "-");
                return [`attribute_${normalizedKey}`, selectedVariations[key]];
              })
            )
          : undefined;

      await addToCart(product.id, quantity, variationId, variation, itemData);
      setIsAddedToCart(true);
      setTimeout(() => setIsAddedToCart(false), 1500);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isWishlisted = isInWishlist(product.id);

  const handleWishlistToggle = async () => {
    triggerHaptic();
    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }
    
    setIsAddingToWishlist(true);
    try {
      if (isWishlisted) {
        const itemId = getWishlistItemId(product.id);
        await removeFromWishlist(product.id, itemId);
      } else {
        await addToWishlist(product.id);
      }
    } catch (error) {
      console.error("Failed to update wishlist:", error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const isOutOfStock = !product.is_in_stock;
  const hasPrice = hasDisplayPrice(product, selectedVariation);
  const canPurchaseProduct = !isOutOfStock && product.is_purchasable && hasPrice;
  const images = galleryImages;
  const imageCount = images.length;
  const stickyImage = images[selectedImage] || images[0];

  // Check if the selected variation is out of stock
  const isSelectedVariationOutOfStock = selectedVariation
    ? selectedVariation.stock_status === "outofstock" || (selectedVariation.purchasable === false && selectedVariation.stock_status !== "onbackorder")
    : false;

  const canAddToCart =
    product.type !== "variable" ||
    variationAttributes.length === 0 ||
    (variationAttributes.every((attr) => Boolean(selectedVariations[attr.taxonomy || attr.name])) && Boolean(selectedVariation) && !isSelectedVariationOutOfStock);

  useEffect(() => {
    if (selectedImage < imageCount) return;
    setSelectedImage(0);
  }, [imageCount, selectedImage]);

  const selectGalleryImage = useCallback((index: number, options?: { openFullscreen?: boolean }) => {
    const maxIndex = Math.max(imageCount - 1, 0);
    const nextIndex = Math.min(maxIndex, Math.max(0, index));

    setSelectedImage(nextIndex);
    if (options?.openFullscreen) {
      setIsFullscreen(true);
    }

    const scroller = mobileGalleryScrollerRef.current;
    if (scroller?.clientWidth) {
      scroller.scrollTo({ left: nextIndex * scroller.clientWidth, behavior: "smooth" });
    }
  }, [imageCount]);

  useEffect(() => {
    if (!isMobileViewport) return;

    const scroller = mobileGalleryScrollerRef.current;
    if (!scroller || !scroller.clientWidth) return;

    const targetLeft = selectedImage * scroller.clientWidth;
    if (Math.abs(scroller.scrollLeft - targetLeft) > 2) {
      scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }, [imageCount, isMobileViewport, selectedImage]);

  const handleMobileGalleryScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (!clientWidth || imageCount === 0) return;

    const nextIndex = Math.min(imageCount - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
    if (nextIndex !== selectedImage) {
      setSelectedImage(nextIndex);
    }
  }, [imageCount, selectedImage]);

  useEffect(() => {
    const rail = galleryThumbsRef.current;
    if (!rail || imageCount <= 1) return;

    const activeThumb = rail.querySelector<HTMLElement>(`[data-gallery-thumb="${selectedImage}"]`);
    if (!activeThumb) return;

    const nextLeft =
      rail.scrollWidth > rail.clientWidth
        ? activeThumb.offsetLeft - rail.clientWidth / 2 + activeThumb.clientWidth / 2
        : rail.scrollLeft;
    const nextTop =
      rail.scrollHeight > rail.clientHeight
        ? activeThumb.offsetTop - rail.clientHeight / 2 + activeThumb.clientHeight / 2
        : rail.scrollTop;

    if (nextLeft !== rail.scrollLeft || nextTop !== rail.scrollTop) {
      rail.scrollTo({ left: nextLeft, top: nextTop, behavior: "smooth" });
    }
  }, [imageCount, selectedImage]);

  const renderImageGallery = () => {
    if (imageCount === 0) {
      return (
        <div className="relative aspect-[10/11] w-full overflow-hidden bg-[#f8f3ef]">
          <div className="flex h-full items-center justify-center">
            <span className="text-gray-400">{isRTL ? "لا توجد صورة" : "No image"}</span>
          </div>
        </div>
      );
    }

    const showThumbnails = imageCount > 1;


    const activeImage = images[selectedImage] ?? images[0];
    const goToPreviousImage = () => {
      selectGalleryImage(selectedImage <= 0 ? imageCount - 1 : selectedImage - 1);
    };
    const goToNextImage = () => {
      selectGalleryImage(selectedImage >= imageCount - 1 ? 0 : selectedImage + 1);
    };

    if (isMobileViewport) {
      return (
        <div className="space-y-3" data-product-gallery="mobile">
          <div className="relative">
            <div
              ref={mobileGalleryScrollerRef}
              onScroll={handleMobileGalleryScroll}
              data-product-gallery-scroller
              className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth bg-white [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((image, index) => (
                <button
                  key={`${image.id}-${index}`}
                  type="button"
                  onClick={() => selectGalleryImage(index, { openFullscreen: true })}
                  className="group relative block min-w-full snap-center overflow-hidden bg-white"
                  aria-label={`View image ${index + 1}`}
                >
                  <div className="relative aspect-[4/5] w-full min-[430px]:aspect-[10/11]">
                    <Image
                      src={image.src}
                      alt={image.alt || `${productDisplayName} image ${index + 1}`}
                      fill
                      data-product-gallery-image={index}
                      sizes="100vw"
                      className="object-contain px-4 py-5"
                      priority={index === 0}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      unoptimized={shouldUseUnoptimizedImage(image.src)}
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-black/10 to-transparent px-4 pb-4 pt-12 text-white">
                      <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                        {index + 1} / {imageCount}
                      </span>
                      <span className="rounded-full bg-white/90 p-2 text-brand-primary shadow-sm">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {showThumbnails && (
            <div className="relative px-3 pb-1">
              <button
                type="button"
                onClick={goToPreviousImage}
                className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_10px_24px_rgba(20,15,10,0.12)]"
                aria-label={isRTL ? "الصورة السابقة" : "Previous image"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div
                ref={galleryThumbsRef}
                className="mx-9 flex snap-x gap-2 overflow-x-auto rounded-full border border-brand-border/70 bg-brand-ivory/95 p-1.5 shadow-[0_12px_28px_rgba(20,15,10,0.1)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {images.map((image, index) => (
                  <button
                    key={`${image.id}-mobile-thumb-${index}`}
                    type="button"
                    onClick={() => selectGalleryImage(index)}
                    data-gallery-thumb={index}
                    className={cn(
                      "relative h-14 w-14 shrink-0 snap-center overflow-hidden rounded-md border bg-white transition-all",
                      selectedImage === index
                        ? "border-brand-primary ring-2 ring-brand-primary/15"
                        : "border-brand-border/70 opacity-75"
                    )}
                    aria-label={`View image ${index + 1}`}
                    aria-current={selectedImage === index ? "true" : "false"}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || `${productDisplayName} thumbnail ${index + 1}`}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      unoptimized={shouldUseUnoptimizedImage(image.src)}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={goToNextImage}
                className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_10px_24px_rgba(20,15,10,0.12)]"
                aria-label={isRTL ? "الصورة التالية" : "Next image"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      );
    }

    const activeImageSrc = activeImage.src;

    return (
      <div
        className={cn(
          "grid gap-3",
          showThumbnails ? "md:grid-cols-[82px_minmax(0,1fr)] lg:grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-1"
        )}
        data-product-gallery="desktop"
      >
        {false && showThumbnails && (
          <div className="hidden">
            {images.map((image, index) => (
              <button
                key={`${image.id}-thumb-${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={cn(
                  "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border bg-white transition-all lg:h-[86px] lg:w-full",
                  selectedImage === index
                    ? "border-brand-primary ring-2 ring-brand-primary/10"
                    : "border-brand-border/70 opacity-70 hover:border-brand-primary/45 hover:opacity-100"
                )}
                aria-label={isRTL ? `عرض الصورة ${index + 1}` : `View image ${index + 1}`}
                aria-current={selectedImage === index ? "true" : "false"}
              >
                <Image
                  src={image.src}
                  alt={image.alt || `${productDisplayName} thumbnail ${index + 1}`}
                  fill
                  sizes="86px"
                  className="object-contain p-1.5"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized={shouldUseUnoptimizedImage(image.src)}
                />
              </button>
            ))}
          </div>
        )}

        {showThumbnails && (
          <div className="relative min-w-0 md:col-start-1 md:row-start-1">
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-1/2 top-1.5 z-10 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_12px_28px_rgba(20,15,10,0.12)] transition hover:border-brand-primary/45 hover:bg-white md:flex"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4 rotate-90" />
            </button>
            <div
              ref={galleryThumbsRef}
              className="flex max-h-[calc(100vh-180px)] snap-y flex-col gap-2 overflow-y-auto rounded-lg border border-brand-border/70 bg-brand-ivory/95 px-1.5 py-11 shadow-[0_14px_34px_rgba(20,15,10,0.1)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((image, index) => (
                <button
                  key={`${image.id}-desktop-thumb-${index}`}
                  type="button"
                  onClick={() => selectGalleryImage(index)}
                  data-gallery-thumb={index}
                  className={cn(
                    "relative h-[76px] w-full shrink-0 snap-center overflow-hidden rounded-md border bg-white transition-all lg:h-[86px]",
                    selectedImage === index
                      ? "border-brand-primary ring-2 ring-brand-primary/15"
                      : "border-brand-border/70 opacity-70 hover:border-brand-primary/45 hover:opacity-100"
                  )}
                  aria-label={`View image ${index + 1}`}
                  aria-current={selectedImage === index ? "true" : "false"}
                >
                  <Image
                    src={image.src}
                    alt={image.alt || `${productDisplayName} thumbnail ${index + 1}`}
                    fill
                    sizes="86px"
                    className="object-contain p-1.5"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    unoptimized={shouldUseUnoptimizedImage(image.src)}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute bottom-1.5 left-1/2 z-10 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_12px_28px_rgba(20,15,10,0.12)] transition hover:border-brand-primary/45 hover:bg-white md:flex"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4 rotate-90" />
            </button>
          </div>
        )}

        <div className={cn("relative min-w-0", showThumbnails ? "md:col-start-2 md:row-start-1" : "")}>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            data-product-gallery-main
            className="group relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-lg border border-brand-border/70 bg-white shadow-[0_18px_42px_rgba(20,15,10,0.08)]"
          >
            <Image
              key={`${activeImage.id}-${activeImageSrc}`}
              src={activeImageSrc}
              alt={activeImage.alt || productDisplayName}
              fill
              data-product-gallery-image={selectedImage}
              sizes="(max-width: 1023px) 100vw, 54vw"
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.025] sm:p-6 lg:p-8"
              priority={selectedImage === 0}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              unoptimized={shouldUseUnoptimizedImage(activeImageSrc)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/10 group-hover:opacity-100">
              <ZoomIn className="h-7 w-7 text-white drop-shadow-lg" />
            </div>
            {showThumbnails && (
              <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {selectedImage + 1} / {imageCount}
              </span>
            )}
          </button>

          {showThumbnails && (
            <>
              <button
                type="button"
                onClick={goToPreviousImage}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-border/70 bg-brand-ivory/95 p-2 text-brand-primary shadow-md transition hover:border-brand-primary/45 hover:bg-white"
                aria-label={isRTL ? "الصورة السابقة" : "Previous image"}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-brand-border/70 bg-brand-ivory/95 p-2 text-brand-primary shadow-md transition hover:border-brand-primary/45 hover:bg-white"
                aria-label={isRTL ? "الصورة التالية" : "Next image"}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute right-4 top-4 z-10 rounded-full border border-brand-border/70 bg-brand-ivory/95 p-2 text-brand-primary shadow-sm transition hover:scale-105 hover:shadow-md"
            aria-label={isRTL ? "تكبير الصورة" : "Zoom image"}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {false && showThumbnails && (
          <div className="hidden">
            <button
              type="button"
              onClick={goToPreviousImage}
              className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_12px_28px_rgba(20,15,10,0.12)] transition hover:border-brand-primary/45 hover:bg-white"
              aria-label={isRTL ? "الصورة السابقة" : "Previous image"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex snap-x gap-2 overflow-x-auto rounded-full border border-brand-border/70 bg-brand-ivory/95 px-11 py-1.5 shadow-[0_14px_34px_rgba(20,15,10,0.1)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, index) => (
                <button
                  key={`${image.id}-thumb-slider-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative h-[68px] w-[68px] shrink-0 snap-center overflow-hidden rounded-md border bg-white transition-all lg:h-[76px] lg:w-[76px]",
                    selectedImage === index
                      ? "border-brand-primary ring-2 ring-brand-primary/15"
                      : "border-brand-border/70 opacity-70 hover:border-brand-primary/45 hover:opacity-100"
                  )}
                  aria-label={isRTL ? `عرض الصورة ${index + 1}` : `View image ${index + 1}`}
                  aria-current={selectedImage === index ? "true" : "false"}
                >
                  <Image
                    src={image.src}
                    alt={image.alt || `${productDisplayName} thumbnail ${index + 1}`}
                    fill
                    sizes="76px"
                    className="object-contain p-1.5"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    unoptimized={shouldUseUnoptimizedImage(image.src)}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={goToNextImage}
              className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brand-border/70 bg-brand-ivory/95 text-brand-primary shadow-[0_12px_28px_rgba(20,15,10,0.12)] transition hover:border-brand-primary/45 hover:bg-white"
              aria-label={isRTL ? "الصورة التالية" : "Next image"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-transparent text-brand-primary">
      <div className="mx-auto w-full max-w-[80rem] space-y-8">
        <div className="w-full px-4 pb-3 pt-4 md:px-6 md:pb-4 md:pt-6 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <Breadcrumbs items={breadcrumbItems} locale={locale} contained={false} />
            <SocialShareModal
              url={`${siteConfig.url}/${locale}/product/${product.slug}`}
              title={decodeHtmlEntities(product.name)}
              locale={locale}
              className="shrink-0"
            />
          </div>
        </div>

        <div className="w-full px-0">
          <div className="grid w-full gap-x-8 gap-y-7 px-4 pb-8 md:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-x-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]">
        {/* Product Gallery */}
        <div className="min-w-0">
          {renderImageGallery()}
        </div>

        {/* Product Info */}
        <aside className="min-w-0 pb-8 pt-2 text-brand-primary md:pb-10 md:pt-6 lg:pt-6">
          <div className="rounded-3xl border border-brand-border/65 bg-white p-5 shadow-[0_14px_40px_rgba(20,15,10,0.07)] md:p-7">
            <div className="mx-auto flex w-full flex-col items-stretch space-y-0">
          {/* Category + Brand row */}
          <div className="mb-4 flex w-full flex-wrap items-center gap-x-2 gap-y-2 self-start">
            {primaryCategory && categorySlugForUrl && (
              <Link
                href={`/${locale}/category/${categorySlugForUrl}`}
                className="rounded-full border border-brand-border/70 bg-brand-ivory px-3 py-1.5 text-[10px] font-semibold uppercase leading-none text-brand-primary transition-colors hover:border-brand-primary/45 hover:bg-brand-beige"
              >
                {decodeHtmlEntities(primaryCategory.name)}
              </Link>
            )}
            {product.brands && product.brands.length > 0 && (
              <>
                {primaryCategory && categorySlugForUrl && (
                  <span className="text-[11px] text-brand-primary/30">/</span>
                )}
                <span className="text-[11px] font-semibold uppercase text-brand-muted">
                  {product.brands.map(b => decodeHtmlEntities(b.name)).join(", ")}
                </span>
              </>
            )}
          </div>

          {/* Title */}
            <h1 className="font-title w-full text-[24px] leading-tight text-brand-primary sm:text-[28px] md:text-[32px] lg:text-[38px]">
              {productDisplayName}
            </h1>

          {showReviews && (
            <a
              href="#reviews"
              className={`mt-3 inline-flex items-center gap-2 text-sm font-normal text-brand-primary/70 transition-opacity hover:opacity-70 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${rating >= star ? "fill-brand-gold text-brand-gold" : "text-brand-primary/15"}`}
                  />
                ))}
              </div>
              <span>{rating.toFixed(1)}</span>
              <span>({reviewCount})</span>
            </a>
          )}

          {/* Price and stock indicator */}
          <div className="mt-5 rounded-2xl border border-brand-border/70 bg-brand-ivory/45 p-4">
            {(() => {
              const displayPrice = getDisplayPrice(product, selectedVariation);
              const isOnSale = selectedVariation?.sale_price || product.on_sale;
              return !hasPrice ? (
                <span className="text-lg font-normal text-brand-primary/45">
                  {isRTL ? "غير متاح" : "Unavailable"}
                </span>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-4">
                    <FormattedPrice
                      price={parseInt(displayPrice.price) / Math.pow(10, displayPrice.currency_minor_unit)}
                      className="text-3xl font-semibold text-brand-primary sm:text-[2rem]"
                      iconSize="sm"
                    />
                    {isOnSale && (
                      <FormattedPrice
                        price={parseInt(displayPrice.regular_price || displayPrice.price) / Math.pow(10, displayPrice.currency_minor_unit)}
                        className="text-sm text-brand-primary/40"
                        iconSize="xs"
                        strikethrough
                      />
                    )}
                  </div>
                  {!isOutOfStock && (
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span>{isRTL ? "متوفر" : "In stock"}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ProductBadges
                tags={productTags}
                locale={locale as Locale}
                extraTagSlugs={extraBadgeSlugs}
                variant="detail"
              />
            </div>
          </div>


          {/* Trust, reward and urgency block */}
          <div className="rounded-2xl border border-brand-border/70 bg-white/80 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary">
                {isOutOfStock ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                )}
                <span>{isOutOfStock ? (isRTL ? "غير متوفر" : "Out of stock") : (isRTL ? "متوفر الآن" : "In stock")}</span>
              </div>

              {!isOutOfStock && hasPrice && (
                <>
                  <LoyaltyPointsBadge
                    priceAed={parseInt(getDisplayPrice(product, selectedVariation).price) / Math.pow(10, product.prices.currency_minor_unit)}
                    isAr={isRTL}
                  />
                  {product.on_sale && product.sale_end && <CountdownTimer endDate={product.sale_end} locale={locale} />}
                </>
              )}

          {/* Guide links — size guide modal only (scent guide is in Description accordion) */}
          </div>
          </div>

          {/* Guide links â€” size guide modal only (scent guide is in Description accordion) */}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <ClothingSizeGuideModal productId={product.id} locale={locale} />
            {freeShippingNotice && (
              <p className="text-xs font-medium text-brand-muted">
                {freeShippingNotice}
              </p>
            )}
          </div>

          {/* Notes / key info shown under price */}
          {shouldShowShortDescription && (
            <div
              className="mt-5 text-sm leading-6 text-brand-primary/75"
              dangerouslySetInnerHTML={{ __html: sanitizedShortDescription }}
            />
          )}

          {/* Stock status - inline with low stock warning */}
          {isOutOfStock && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="error">
                  {isRTL ? "غير متوفر" : "Out of Stock"}
                </Badge>
              </div>
              <BackInStockAlert productId={product.id} locale={locale} />
            </div>
          )}
          {!isOutOfStock && product.low_stock_remaining && product.low_stock_remaining < 10 && (
            <div className="mt-7 border-b border-brand-border/70 pb-6">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#b36b00]">
                <span className="h-2 w-2 rounded-full bg-[#f28c00]" />
                <span>
                  {isRTL
                    ? `${product.low_stock_remaining} قطع متبقية فقط`
                    : `Only ${product.low_stock_remaining} left`}
                </span>
              </div>
              <div className="mt-3 h-0.5 w-56 bg-brand-border">
                <div className="h-full w-8 bg-[#b36b00]" />
              </div>
            </div>
          )}

          {/* Product Addons - WCPA Integration */}
          {addonForms && addonForms.length > 0 && (
            <div className="mt-6 border-t border-brand-border/70 pt-5">
              <ProductAddons
                forms={addonForms}
                locale={locale}
                basePrice={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                onValuesChange={(values, price) => {
                  setAddonValues(values);
                  setAddonPrice(price);
                }}
                onValidationChange={(isValid, errors) => {
                  setAddonErrors(errors);
                }}
              />
            </div>
          )}

          {product.type === "variable" && variationAttributes.length > 0 && (
            <div className="mt-5 space-y-4 border-t border-brand-border/70 pt-5">
              {variationAttributes.map((attr) => {
                const key = attr.taxonomy || attr.name;
                const selectedSlug = selectedVariations[key];
                return (
                  <div key={key}>
                    <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
                      {decodeHtmlEntities(attr.name)}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {attr.terms.map((term, index) => {
                        const isSelected = selectedSlug === term.slug;
                        const variations = variationsWithPricing.length > 0 ? variationsWithPricing : product.variations || [];
                        const hasStockData = variationsWithPricing.length > 0;

                        // Smart cross-out: consider other selected attributes to only disable
                        // options that lead to no valid purchasable combination
                        const isOptionUnavailable = hasStockData && !variations.some((v) => {
                          // Check this attribute matches the term
                          const vAttr = v.attributes.find((a) => {
                            const vKey = (a.name || "").toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "");
                            const targetKey = (key || "").toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "");
                            return vKey === targetKey;
                          });
                          const vValue = ((vAttr as { value?: string })?.value || "").toLowerCase().trim();
                          const termValue = (term.name || "").toLowerCase().trim();
                          if (vValue !== termValue) return false;

                          // Check variation is in stock / purchasable
                          const isAvailable = v.stock_status === "instock" || v.stock_status === "onbackorder" || !v.stock_status;
                          if (!isAvailable) return false;

                          // Also check other currently selected attributes match
                          for (const otherAttr of variationAttributes) {
                            const otherKey = otherAttr.taxonomy || otherAttr.name;
                            if (otherKey === key) continue;
                            const otherSelected = selectedVariations[otherKey];
                            if (!otherSelected) continue;
                            const otherTermName = otherAttr.terms.find(t => t.slug === otherSelected)?.name || otherSelected;
                            const vOtherAttr = v.attributes.find((a) => {
                              const aKey = (a.name || "").toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "");
                              const tKey = (otherKey || "").toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "");
                              return aKey === tKey;
                            });
                            const vOtherValue = ((vOtherAttr as { value?: string })?.value || "").toLowerCase().trim();
                            if (vOtherValue && vOtherValue !== otherTermName.toLowerCase().trim() && vOtherValue !== otherSelected.toLowerCase().trim()) return false;
                          }

                          return true;
                        });
                        const isOutOfStock = isOptionUnavailable;
                        return (
                          <button
                            key={`${term.slug}-${index}`}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => {
                              if (!isOutOfStock) {
                                setSelectedVariations((prev) => ({ ...prev, [key]: term.slug }));
                                setVariationError(null);
                              }
                            }}
                            className={cn(
                              "rounded-[999px] border px-4 py-2 text-xs font-semibold transition-colors",
                              isOutOfStock
                                ? "cursor-not-allowed border-brand-border/70 bg-transparent text-brand-primary/30 line-through opacity-50"
                                : isSelected
                                ? "border-brand-primary bg-brand-primary text-white shadow-[0_10px_20px_rgba(24,18,10,0.2)]"
                                : "border-brand-border/80 bg-white text-brand-primary hover:border-brand-primary/80"
                            )}
                          >
                            {decodeHtmlEntities(term.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {variationError && <p className="text-sm font-medium text-red-500">{variationError}</p>}
              {/* Out-of-stock message when selected variation is unavailable */}
              {selectedVariation && isSelectedVariationOutOfStock && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-sm font-medium text-red-700">
                    {isRTL ? "هذا الخيار غير متوفر حالياً" : "This combination is currently out of stock"}
                  </span>
                </div>
              )}
              {selectedVariation && !isSelectedVariationOutOfStock && variationStockBadgeEnabled && (
                <VariationStockBadge variation={selectedVariation} isAr={isRTL} />
              )}
            </div>
          )}

          {/* Add to Cart Section */}
          <div ref={ctaSectionRef} className="flex flex-col gap-4 pt-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(150px,1fr)_auto]">
              <div className="flex h-12 items-center justify-between overflow-hidden rounded-full border border-brand-border/80 bg-brand-ivory/80">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="flex h-12 w-10 items-center justify-center text-brand-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isRTL ? "تقليل الكمية" : "Decrease quantity"}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const max = product.add_to_cart.maximum || 99;
                    setQuantity(Math.min(Math.max(1, val), max));
                  }}
                  disabled={isOutOfStock}
                  className="h-12 w-12 bg-transparent text-center text-sm font-normal text-brand-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  min={1}
                  max={product.add_to_cart.maximum || 99}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(quantity + 1, product.add_to_cart.maximum || 99))}
                  disabled={isOutOfStock || quantity >= (product.add_to_cart.maximum || 99)}
                  className="flex h-12 w-10 items-center justify-center text-brand-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isRTL ? "زيادة الكمية" : "Increase quantity"}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleWishlistToggle}
                disabled={isAddingToWishlist}
                className={`flex h-12 min-w-[56px] items-center justify-center rounded-full border border-brand-border/80 bg-white text-sm font-semibold text-brand-primary transition-colors duration-300 hover:border-brand-primary hover:bg-brand-primary hover:text-white ${isAddingToWishlist ? "cursor-not-allowed opacity-50" : ""}`}
                aria-label={isWishlisted ? (isRTL ? "إزالة من المفضلة" : "Remove from wishlist") : (isRTL ? "أضف إلى المفضلة" : "Add to wishlist")}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            <ProductAddToCartButton
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchaseProduct || isSelectedVariationOutOfStock || isAddingToCart || !canAddToCart}
              isAdded={isAddedToCart}
              isLoading={isAddingToCart}
              showIcon
              className="h-12 w-full rounded-full text-sm font-semibold uppercase tracking-[0.08em]"
            >
              {isAddedToCart ? (
                <><Check className="h-4 w-4" />{isRTL ? "تمت الإضافة!" : "added"}</>
              ) : isAddingToCart ? (
                <>{isRTL ? "جاري الإضافة..." : "adding..."}</>
              ) : isSelectedVariationOutOfStock ? (
                <>{isRTL ? "غير متوفر" : "out of stock"}</>
              ) : (
                <>{isRTL ? "أضف إلى السلة" : "add to cart"}</>
              )}
            </ProductAddToCartButton>
          </div>

          <div className="mt-5">
          {hasPrice && (
            <PaymentWidgets
              price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
              currency={currency}
              locale={locale}
            />
          )}
          </div>

          {detailsMounted && (
            <div className="mt-8 border-t border-brand-border/70 pt-6">
              <div className="mt-0 border-t border-brand-border/70 pt-0">
                <AccordionSection title={isRTL ? "الوصف" : "Description"}>
                  {descriptionHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-600"
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                  ) : !shouldShowShortDescription ? (
                    <p className="text-sm text-gray-500">
                      {isRTL ? "لا يوجد وصف متاح" : "No description available"}
                    </p>
                  ) : null}
                  <ScentGuideContent locale={locale as Locale} />
                </AccordionSection>

                <AccordionSection title={isRTL ? "الخصائص" : "Characteristics"}>
                  <div className="space-y-2 text-sm">
                    {primaryCategory && (
                      <div className="flex justify-between gap-4">
                        <span className="shrink-0 text-brand-muted">{isRTL ? "الفئة" : "Category"}</span>
                        <span className="text-right text-brand-primary">{decodeHtmlEntities(primaryCategory.name)}</span>
                      </div>
                    )}
                    {product.sku && (
                      <div className="flex justify-between gap-4">
                        <span className="shrink-0 text-brand-muted">{isRTL ? "رمز المنتج" : "SKU"}</span>
                        <span className="text-right text-brand-primary">{product.sku}</span>
                      </div>
                    )}
                    {characteristicAttributes.length > 0 && (
                      characteristicAttributes.map((attr) => (
                        <div key={attr.id} className="flex justify-between gap-4">
                          <span className="shrink-0 text-brand-muted">{decodeHtmlEntities(attr.name)}</span>
                          <span className="text-right text-brand-primary">{attr.terms?.map(t => decodeHtmlEntities(t.name)).join(", ")}</span>
                        </div>
                      ))
                    )}
                    {productTags.length > 0 && (
                      <div className="mt-1 border-t border-brand-border/70 pt-3">
                        <span className="mb-3 block text-brand-muted">{isRTL ? "الوسوم" : "Tags"}</span>
                        <div className="flex flex-wrap gap-2">
                          {productTags.map(t => (
                            <span
                              key={t.slug}
                              className="inline-flex items-center rounded-full bg-brand-beige px-2.5 py-0.5 text-xs font-medium text-brand-primary ring-1 ring-inset ring-brand-primary"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              </div>
            </div>
          )}
          </div>
          </div>
        </aside>
      </div>

       {showReviews && (
        <div id="reviews">
          <ProductReviews productId={product.id} locale={locale} />
        </div>
      )}

      {/* Upsell Products (from WooCommerce Linked Products) */}
      {upsellProducts.length > 0 && (
        <RelatedProducts
          products={upsellProducts}
          currentProductId={product.id}
          locale={locale}
          title={isRTL ? "منتجات موصى بها" : "Recommended Products"}
          subtitle={isRTL ? "منتجات مختارة لك" : "Hand-picked for you"}
        />
      )}

      {/* Related Products (category-based) */}
      <div className="pb-16">
        <RelatedProducts
          products={relatedProducts}
          currentProductId={product.id}
          locale={locale}
        />
      </div>

      {/* Recently Viewed Products */}
      <RecentlyViewed
        currentProductId={product.id}
        locale={locale}
        hiddenGiftProductIds={hiddenGiftProductIds}
      />

      {/* Fullscreen Gallery Modal */}
      {isFullscreen && images.length > 0 && (
        <FullscreenGallery
          images={images}
          selectedIndex={selectedImage}
          onClose={() => setIsFullscreen(false)}
          onSelectImage={selectGalleryImage}
          productName={productDisplayName}
          isRTL={isRTL}
          isMobile={isMobileViewport}
        />
      )}

      {/* Sticky Add to Cart Bar */}
      <div
        className={cn(
          "fixed inset-x-3 bottom-20 z-40 rounded-[20px] border border-brand-border/70 bg-white/95 px-3 py-3 shadow-[0_16px_44px_rgba(20,15,10,0.18)] backdrop-blur-xl transition-all duration-300 md:hidden",
          !canPurchaseProduct && "hidden",
          showStickyAddToCart ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-3">
            {stickyImage && (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white sm:h-14 sm:w-14">
                <Image
                  src={stickyImage.src || stickyImage.thumbnail}
                  alt={product.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  unoptimized={shouldUseUnoptimizedImage(stickyImage.src || stickyImage.thumbnail)}
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-normal leading-tight tracking-normal text-brand-primary sm:text-[13px]">{productDisplayName}</p>
              {hasPrice ? (
                <FormattedPrice
                  price={parseInt(product.prices.price) / Math.pow(10, product.prices.currency_minor_unit)}
                  className="text-xs font-normal text-brand-primary/80 sm:text-sm"
                  iconSize="sm"
                />
              ) : (
                <span className="text-sm font-normal text-brand-primary/45">{isRTL ? "غير متاح" : "Unavailable"}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:shrink-0 sm:gap-3">
            <div className="flex h-10 items-center overflow-hidden rounded-full border border-brand-primary bg-transparent sm:h-10">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center text-brand-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10"
                aria-label={isRTL ? "تقليل الكمية" : "Decrease quantity"}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
                <span className="w-10 text-center text-sm font-normal text-brand-primary sm:w-10">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(quantity + 1, product.add_to_cart.maximum || 99))}
                disabled={quantity >= (product.add_to_cart.maximum || 99)}
                className="flex h-10 w-10 items-center justify-center text-brand-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10"
                aria-label={isRTL ? "زيادة الكمية" : "Increase quantity"}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <ProductAddToCartButton
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchaseProduct || isSelectedVariationOutOfStock || isAddingToCart || !canAddToCart}
              isAdded={isAddedToCart}
              isLoading={isAddingToCart}
              className="h-10 min-w-0 rounded-full px-4 text-xs font-bold uppercase tracking-[0.1em] sm:h-10 sm:min-w-[180px] sm:px-5"
            >
              {isAddedToCart ? (
                <><Check className="h-4 w-4" />{isRTL ? "تمت الإضافة!" : "added"}</>
              ) : isSelectedVariationOutOfStock ? (
                <>{isRTL ? "غير متوفر" : "out of stock"}</>
              ) : (
                <><Plus className="h-4 w-4" />{isAddingToCart ? (isRTL ? "جاري الإضافة..." : "adding...") : (isRTL ? "أضف إلى السلة" : "add to cart")}</>
              )}
            </ProductAddToCartButton>
          </div>



      </div>
      </div>
      </div>
      </div>
      </div>
  );
}
