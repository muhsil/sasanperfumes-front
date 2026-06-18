"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  message?: string;
  locale?: "en" | "ar";
  enabled?: boolean;
  showDesktop?: boolean;
  showMobile?: boolean;
  position?: "bottom-left" | "bottom-right";
}

export function WhatsAppFloatingButton({
  phoneNumber,
  message,
  locale = "en",
  enabled = true,
  showDesktop = true,
  showMobile = true,
  position = "bottom-left",
}: WhatsAppFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGalleryFullscreenOpen, setIsGalleryFullscreenOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const syncGalleryState = (event?: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }> | undefined;
      const nextOpen = customEvent?.detail?.open;
      if (typeof nextOpen === "boolean") {
        setIsGalleryFullscreenOpen(nextOpen);
        return;
      }

      if (typeof document !== "undefined") {
        setIsGalleryFullscreenOpen(document.body.classList.contains("gallery-fullscreen-open"));
      }
    };

    syncGalleryState();
    window.addEventListener("gallery-fullscreen-change", syncGalleryState as EventListener);
    return () => window.removeEventListener("gallery-fullscreen-change", syncGalleryState as EventListener);
  }, []);

  if (!enabled || !phoneNumber) return null;
  if (isMobile && !showMobile) return null;
  if (!isMobile && !showDesktop) return null;

  const defaultMessage = locale === "ar"
    ? "Ù…Ø±Ø­Ø¨Ø§Ù‹ØŒ Ø£ÙˆØ¯ Ù…Ø¹Ø±ÙØ© Ø§Ù„Ù…Ø²ÙŠØ¯ Ø¹Ù† Ù…Ù†ØªØ¬Ø§ØªÙƒÙ… ÙˆØ®Ø¯Ù…Ø§ØªÙƒÙ…."
    : "Hello Sasan Perfumes, I would like to know more about your products and services.";
  const legacyName = ["Fragrance", "Network"].join(" ");
  const legacySlug = ["fragrance", "network"].join("");
  const safeMessage = (message || defaultMessage)
    .replaceAll(legacyName, "Sasan Perfumes")
    .replaceAll(legacySlug, "Sasan Perfumes");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(safeMessage)}`;

  const isCartPage = pathname?.includes("/cart");
  const isCheckoutPage = pathname?.includes("/checkout");
  if (isCartPage || isCheckoutPage) return null;

  const isLeft = position === "bottom-left";
  const positionClasses = isLeft
    ? "left-4"
    : "right-4";

  return (
    <>
      <style jsx>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .whatsapp-button { animation: float 3s ease-in-out infinite; }
        .whatsapp-button:hover { animation: none; }
        .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .icon-wiggle:hover { animation: wiggle 0.5s ease-in-out; }
      `}</style>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`whatsapp-floating-button whatsapp-button fixed ${positionClasses} bottom-24 md:bottom-8 z-50 group transition-all duration-200 ${isGalleryFullscreenOpen ? "pointer-events-none opacity-0 scale-90" : "opacity-100 scale-100"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Chat on WhatsApp"
      >
        <div className="absolute inset-0 rounded-full bg-[#25D366] pulse-ring" />
        <div
          className="absolute inset-0 rounded-full bg-[#25D366] pulse-ring"
          style={{ animationDelay: "1s" }}
        />

        <div className="relative flex items-center">
          <div
            className={`
              absolute ${isLeft ? "left-full ml-3" : "right-full mr-3"} whitespace-nowrap
              bg-white rounded-full shadow-lg px-4 py-2
              text-sm font-medium text-gray-700
              transition-all duration-300 ease-out
              ${isHovered ? "opacity-100 translate-x-0" : `opacity-0 ${isLeft ? "-translate-x-4" : "translate-x-4"} pointer-events-none`}
            `}
          >
            <span className="text-[#25D366] font-semibold">
              {locale === "ar" ? "ØªØ­Ø¯Ø« Ù…Ø¹Ù†Ø§!" : "Chat with us!"}
            </span>
          </div>

          <div className="icon-wiggle relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-lg shadow-[#25D366]/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[#25D366]/40">
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#25D366]/20 to-transparent" />
            <svg
              viewBox="0 0 24 24"
              className="relative h-5 w-5 fill-white drop-shadow-sm"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
        </div>

        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 items-center justify-center">
            <span className="text-[8px] font-bold text-white">1</span>
          </span>
        </span>
      </a>
    </>
  );
}
