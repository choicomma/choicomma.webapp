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

import { translateProductTitle, translateUiText, getCurrentLanguage } from "@/lib/i18n/translation";
import { ProductCardImageSlider, extractProductImages } from "./product-card-image-slider";
import { formatReleaseDateBadge } from "@/lib/product-availability";

export function LatestProductCard({
  product,
  principal = false,
  className,
}: LatestProductCardProps) {
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    window.addEventListener("language-changed", handleLangChange);
    return () => {
      window.removeEventListener("language_changed", handleLangChange);
      window.removeEventListener("language-changed", handleLangChange);
    };
  }, []);

  const productImages = React.useMemo(() => extractProductImages(product), [product]);
  const linkedProduct = (product as any).linkedProduct || product;
  const targetHandle = linkedProduct.handle || product.handle || "product-1";

  const isScheduled = Boolean(
    product.releaseDate && new Date(product.releaseDate).getTime() > Date.now()
  );
  const isReleaseOpen = Boolean(
    product.releaseDate && new Date(product.releaseDate).getTime() <= Date.now()
  );
  const isOutOfStock =
    !isScheduled &&
    (isReleaseOpen
      ? (product as any).stock !== undefined && Number((product as any).stock) <= 0
      : (product.availableForSale === false ||
          (product as any).status === "sold_out" ||
          (product as any).isOutOfStock === true ||
          (product as any).inventoryQuantity === 0 ||
          ((product as any).stock !== undefined &&
            (product as any).stock !== null &&
            Number((product as any).stock) <= 0)));

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

        const isDirectTimeSale =
          (product as any).isTimeSale === true ||
          product.categoryId === "timesale" ||
          product.tags?.includes("TIMESALE") ||
          (linked as any)?.isTimeSale === true ||
          linked?.categoryId === "timesale" ||
          linked?.tags?.includes("TIMESALE");

        let isSecretSelected = false;
        const savedIds = localStorage.getItem("secret_timesale_product_ids");
        if (savedIds !== null) {
          try {
            const parsedIds: any[] = JSON.parse(savedIds);
            isSecretSelected = Array.isArray(parsedIds) && parsedIds.some((id: any) =>
              possibleIds.includes(String(id))
            );
          } catch (e) {}
        }

        const isTimeSale = isDirectTimeSale || isSecretSelected;

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

        if (isTimeSale) {
          const tagRate = Array.isArray(product.tags)
            ? product.tags.find((t: any) => typeof t === "string" && t.startsWith("tsrate:"))?.replace("tsrate:", "")
            : null;
          const parsedTagRate = tagRate && !isNaN(Number(tagRate)) ? Number(tagRate) : null;

          let discount =
            (product as any).timeSaleDiscountRate ||
            parsedTagRate ||
            (linked as any)?.timeSaleDiscountRate ||
            itemDiscount ||
            (product as any).discountRate ||
            (linked as any)?.discountRate;

          if (!discount) {
            const savedDisc = localStorage.getItem("secret_timesale_discount");
            if (savedDisc && !isNaN(parseInt(savedDisc))) {
              discount = parseInt(savedDisc);
            }
          }

          setTimeSaleDiscount(discount || null);
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
          "relative w-full aspect-[4/5] overflow-hidden rounded-none border-none shadow-none group bg-white flex flex-col justify-between",
          className
        )}
      >
        <Link
          href={`/product/${targetHandle}`}
          className="relative w-full aspect-square block bg-white flex items-center justify-center p-4 overflow-hidden"
          prefetch
        >
          <ProductCardImageSlider
            images={productImages}
            alt={product.featuredImage?.altText || product.title}
            paddingClass="p-0"
            imageClassName="object-contain size-full"
            priority={true}
          />
          {isScheduled ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="bg-amber-500 text-neutral-950 font-black text-xs md:text-sm px-4 py-2 rounded-2xl border border-amber-600 shadow-2xl tracking-widest uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-950" />
                <span>{formatReleaseDateBadge(product.releaseDate)}</span>
              </span>
            </div>
          ) : isOutOfStock ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="bg-neutral-950 text-white font-black text-xs md:text-sm px-4 py-2 rounded-2xl border border-neutral-700 shadow-2xl tracking-widest uppercase">
                {translateUiText("SOLD OUT", currentLang)}
              </span>
            </div>
          ) : null}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 md:p-4 bg-white border border-neutral-200/60 rounded-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative aspect-[4/5] justify-between",
        className
      )}
    >
      <Link
        href={`/product/${product.handle}`}
        className="block w-full aspect-square overflow-hidden rounded-none bg-white relative flex items-center justify-center"
        prefetch
      >
        <ProductCardImageSlider
          images={productImages}
          alt={product.featuredImage.altText || product.title}
          paddingClass="p-0"
          imageClassName="object-contain size-full"
        />
        {isScheduled ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-amber-500 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-xl border border-amber-600 shadow-xl tracking-widest uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-950" />
              <span>{formatReleaseDateBadge(product.releaseDate)}</span>
            </span>
          </div>
        ) : isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-neutral-950 text-white font-black text-xs px-3 py-1.5 rounded-xl border border-neutral-700 shadow-xl tracking-widest uppercase">
              {translateUiText("SOLD OUT", currentLang)}
            </span>
          </div>
        ) : null}
      </Link>

      <div className="w-full">
        <FeaturedProductLabel product={product} />
      </div>
    </div>
  );
}
