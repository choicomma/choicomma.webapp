import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FeaturedProductLabel } from "./featured-product-label";
import { Product } from "@/lib/sfcc/types";
import Link from "next/link";

interface LatestProductCardProps {
  product: Product;
  principal?: boolean;
  className?: string;
  labelPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function LatestProductCard({
  product,
  principal = false,
  className,
}: LatestProductCardProps) {
  const customImg = (product as any).heroCustomImage;
  const displayImage = customImg || product.featuredImage?.url || "/product_1.webp";
  const linkedProduct = (product as any).linkedProduct || product;
  const targetHandle = linkedProduct.handle || product.handle || "product-1";

  const isOutOfStock =
    product.availableForSale === false ||
    (product as any).status === "sold_out" ||
    (product as any).isOutOfStock === true ||
    (product as any).inventoryQuantity === 0;

  if (principal) {
    return (
      <div
        className={cn(
          "relative w-full aspect-[4/5] overflow-hidden rounded-none border-none shadow-none group",
          className
        )}
      >
        <Link
          href={`/product/${targetHandle}`}
          className="absolute inset-0 w-full h-full block"
          prefetch
        >
          <Image
            priority
            src={displayImage}
            alt={product.featuredImage?.altText || product.title}
            width={1600}
            height={1200}
            quality={100}
            className="object-cover w-full h-full"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="bg-neutral-950 text-white font-black text-xs md:text-sm px-4 py-2 rounded-2xl border border-neutral-700 shadow-2xl tracking-widest uppercase">
                품절 (SOLD OUT)
              </span>
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 md:p-4 bg-white border border-neutral-200/60 rounded-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative",
        className
      )}
    >
      <Link
        href={`/product/${product.handle}`}
        className="block w-full aspect-[4/5] overflow-hidden rounded-none bg-neutral-100 relative"
        prefetch
      >
        <Image
          src={product.featuredImage.url}
          alt={product.featuredImage.altText}
          width={1000}
          height={1250}
          className="object-cover size-full"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-neutral-950 text-white font-black text-xs px-3 py-1.5 rounded-xl border border-neutral-700 shadow-xl tracking-widest uppercase">
              품절 (SOLD OUT)
            </span>
          </div>
        )}
      </Link>

      <div className="w-full">
        <FeaturedProductLabel product={product} />
      </div>
    </div>
  );
}
