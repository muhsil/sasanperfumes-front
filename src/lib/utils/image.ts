/**
 * Detect if an image URL is from WordPress and should use unoptimized rendering.
 * Vercel's /_next/image optimization service cannot reach external WordPress servers,
 * so we bypass optimization for those URLs.
 */
import { siteConfig } from "@/config/site";

export function isWordPressMediaUrl(src?: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const hostNames = new Set([
    ...siteConfig?.mediaHostNames,
    "cms.sasanperfumes.com",
    "cms.shapehive.com",
  ]);

  return src.includes("/wp-content/uploads") || Array.from(hostNames).some((host) => src.includes(host));
}

/**
 * Determine if an image should use unoptimized rendering.
 * Use this to pass to Next Image's `unoptimized` prop.
 */
export function shouldUseUnoptimizedImage(src?: string): boolean {
  return isWordPressMediaUrl(src);
}
