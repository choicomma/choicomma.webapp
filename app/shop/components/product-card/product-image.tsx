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
      width={variantImage.width}
      height={variantImage.height}
      className="size-full object-cover"
      quality={100}
    />
  );
};
