"use client";

import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/sfcc/types";
import Image from "next/image";
import { useState } from "react";

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);
  const [activeIndex, setActiveIndex] = useState(0);

  // If activeIndex is out of bounds due to variant change, reset to 0
  if (activeIndex >= images.length && images.length > 0) {
    setActiveIndex(0);
  }

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
        <img
          src={images[activeIndex].url}
          alt={images[activeIndex].altText || product.title}
          className="w-full h-full object-cover object-top transition-all duration-300 block"
        />
      </div>
    </div>
  );
};
