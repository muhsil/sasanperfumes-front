import type { Locale } from "@/config/site";
import type { MarketCode } from "@/config/market";

interface CategorySeoContent {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
}

// CMS content remains the primary source. This record supports optional
// hand-authored overrides, while the helper below guarantees useful copy for
// new or incomplete categories in every market.
export const categorySeoContent: Record<string, CategorySeoContent> = {};

const MARKET_LOCATION: Record<MarketCode, { en: string; ar: string; citiesEn: string; citiesAr: string }> = {
  intl: { en: "the UAE", ar: "الإمارات", citiesEn: "Dubai, Abu Dhabi, Sharjah, and across the UAE", citiesAr: "دبي وأبوظبي والشارقة وجميع أنحاء الإمارات" },
  qa: { en: "Qatar", ar: "قطر", citiesEn: "Doha and across Qatar", citiesAr: "الدوحة وجميع أنحاء قطر" },
  om: { en: "Oman", ar: "عُمان", citiesEn: "Muscat and across Oman", citiesAr: "مسقط وجميع أنحاء عُمان" },
  sa: { en: "Saudi Arabia", ar: "السعودية", citiesEn: "Riyadh, Jeddah, and across Saudi Arabia", citiesAr: "الرياض وجدة وجميع أنحاء السعودية" },
};

const CATEGORY_FOCUS: Record<string, { en: string; ar: string }> = {
  "all-over-spray": { en: "refreshing all-over sprays and long-lasting body fragrances", ar: "بخاخات الجسم المنعشة والعطور اليومية الثابتة" },
  "gift-set": { en: "luxury perfume gift sets for birthdays, celebrations, and special occasions", ar: "أطقم هدايا العطور الفاخرة لأعياد الميلاد والاحتفالات والمناسبات" },
  "sasan-hair-mist": { en: "lightweight hair mists with elegant, lasting scent", ar: "معطرات شعر خفيفة بروائح أنيقة وثابتة" },
  "hair-mist": { en: "lightweight hair mists with elegant, lasting scent", ar: "معطرات شعر خفيفة بروائح أنيقة وثابتة" },
  "mens-perfumes": { en: "men's perfumes with oud, woody, fresh, musk, and amber notes", ar: "عطور رجالية بنفحات العود والخشب والانتعاش والمسك والعنبر" },
  "new-arrival": { en: "new perfume arrivals and the latest fragrances from Sasan Perfumes", ar: "أحدث العطور والإصدارات الجديدة من ساسان للعطور" },
  "oud-perfumes": { en: "Arabian oud perfumes with rich woody, smoky, and oriental notes", ar: "عطور العود العربي بنفحات خشبية ودخانية وشرقية غنية" },
  perfumes: { en: "premium, long-lasting perfumes for women and men", ar: "عطور فاخرة وثابتة للنساء والرجال" },
  unisex: { en: "unisex perfumes designed to be shared and worn your way", ar: "عطور للجنسين بروائح أنيقة تناسب الجميع" },
  "woman-perfumes": { en: "women's perfumes with floral, musk, amber, fruity, and oriental notes", ar: "عطور نسائية بنفحات الزهور والمسك والعنبر والفواكه والروائح الشرقية" },
  "womens-perfumes": { en: "women's perfumes with floral, musk, amber, fruity, and oriental notes", ar: "عطور نسائية بنفحات الزهور والمسك والعنبر والفواكه والروائح الشرقية" },
};

export function getCategorySeoFallback(
  slug: string,
  categoryName: string,
  marketCode: MarketCode,
  locale: Locale
): { intro: string; title: string; description: string } {
  const location = MARKET_LOCATION[marketCode] || MARKET_LOCATION.intl;
  const focus = CATEGORY_FOCUS[slug] || {
    en: `${categoryName.toLowerCase()} and premium fragrance products`,
    ar: `${categoryName} ومنتجات العطور الفاخرة`,
  };

  if (locale === "ar") {
    return {
      intro: `اكتشف ${focus.ar} من ساسان للعطور مع خيارات تسوق وتوصيل مخصصة للعملاء في ${location.ar}.`,
      title: `تسوق ${categoryName} أونلاين في ${location.ar}`,
      description: `اكتشف ${focus.ar} من ساسان للعطور. اختر من روائح مختارة بعناية للاستخدام اليومي أو الإهداء، مع تجربة تسوق سهلة للعملاء في ${location.citiesAr}. تجمع مجموعتنا بين خبرة عطرية تتجاوز 60 عامًا وأناقة تناسب الذوق العصري.`,
    };
  }

  return {
    intro: `Discover ${focus.en} from Sasan Perfumes, with convenient shopping and delivery options for customers in ${location.en}.`,
    title: `Shop ${categoryName} Online in ${location.en}`,
    description: `Explore ${focus.en} from Sasan Perfumes. Choose carefully selected scents for everyday wear or gifting, with a convenient shopping experience for customers in ${location.citiesEn}. Our collection combines more than 60 years of fragrance heritage with modern style.`,
  };
}
