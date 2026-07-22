"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types";
import { buildProductImageAlt } from "@/lib/utils/image-alt";
import type { Locale } from "@/config/site";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  locale?: Locale;
}

export function ProductGallery({ images, productName, locale = "en" }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src={selectedImage.sourceUrl}
          alt={selectedImage.altText || buildProductImageAlt({ productName, locale, imageIndex: selectedIndex, lifestyle: selectedIndex > 0 })}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAICAIAAABPmPnhAAAAEUlEQVR4nGN4+vAWHsQwXKUBwlPSAflguX8AAAAASUVORK5CYII="
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-colors hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-colors hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md",
                selectedIndex === index
                  ? "ring-2 ring-gray-900 ring-offset-2"
                  : "ring-1 ring-gray-200"
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={selectedIndex === index ? "true" : "false"}
            >
              <Image
                src={image.sourceUrl}
                alt={image.altText || buildProductImageAlt({ productName, locale, imageIndex: index, lifestyle: index > 0 })}
                fill
                sizes="80px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
