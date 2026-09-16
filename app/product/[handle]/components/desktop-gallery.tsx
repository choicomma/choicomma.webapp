"use client";

import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/sfcc/types";
import Image from "next/image";
import { useState, useEffect } from "react";

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);
  const [activeIndex, setActiveIndex] = useState(0);

  // If activeIndex is out of bounds due to variant change, reset to 0
  if (activeIndex >= images.length && images.length > 0) {
    setActiveIndex(0);
  }

  // 제품 이미지가 2개 이상일 때 자동으로 슬라이드
  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [images.length, activeIndex]);

  if (!images.length) return null;

  return (
    <div className="flex gap-4 md:gap-6 w-full items-start">
      {/* Thumbnails (Left Column) */}
      {images.length > 1 && (
        <div className="w-16 sm:w-20 shrink-0 flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-[500px]">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative w-full aspect-square overflow-hidden transition-all duration-300 bg-transparent rounded-sm focus:outline-none focus:ring-0 cursor-pointer ${
                activeIndex === index ? "opacity-100" : "opacity-40 hover:opacity-80"
              }`}
            >
              <img
                src={image.url}
                alt={image.altText || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image (Center Column: Exact 1:1 aspect-square without outline/border) */}
      <div className="flex-1 max-w-[500px] aspect-square relative bg-transparent overflow-hidden">
        {images.map((image, index) => (
          <img
            key={`${image.url}-${index}`}
            src={image.url}
            alt={image.altText || product.title}
            className={`w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-700 block ${
              activeIndex === index
                ? "opacity-100 z-10"
                : "opacity-0 z-0 pointer-events-none"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
