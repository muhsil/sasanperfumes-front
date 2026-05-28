import { NextResponse } from "next/server";
import { API_BASE, backendHeaders, fetchBackend, safeJsonResponse } from "@/lib/utils/backendFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackHomeSettings = {
  hero: null,
  newProducts: null,
  bestseller: null,
  categories: null,
  featured: null,
  collections: null,
  banners: null,
  brandSlider: {
    enabled: true,
    title_en: "More from {brand}",
    title_ar: "المزيد من {brand}",
    count: 12,
    cols_desktop: 4,
    cols_tablet: 3,
    cols_mobile: 2,
    fallback: "category",
  },
};
const homeSettingsEndpoints = [
  `${API_BASE}/wp-json/sasanperfumes/v1/home-settings`,
  `${API_BASE}/wp-json/fnf/v1/home-settings`,
  `${API_BASE}/wp-json/Anbar/v1/home-settings`,
];

function fallbackResponse() {
  return NextResponse.json(fallbackHomeSettings, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET() {
  try {
    for (const endpoint of homeSettingsEndpoints) {
      const response = await fetchBackend(endpoint, {
        headers: backendHeaders(),
      });
      const data = await safeJsonResponse(response);

      if (response.ok) {
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        });
      }

      if (data.code === "invalid_response") {
        const retry = await fetchBackend(endpoint);
        const retryData = await safeJsonResponse(retry);
        if (retry.ok) {
          return NextResponse.json(retryData, {
            headers: {
              "Cache-Control": "no-store, max-age=0",
            },
          });
        }
      }
    }

    return fallbackResponse();
  } catch (error) {
    console.warn("Home settings fallback used:", error instanceof Error ? error.message : error);
    return fallbackResponse();
  }
}
