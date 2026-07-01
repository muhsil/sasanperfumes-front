import type { NextConfig } from "next";

const disableRuntimeCache =
  process.env.NODE_ENV === "development" ||
  process.env.DISABLE_RUNTIME_CACHE === "true" ||
  process.env.NEXT_PUBLIC_DISABLE_RUNTIME_CACHE === "true";
const disableSearchIndexing =
  process.env.DISABLE_INDEXING === "true" ||
  process.env.NEXT_PUBLIC_DISABLE_INDEXING === "true";

const cmsApiUrl = (process.env.NEXT_PUBLIC_WC_API_URL || "https://cms.sasanperfumes.com").replace(/\/+$/, "");
const imageHostFallbacks = [
  "cms.sasanperfumes.com",
];
const extraImageHosts = (
  process.env.NEXT_PUBLIC_CMS_IMAGE_HOSTS ||
  process.env.NEXT_PUBLIC_WP_API_HOST ||
  ""
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const cmsApiHost = (() => {
  try {
    return new URL(cmsApiUrl).hostname;
  } catch {
    return "cms.sasanperfumes.com";
  }
})();
const mediaHostnames = Array.from(new Set([cmsApiHost, ...imageHostFallbacks, ...extraImageHosts]));
const marketUploadPathnames = ["", "/qa", "/om", "/sa"].map((prefix) => `${prefix}/wp-content/uploads/**`);

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
};

const mediaRemotePatterns: ImageRemotePattern[] = mediaHostnames.flatMap((hostname) =>
  marketUploadPathnames.flatMap((pathname) => [
    {
      protocol: "https",
      hostname,
      pathname,
    },
    {
      protocol: "http",
      hostname,
      pathname,
    },
  ])
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    qualities: [75, 85, 100],
    minimumCacheTTL: disableRuntimeCache ? 0 : 31536000,
    remotePatterns: [
      ...mediaRemotePatterns,
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
    ],
  },
  // Increase static page generation timeout to handle slow API responses during build
  staticPageGenerationTimeout: 120,
  // Enable experimental features for better caching
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    cpus: 1,
    ...(disableRuntimeCache ? {} : {
      staleTimes: {
        dynamic: 300,
        static: 600,
      },
    }),
    optimizePackageImports: ["lucide-react", "swiper", "@mui/material", "@apollo/client", "@emotion/react", "@emotion/styled", "class-variance-authority", "clsx", "swr", "cookies-next"],
  },
  async redirects() {
    return [
      {
        source: '/:slug([\\w-]+)-perfume',
        destination: '/en/product/:slug-perfume',
        permanent: true,
      },
      {
        source: '/product/:slug',
        destination: '/en/product/:slug',
        permanent: true,
      },
      {
        source: '/product-category/:slug',
        destination: '/en/category/:slug',
        permanent: true,
      },
      {
        source: '/shop',
        destination: '/en/shop',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiUrl = cmsApiUrl;
    return [
      {
        source: '/cms-media/:path*',
        destination: `${apiUrl}/wp-content/uploads/:path*`,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      ...(disableSearchIndexing
        ? [
            {
              key: "X-Robots-Tag",
              value: "noindex, nofollow",
            },
          ]
        : []),
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          ...(disableRuntimeCache
            ? [
                {
                  key: "Cache-Control",
                  value: "no-store, max-age=0",
                },
              ]
            : []),
        ],
      },
      // Allow short CDN caching with stale-while-revalidate for HTML pages.
      // Market-specific paths (/qa/en, /om/en, /sa/en) are cached separately by URL.
      {
        source: "/:locale(en|ar)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/:locale(en|ar)",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/:market(qa|om|sa)/:locale(en|ar)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/:market(qa|om|sa)/:locale(en|ar)",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/wp-content/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/products",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/categories",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
      {
        source: "/api/brands",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
      {
        source: "/api/home-settings",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
      {
        source: "/api/brands-slider",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
      {
        source: "/api/discount-rules",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/badge-tags",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=600, stale-while-revalidate=1200",
          },
        ],
      },
      {
        source: "/api/search",
        headers: [
          {
            key: "Cache-Control",
            value: disableRuntimeCache ? "no-store, max-age=0" : "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
          },
        ],
      },
      {
        source: "/image-sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/cms-media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};


export default nextConfig;

