// WordPress REST API Types for ACF and Site Options

export interface WPImage {
  id: number;
  url: string;
  alt: string;
  title: string;
  width: number;
  height: number;
  sizes: {
    thumbnail: string;
    medium: string;
    large: string;
    full: string;
  };
}

export interface WPLink {
  title: string;
  url: string;
  target: string;
}

// Hero Slider Types
export interface HeroSlide {
  image: WPImage;
  mobile_image?: WPImage;
  link?: WPLink;
  slide_type?: "image" | "video";
  video_url?: string;
  poster_url?: string;
  videoUrl?: string;
  videoMobile?: string;
  videoAr?: string;
  videoMobileAr?: string;
  posterUrl?: string;
  posterMobile?: string;
  posterAr?: string;
  posterMobileAr?: string;
  title?: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  ctaLabel?: string;
  ctaLabelAr?: string;
  linkUrl?: string;
}

export interface HeroSliderSettings {
  enabled: boolean;
  slides: HeroSlide[];
  autoplay: boolean;
  autoplay_delay: number;
  loop: boolean;
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

// Banner Types
export interface Banner {
  image: WPImage;
  mobile_image?: WPImage;
  link?: WPLink;
  title?: string;
  subtitle?: string;
}

export interface BannersSettings {
  enabled: boolean;
  banners: Banner[];
  layout?: 'grid';
  responsive_columns?: { desktop: number; tablet: number; mobile: number };
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

// Ad Slot Types
export interface Ad {
  image: WPImage;
  mobile_image?: WPImage;
  link?: WPLink;
  title?: string;
  subtitle?: string;
  button_text?: string;
  placement?: string;
  market?: string;
}

export interface AdsSettings {
  enabled: boolean;
  items: Ad[];
}

// Collection Types
export interface Collection {
  title: string;
  description?: string;
  image: WPImage;
  link: WPLink;
}

export interface CollectionsSettings {
  enabled: boolean;
  section_title: string;
  section_subtitle?: string;
  collections: Collection[];
  layout?: 'grid';
  responsive_columns?: { desktop: number; tablet: number; mobile: number };
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

// Product Section Types
export interface ProductSectionSettings {
  enabled: boolean;
  section_title: string;
  section_subtitle?: string;
  products_count: number;
  selected_product_slugs?: string[];
  show_view_all: boolean;
  view_all_link?: string;
  display?: 'slider' | 'grid';
  responsive_columns?: { desktop: number; tablet: number; mobile: number };
  autoplay?: boolean;
  autoplay_delay?: number;
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

// Category Section Types
export interface CategorySectionSettings {
  enabled: boolean;
  section_title: string;
  section_subtitle?: string;
  categories_count: number;
  selected_category_ids?: number[];
  show_view_all: boolean;
  responsive_columns?: { desktop: number; tablet: number; mobile: number };
  hide_on_mobile?: boolean;
  hide_on_desktop?: boolean;
}

// Featured Products Section Types
export interface FeaturedProductsSettings extends ProductSectionSettings {
  autoplay: boolean;
  autoplay_delay: number;
}

// Site Settings Types
export interface SiteSettings {
  logo: WPImage | null;
  logo_dark?: WPImage | null;
  favicon?: WPImage | null;
  site_name?: string;
  tagline?: string;
}

// Menu Types
export interface WPMenuItem {
  id: number;
  title: string;
  url: string;
  target: string;
  parent: number;
  order: number;
  children?: WPMenuItem[];
}

export interface WPMenu {
  id: number;
  name: string;
  slug: string;
  items: WPMenuItem[];
}

// Home Page ACF Fields
export interface HomePageACF {
  hero_slider: HeroSliderSettings;
  new_products: ProductSectionSettings;
  bestseller_products: ProductSectionSettings;
  shop_by_category: CategorySectionSettings;
  featured_products: FeaturedProductsSettings;
  collections: CollectionsSettings;
  banners: BannersSettings;
}

// API Response Types
export interface WPOptionsResponse {
  site_settings: SiteSettings;
  home_page: HomePageACF;
}

export interface WPMenuResponse {
  menus: WPMenu[];
}

// WordPress Customizer Settings (Appearance > Customize)
// These settings are stored in wp_options and exposed via custom REST endpoint
export interface CustomizerSettings {
  // Site Identity
  site_title?: string;
  site_tagline?: string;
  site_logo?: string; // URL string from Customizer
  site_icon?: string; // Favicon URL
  
  // Custom Logo (from theme support)
  custom_logo?: number; // Attachment ID
  custom_logo_url?: string; // Full URL
  
  // Home Page Settings
  hero_slider_enabled?: boolean;
  hero_autoplay?: boolean;
  hero_autoplay_delay?: number;
  hero_loop?: boolean;
  
  // Section Toggles
  new_products_enabled?: boolean;
  new_products_title?: string;
  new_products_subtitle?: string;
  new_products_count?: number;
  
  bestseller_enabled?: boolean;
  bestseller_title?: string;
  bestseller_subtitle?: string;
  bestseller_count?: number;
  
  categories_enabled?: boolean;
  categories_title?: string;
  categories_subtitle?: string;
  categories_count?: number;
  
  featured_enabled?: boolean;
  featured_title?: string;
  featured_subtitle?: string;
  featured_count?: number;
  featured_autoplay?: boolean;
  
  collections_enabled?: boolean;
  collections_title?: string;
  collections_subtitle?: string;
  
  banners_enabled?: boolean;
}

// Product Page Types (from sasanperfumes_product_page CPT)
export interface ProductPageHero {
  enabled: boolean;
  image: string;
  mobileImage: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  description: string;
  descriptionAr: string;
  ctaText: string;
  ctaTextAr: string;
  ctaLink: string;
}

export interface ProductPageProducts {
  enabled: boolean;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  source: "category" | "featured" | "latest" | "bestseller";
  categorySlug: string;
  count: number;
  display: "grid" | "slider";
  showViewAll: boolean;
  viewAllLink: string;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

export interface ProductPageBannerItem {
  image: string;
  mobileImage: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  link: string;
}

export interface ProductPageBanners {
  enabled: boolean;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
  items: ProductPageBannerItem[];
}

export interface ProductPageFeatureItem {
  icon: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
}

export interface ProductPageFeatures {
  enabled: boolean;
  title: string;
  titleAr: string;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
  items: ProductPageFeatureItem[];
}

export interface ProductPageFAQItem {
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
}

export interface ProductPageFAQ {
  enabled: boolean;
  title: string;
  titleAr: string;
  items: ProductPageFAQItem[];
}

export interface ProductPageSEO {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  keywords: string;
  keywordsAr: string;
  ogImage: string;
}

export interface ProductPageLayout {
  sectionOrder: string;
  template: "default" | "product-showcase" | "landing" | "minimal";
  bgStyle: "default" | "warm" | "dark";
}

export interface ProductPage {
  id: number;
  slug: string;
  title: string;
  date: string;
  modified: string;
  thumbnail: string;
  hero: ProductPageHero;
  products: ProductPageProducts;
  banners: ProductPageBanners;
  features: ProductPageFeatures;
  faq: ProductPageFAQ;
  seo: ProductPageSEO;
  layout: ProductPageLayout;
}

// ─── Bilingual helper ───
export interface BilingualText { en: string; ar: string; }

// ─── Category SEO Content (from /sasanperfumes/v1/category-seo) ───
export interface CategorySeoContent {
  slug?: string;
  subtitle?: BilingualText;
  title: BilingualText;
  description: BilingualText;
}

// ─── Category Subtitle (from /sasanperfumes/v1/category-subtitle) ───
export interface CategorySubtitle {
  slug?: string;
  subtitle: BilingualText;
}

// ─── Home Sections (from /sasanperfumes/v1/home-sections) ───
export interface HomeSectionWhyChooseUs {
  enabled: boolean;
  eyebrow: BilingualText;
  title: BilingualText;
  subtitle: BilingualText;
  items: Array<{ title: BilingualText; description: BilingualText }>;
}

export interface HomeSectionOurStory {
  enabled: boolean;
  eyebrow: BilingualText;
  title: BilingualText;
  description1: BilingualText;
  description2: BilingualText;
  image: string;
  stats: Array<{ value: string; label: BilingualText }>;
}

export interface HomeSectionFAQ {
  enabled: boolean;
  eyebrow: BilingualText;
  title: BilingualText;
  subtitle: BilingualText;
  items: Array<{ question: BilingualText; answer: BilingualText }>;
}

export interface HomeSectionSEO {
  enabled: boolean;
  title: BilingualText;
  paragraphs: BilingualText[];
  backgroundImage?: string;
}

export interface HomeSections {
  whyChooseUs: HomeSectionWhyChooseUs;
  ourStory: HomeSectionOurStory;
  faq: HomeSectionFAQ;
  seoContent: HomeSectionSEO;
}

// ─── Guide Pages (from /sasanperfumes/v1/guides) ───
export interface GuideProduct {
  slug: string;
  rank: number;
  pickReason: BilingualText;
  description: BilingualText;
}

export interface GuideContentBlock {
  heading: BilingualText;
  body: BilingualText;
}

export interface GuideFAQ {
  question: BilingualText;
  answer: BilingualText;
}

export interface GuidePage {
  id: number;
  slug: string;
  title: BilingualText;
  metaDescription: BilingualText;
  keywords: { en: string[]; ar: string[] };
  eyebrow: BilingualText;
  intro: BilingualText;
  products: GuideProduct[];
  contentBlocks: GuideContentBlock[];
  faqs: GuideFAQ[];
  relatedGuideSlugs: string[];
  ogImage: string;
  publishedAt: string;
  updatedAt: string;
}

// ─── Footer Settings (from /sasanperfumes/v1/footer-settings) ───
export interface FooterLinkItem {
  label: BilingualText;
  url: string;
}

export interface FooterLinkSection {
  heading: BilingualText;
  items: FooterLinkItem[];
}

export interface FooterNewsletterSettings {
  title: BilingualText;
  subtitle: BilingualText;
  buttonText: BilingualText;
  placeholder: BilingualText;
}

export interface FooterSocialLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  snapchat: string;
  whatsapp: string;
}

export interface FooterPoweredBy {
  text: BilingualText;
  name: BilingualText;
  url: string;
}

export interface FooterSettings {
  description: BilingualText;
  copyright: BilingualText;
  newsletter: FooterNewsletterSettings;
  quickLinks: FooterLinkSection;
  customerService: FooterLinkSection;
  social: FooterSocialLinks;
  poweredBy: FooterPoweredBy;
}

// WordPress Site Info from /wp-json (root endpoint)
export interface WPSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  site_logo?: number;
  site_icon?: number;
  site_icon_url?: string;
}
