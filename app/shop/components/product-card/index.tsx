"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { ProductImage } from "./product-image";
import { QuickOptionModal } from "@/components/products/quick-option-modal";
import { FeaturedProductLabel } from "@/components/products/featured-product-label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";

import { translateProductTitle, translateProductDescription, translateUiText, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";

export const ProductCard = ({ product }: { product: Product }) => {
  const [currentLang, setCurrentLang] = React.useState("ko");
  const [timeSaleDiscount, setTimeSaleDiscount] = React.useState<number | null>(null);

  React.useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  React.useEffect(() => {
    const updateTimeSaleStatus = () => {
      if (typeof window === "undefined") return;
      try {
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
            isSelected = parsedIds.some((id: any) => String(id) === String(product.id));
          } catch (e) {}
        } else {
          isSelected = (product as any).isTimeSale === true || product.categoryId === "timesale" || product.tags?.includes("TIMESALE");
        }

        if (isSelected || (product as any).isTimeSale === true) {
          let discount = (product as any).timeSaleDiscountRate || (product as any).discountRate || 35;
          const savedDisc = localStorage.getItem("secret_timesale_discount");
          if (savedDisc && !isNaN(parseInt(savedDisc))) {
            discount = parseInt(savedDisc);
          }
          setTimeSaleDiscount(discount);
        } else {
          setTimeSaleDiscount(null);
        }
      } catch (e) {}
    };

    updateTimeSaleStatus();
    window.addEventListener("storage", updateTimeSaleStatus);
    window.addEventListener("admin_products_updated", updateTimeSaleStatus);
    return () => {
      window.removeEventListener("storage", updateTimeSaleStatus);
      window.removeEventListener("admin_products_updated", updateTimeSaleStatus);
    };
  }, [product]);

  const basePrice = parseFloat(product.priceRange?.minVariantPrice?.amount || (product as any).price || "0");
  const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || (product as any).price || "0");
  const origPriceNum = maxPrice > basePrice ? maxPrice : basePrice;

  let finalPriceNum = basePrice;
  let strikethroughPriceNum: number | null = null;

  if (timeSaleDiscount !== null && timeSaleDiscount > 0) {
    strikethroughPriceNum = origPriceNum;
    finalPriceNum = Math.round(origPriceNum * (1 - timeSaleDiscount / 100));
  }

  const currCode = product.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "KRW";

  return (
    <Link
      href={`/product/${product.handle || "item"}`}
      className="group relative flex flex-col items-center justify-center aspect-[4/5] overflow-hidden border-b md:border-r border-neutral-200 bg-white w-full"
    >
      <Image
        src={product.featuredImage?.url || "/product_1.webp"}
        alt={product.title || "Product"}
        fill
        unoptimized={true}
        className="object-contain p-6 sm:p-10 md:p-8 transition-transform duration-700 group-hover:scale-105"
      />

      {/* Bottom Bar: Title & Badges on Left, Price on Right */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 flex items-end justify-between gap-3 z-10 w-full bg-gradient-to-t from-white/95 via-white/60 to-transparent pt-10">
        {/* Left Side: Badges & Product Name */}
        <div className="flex flex-col items-start min-w-0 pr-3">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {/* 품절 (SOLD OUT) Badge */}
            {product.availableForSale === false && (
              <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white shadow-2xs">
                품절 (SOLD OUT)
              </span>
            )}
            {(product as any).productLabel && (
              <span
                className={`text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm ${
                  (product as any).productLabel === "BLACK_LABEL"
                    ? "bg-black text-white"
                    : (product as any).productLabel === "PREMIUM"
                    ? "bg-neutral-600 text-white"
                    : "bg-neutral-200 text-neutral-800"
                }`}
              >
                {(product as any).productLabel.replace("_", " ")}
              </span>
            )}
            {/* Black-outlined Badge for Fabric Composition (체크박스 활성화된 경우만 노출) */}
            {(product as any).showFabricBadge && Boolean((product as any).fabricComposition || (product as any).fabric || (product as any).fabricMaterial) && (
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-0.5 uppercase tracking-wider rounded-sm bg-white text-black border border-black shadow-2xs">
                {String((product as any).fabricComposition || (product as any).fabric || (product as any).fabricMaterial).replace(/^ORIGIN:\s*/i, "").trim()}
              </span>
            )}
            {timeSaleDiscount !== null && (
              <span className="text-[11px] sm:text-xs px-2.5 py-1 font-black uppercase tracking-wider rounded-sm bg-white text-neutral-950 flex items-center gap-1 border border-neutral-300 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-neutral-950 shrink-0" />
                <span>TIME SALE {timeSaleDiscount}% OFF</span>
              </span>
            )}
          </div>
          <span className="text-sm sm:text-base md:text-lg font-extrabold text-neutral-950 uppercase tracking-tight line-clamp-1">
            {product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name"}
          </span>
        </div>

        {/* Right Side: Price Display (Mobile & Desktop Unified) */}
        <div className="flex flex-col items-end shrink-0 leading-tight notranslate" translate="no">
          {strikethroughPriceNum !== null && (
            <span className="text-xs sm:text-sm text-neutral-400 line-through font-bold mb-0.5 notranslate" translate="no">
              {formatPrice(strikethroughPriceNum.toString(), currCode)}
            </span>
          )}
          <span className="text-base sm:text-lg md:text-xl font-black text-neutral-950 uppercase whitespace-nowrap notranslate" translate="no">
            {formatPrice(finalPriceNum.toString(), currCode)}
          </span>
        </div>
      </div>
    </Link>
  );
};
