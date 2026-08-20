import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FeaturedProductLabel } from "./featured-product-label";
import { Product } from "@/lib/sfcc/types";
import Link from "next/link";
import { Clock } from "lucide-react";

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

  const [timeSaleDiscount, setTimeSaleDiscount] = useState<number | null>(null);

  useEffect(() => {
    const updateTimeSaleStatus = () => {
      if (typeof window === "undefined") return;
      try {
        const linked = (product as any).linkedProduct;
        const linkedId = (product as any).linkedProductId;
        const possibleIds = Array.from(
          new Set(
            [
              String(product.id || ""),
              String(product.handle || ""),
              linkedId ? String(linkedId) : "",
              linked?.id ? String(linked.id) : "",
              linked?.handle ? String(linked.handle) : "",
            ].filter(Boolean)
          )
        );

        const globalStatus = localStorage.getItem("secret_timesale_status");
        if (globalStatus === "ended" || (product as any).isTimeSale === false) {
          setTimeSaleDiscount(null);
          return;
        }

        let isSelected = false;
        const savedIds = localStorage.getItem("secret_timesale_product_ids");
        if (savedIds !== null) {
          try {
            const parsedIds: any[] = JSON.parse(savedIds);
            isSelected = parsedIds.some((id: any) =>
              possibleIds.includes(String(id))
            );
          } catch (e) {}
        } else {
          isSelected = (product as any).isTimeSale === true || product.categoryId === "timesale" || product.tags?.includes("TIMESALE");
        }

        let itemDiscount: number | null = null;
        const itemSettingsSaved = localStorage.getItem("secret_timesale_item_settings");
        if (itemSettingsSaved) {
          try {
            const parsedSettings = JSON.parse(itemSettingsSaved);
            for (const pid of possibleIds) {
              if (parsedSettings[pid]?.discountRate) {
                itemDiscount = parseInt(parsedSettings[pid].discountRate);
                break;
              }
            }
          } catch (e) {}
        }

        const isTimeSale = isSelected || (product as any).isTimeSale === true || (linked as any)?.isTimeSale === true;

        if (isTimeSale) {
          let discount =
            itemDiscount ||
            (product as any).timeSaleDiscountRate ||
            (linked as any)?.timeSaleDiscountRate ||
            (product as any).discountRate ||
            (linked as any)?.discountRate;

          if (!discount) {
            const savedDisc = localStorage.getItem("secret_timesale_discount");
            if (savedDisc && !isNaN(parseInt(savedDisc))) {
              discount = parseInt(savedDisc);
            } else {
              discount = 35;
            }
          }

          setTimeSaleDiscount(discount);
        } else {
          setTimeSaleDiscount(null);
        }
      } catch (e) {
        console.error("Error in updateTimeSaleStatus", e);
      }
    };

    updateTimeSaleStatus();
    window.addEventListener("storage", updateTimeSaleStatus);
    window.addEventListener("admin_products_updated", updateTimeSaleStatus);
    window.addEventListener("focus", updateTimeSaleStatus);

    const interval = setInterval(updateTimeSaleStatus, 1000);

    return () => {
      window.removeEventListener("storage", updateTimeSaleStatus);
      window.removeEventListener("admin_products_updated", updateTimeSaleStatus);
      window.removeEventListener("focus", updateTimeSaleStatus);
      clearInterval(interval);
    };
  }, [product]);

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
          {/* TIME SALE BADGE OVERLAY ON PRODUCT IMAGE */}
          {(timeSaleDiscount !== null || (product as any).isTimeSale || (product as any).productLabel === "TIME SALE" || (product as any).categoryId === "timesale") && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-amber-500 text-neutral-950 px-3 py-1 rounded-xl shadow-lg border border-amber-300/80 font-black text-xs">
              <Clock className="w-3.5 h-3.5 text-neutral-950 animate-pulse" />
              <span>TIME SALE {timeSaleDiscount ? `${timeSaleDiscount}% OFF` : ""}</span>
            </div>
          )}
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
        {/* TIME SALE BADGE OVERLAY ON PRODUCT IMAGE */}
        {(timeSaleDiscount !== null || (product as any).isTimeSale || (product as any).productLabel === "TIME SALE" || (product as any).categoryId === "timesale") && (
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-amber-500 text-neutral-950 px-2.5 py-1 rounded-xl shadow-lg border border-amber-300/80 font-black text-[11px]">
            <Clock className="w-3.5 h-3.5 text-neutral-950 animate-pulse" />
            <span>TIME SALE {timeSaleDiscount ? `${timeSaleDiscount}% OFF` : ""}</span>
          </div>
        )}
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
