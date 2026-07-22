import type { Locale } from "@/config/site";
import { decodeHtmlEntities } from "@/lib/utils";

interface ProductImageAltOptions {
  productName: string;
  categoryName?: string;
  imageIndex?: number;
  locale: Locale;
  lifestyle?: boolean;
}

export function buildProductImageAlt({
  productName,
  categoryName,
  imageIndex = 0,
  locale,
  lifestyle = false,
}: ProductImageAltOptions): string {
  const name = decodeHtmlEntities(productName).trim();
  const category = decodeHtmlEntities(categoryName || "").trim();
  const isSecondary = lifestyle || imageIndex > 0;

  if (locale === "ar") {
    const view = isSecondary ? "صورة عطرية إضافية" : "عبوة المنتج";
    return [name, category, view].filter(Boolean).join(" - ");
  }

  const view = isSecondary ? "lifestyle fragrance image" : "product bottle";
  return [name, category, view].filter(Boolean).join(" - ");
}
