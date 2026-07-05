"use client";

import { FacebookPixel } from "./FacebookPixel";
import { MicrosoftClarity } from "./MicrosoftClarity";
import { OmnisendTracking } from "./OmnisendTracking";
import { SnapchatPixel } from "./SnapchatPixel";
import { TikTokPixel } from "./TikTokPixel";

interface TrackingScriptsProps {
  fbPixelId?: string;
  tiktokPixelId?: string;
  snapPixelId?: string;
  omnisendBrandId?: string;
  clarityId?: string;
}

export function TrackingScripts({
  fbPixelId,
  tiktokPixelId,
  snapPixelId,
  omnisendBrandId,
  clarityId,
}: TrackingScriptsProps){
  return (
    <>
      <FacebookPixel pixelId={fbPixelId || ""} />
      <TikTokPixel pixelId={tiktokPixelId || ""} />
      <SnapchatPixel pixelId={snapPixelId || ""} />
      <OmnisendTracking brandId={omnisendBrandId || ""} />
      <MicrosoftClarity projectId={clarityId || ""} />
    </>
  );
}
