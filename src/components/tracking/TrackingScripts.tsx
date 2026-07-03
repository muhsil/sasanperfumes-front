"use client";

import { FacebookPixel } from "./FacebookPixel";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { GoogleTagManager } from "./GoogleTagManager";
import { MicrosoftClarity } from "./MicrosoftClarity";
import { OmnisendTracking } from "./OmnisendTracking";
import { SnapchatPixel } from "./SnapchatPixel";
import { TikTokPixel } from "./TikTokPixel";

interface TrackingScriptsProps {
  gaId?: string;
  googleAdsId?: string;
  fbPixelId?: string;
  tiktokPixelId?: string;
  snapPixelId?: string;
  omnisendBrandId?: string;
  gtmId?: string;
  clarityId?: string;
}

export function TrackingScripts({
  gaId,
  googleAdsId,
  fbPixelId,
  tiktokPixelId,
  snapPixelId,
  omnisendBrandId,
  gtmId,
  clarityId,
}: TrackingScriptsProps){
  return (
    <>
      <GoogleTagManager gtmId={gtmId || ""} />
      <GoogleAnalytics gaId={gaId || ""} googleAdsId={googleAdsId} />
      <FacebookPixel pixelId={fbPixelId || ""} />
      <TikTokPixel pixelId={tiktokPixelId || ""} />
      <SnapchatPixel pixelId={snapPixelId || ""} />
      <OmnisendTracking brandId={omnisendBrandId || ""} />
      <MicrosoftClarity projectId={clarityId || ""} />
    </>
  );
}
