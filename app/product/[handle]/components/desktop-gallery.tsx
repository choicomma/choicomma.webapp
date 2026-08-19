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
    <div className="flex gap-4 md:gap-8 h-full">
      {/* Thumbnails (Left Column) */}
      <div className="w-1/4 md:w-1/5 flex flex-col gap-4 overflow-y-auto no-scrollbar h-full max-h-[85vh]">
        {images.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            onClick={() => setActiveIndex(index)}
            className={`relative w-full aspect-[3/4] overflow-hidden transition-all duration-300 bg-white focus:outline-none focus:ring-0 ${
              activeIndex === index ? "opacity-100" : "opacity-40 hover:opacity-100"
            }`}
          >
            <Image
              src={image.url}
              alt={image.altText || `Thumbnail ${index + 1}`}
              fill
              className="object-contain p-1"
              sizes="(max-width: 768px) 25vw, 15vw"
            />
          </button>
        ))}
      </div>

      {/* Main Image (Center Column) */}
      <div className="w-3/4 md:w-4/5 relative h-[75vh] md:h-[90vh] overflow-hidden bg-white flex items-start justify-center">
        <Image
          src={images[activeIndex].url}
          alt={images[activeIndex].altText || product.title}
          fill
          className="object-contain object-top p-0 transition-all duration-500"
          priority
          sizes="(max-width: 768px) 75vw, 50vw"
        />
      </div>
    </div>
  );
};
