"use client";

import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/sfcc/types";
import Image from "next/image";

export const ProductImage = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);

  const [variantImage] = useProductImages(product, selectedVariant?.selectedOptions);

  return (
    <Image
      src={variantImage.url}
      alt={variantImage.altText || product.title}
      fill
      sizes="(max-width: 768px) 50vw, 33vw"
      className="size-full object-contain p-3 sm:p-4 md:p-6 transition-transform duration-500 group-hover:scale-105"
      quality={100}
      unoptimized={true}
    />
  );
};
