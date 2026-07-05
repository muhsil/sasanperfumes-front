import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const runtime = "edge";

export const alt = `${siteConfig.name} | UAE, GCC & International Fragrances`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #faf6f1 0%, #f1e5d8 48%, #ead9c8 100%)",
          color: "#2f2620",
          padding: "56px 64px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "620px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "999px",
                border: "2px solid rgba(47, 38, 32, 0.15)",
                background: "rgba(255, 255, 255, 0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
                fontWeight: 700,
              }}
            >
              S
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", letterSpacing: "0.04em", fontWeight: 700 }}>
                {siteConfig.name}
              </div>
              <div style={{ fontSize: "16px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#6c594a" }}>
                Premium fragrance store
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "70px",
              lineHeight: "0.95",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            UAE, GCC &amp; International Fragrances
          </div>

          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.35,
              color: "#5f4f43",
              maxWidth: "520px",
            }}
          >
            Localized storefronts, market-specific currency, and product collections for the UAE, Qatar, Oman, and Saudi Arabia.
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            {["UAE", "Qatar", "Oman", "Saudi Arabia", "International"].map((label) => (
              <div
                key={label}
                style={{
                  borderRadius: "999px",
                  border: "1px solid rgba(47, 38, 32, 0.14)",
                  background: "rgba(255, 255, 255, 0.65)",
                  padding: "12px 18px",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#3a2f28",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "380px",
            height: "470px",
            borderRadius: "42px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(250,244,238,0.92) 100%)",
            border: "1px solid rgba(47, 38, 32, 0.14)",
            boxShadow: "0 30px 70px rgba(77, 56, 39, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "28px",
              left: "28px",
              right: "28px",
              bottom: "28px",
              borderRadius: "34px",
              background:
                "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.9) 0%, rgba(246,232,219,0.6) 48%, rgba(223,199,176,0.35) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "180px",
                height: "280px",
                borderRadius: "34px 34px 26px 26px",
                background:
                  "linear-gradient(180deg, rgba(241, 248, 218, 0.95) 0%, rgba(226, 240, 192, 0.96) 100%)",
                border: "2px solid rgba(89, 106, 58, 0.18)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 0 10px rgba(255,255,255,0.12)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-46px",
                  width: "110px",
                  height: "50px",
                  borderRadius: "16px",
                  background:
                    "linear-gradient(180deg, #adc956 0%, #7c9f32 100%)",
                  border: "2px solid rgba(47, 38, 32, 0.14)",
                  boxShadow: "0 10px 20px rgba(47, 38, 32, 0.12)",
                }}
              />
              <div
                style={{
                  width: "116px",
                  height: "170px",
                  background: "rgba(255,255,255,0.92)",
                  borderRadius: "6px",
                  border: "1px solid rgba(47, 38, 32, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "18px",
                }}
              >
                <div style={{ fontSize: "26px", letterSpacing: "0.08em", fontWeight: 700, color: "#332821" }}>
                  Sasan
                </div>
                <div style={{ fontSize: "12px", letterSpacing: "0.3em", color: "#7a6657" }}>
                  PERFUMES
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
