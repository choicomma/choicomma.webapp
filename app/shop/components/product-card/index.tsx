"use client";

import React, { Suspense } from "react";
import Link from "next/link";
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
  const [displayTitle, setDisplayTitle] = React.useState(product.title);
  const [displayDesc, setDisplayDesc] = React.useState(
    product.description || "감성적인 디자인과 세련된 실루엣이 돋보이는 대표 베스트 아이템."
  );

  React.useEffect(() => {
    const lang = getCurrentLanguage();
    setCurrentLang(lang);

    const updateTranslations = (targetLang: string) => {
      if (targetLang === "ko") {
        setDisplayTitle(product.title);
        setDisplayDesc(product.description || "감성적인 디자인과 세련된 실루엣이 돋보이는 대표 베스트 아이템.");
        return;
      }
      setDisplayTitle(translateProductTitle(product.title, targetLang));
      setDisplayDesc(translateProductDescription(product.description || "감성적인 디자인과 세련된 실루엣이 돋보이는 대표 베스트 아이템.", targetLang));

      fetchAsyncTranslation(product.title, targetLang, "title").then((res) => {
        if (res) setDisplayTitle(res);
      });
      if (product.description) {
        fetchAsyncTranslation(product.description, targetLang, "ui").then((res) => {
          if (res) setDisplayDesc(res);
        });
      }
    };

    updateTranslations(lang);

    const handleLangChange = () => {
      const newLang = getCurrentLanguage();
      setCurrentLang(newLang);
      updateTranslations(newLang);
    };

    window.addEventListener("language_changed", handleLangChange);
    window.addEventListener("language-changed", handleLangChange);
    return () => {
      window.removeEventListener("language_changed", handleLangChange);
      window.removeEventListener("language-changed", handleLangChange);
    };
  }, [product.title, product.description]);
  const isSetProduct =
    product.tags?.includes("SET_SALE") || product.id.startsWith("set-product-");

  const isChoiceOrSale =
    product.categoryId === "timesale" ||
    product.tags?.includes("TIMESALE") ||
    product.tags?.includes("SET_SALE") ||
    product.id.startsWith("set-product-");

  const isOutOfStock =
    product.availableForSale === false ||
    (product as any).status === "sold_out" ||
    (product as any).isOutOfStock === true ||
    (product as any).inventoryQuantity === 0;

  const rawImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.featuredImage].filter(Boolean);

  const productImages = (rawImages as any[])
    .filter((img): img is NonNullable<typeof img> => img != null && Boolean(img.url))
    .filter((img, index, self) => index === self.findIndex((t) => t.url === img.url));

  if (productImages.length === 0) {
    productImages.push(
      product.featuredImage || { url: "/product_1.webp", altText: product.title, width: 1200, height: 1200 }
    );
  }

  const [currentImgIndex, setCurrentImgIndex] = React.useState(0);

  const [remainingTime, setRemainingTime] = React.useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({ days: "01", hours: "11", minutes: "54", seconds: "02" });

  React.useEffect(() => {
    const updateTime = () => {
      let expiryTime = 0;
      if (typeof window !== "undefined") {
        try {
          const expiriesSaved = localStorage.getItem("secret_timesale_item_expiries");
          if (expiriesSaved) {
            const parsedExpiries = JSON.parse(expiriesSaved);
            if (parsedExpiries[product.id]) {
              expiryTime = parsedExpiries[product.id];
            }
          }

          if (!expiryTime) {
            const itemSettingsSaved = localStorage.getItem("secret_timesale_item_settings");
            if (itemSettingsSaved) {
              const parsedSettings = JSON.parse(itemSettingsSaved);
              if (parsedSettings[product.id]) {
                const { hours, minutes } = parsedSettings[product.id];
                const h = parseInt(hours) || 24;
                const m = parseInt(minutes) || 0;
                expiryTime = Date.now() + (h * 3600 + m * 60) * 1000;
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!expiryTime) {
        expiryTime = Date.now() + (35 * 3600 + 54 * 60 + 2) * 1000;
      }

      const diffSec = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      const d = Math.floor(diffSec / 86400);
      const h = Math.floor((diffSec % 86400) / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      setRemainingTime({
        days: String(d).padStart(2, "0"),
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [product.id]);

  const handlePrevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  // Standard non-CHOI.ce products return original card layout
  if (!isChoiceOrSale) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-white border border-neutral-200/60 rounded-3xl shadow-xs hover:shadow-md transition-all group overflow-hidden w-full relative">
        <Link
          href={`/product/${product.handle}`}
          className="block w-full aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 relative"
          aria-label={`View details for ${product.title}`}
          prefetch
        >
          <Suspense fallback={null}>
            <ProductImage product={product} />
          </Suspense>
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="bg-neutral-950 text-white font-black text-xs px-3.5 py-1.5 rounded-xl border border-neutral-700 shadow-xl tracking-widest uppercase">
                {translateUiText("품절 (SOLD OUT)", currentLang)}
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

  // CHOI.ce category items get the gold luxury sale redesign
  let discountPercent = (product as any).timeSaleDiscountRate || (product as any).discountRate || 35;
  let customDiscountPrice = (product as any).timeSaleDiscountPrice;
  if (typeof window !== "undefined") {
    try {
      const itemSettingsSaved = localStorage.getItem("secret_timesale_item_settings");
      if (itemSettingsSaved) {
        const parsedSettings = JSON.parse(itemSettingsSaved);
        if (parsedSettings[product.id]?.discountRate) {
          discountPercent = parseInt(parsedSettings[product.id].discountRate);
        }
        if (parsedSettings[product.id]?.discountPrice) {
          customDiscountPrice = parsedSettings[product.id].discountPrice;
        }
      } else {
        const savedDiscount = localStorage.getItem("secret_timesale_discount");
        if (savedDiscount && !isNaN(parseInt(savedDiscount))) {
          discountPercent = parseInt(savedDiscount);
        }
      }
    } catch (e) {}
  }

  // Calculate original price for strikethrough display and final discounted price
  const minPriceNum = parseFloat(product.priceRange.minVariantPrice.amount);
  const maxPriceNum = parseFloat(product.priceRange.maxVariantPrice.amount);

  let finalPriceNum: number;
  let originalPriceNum: number;

  if (isSetProduct) {
    finalPriceNum = minPriceNum;
    originalPriceNum = Math.round(finalPriceNum / (1 - discountPercent / 100));
  } else if (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice))) {
    finalPriceNum = parseFloat(customDiscountPrice);
    originalPriceNum = maxPriceNum > minPriceNum ? maxPriceNum : (minPriceNum > finalPriceNum ? minPriceNum : finalPriceNum);
    if (originalPriceNum > finalPriceNum) {
      discountPercent = Math.round((1 - finalPriceNum / originalPriceNum) * 100);
    }
  } else if (maxPriceNum > minPriceNum) {
    finalPriceNum = minPriceNum;
    originalPriceNum = maxPriceNum;
  } else {
    originalPriceNum = minPriceNum;
    finalPriceNum = Math.round(originalPriceNum * (1 - discountPercent / 100));
  }

  let badgeText = `TIME SALE ${discountPercent}% OFF`;

  return (
    <div className="group border border-neutral-200/80 bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between w-full h-full relative">
      {/* Top Image Container with Multi-Image Slider for Set Package Items */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 group/slider">
        <Link
          href={`/product/${product.handle}`}
          className="block size-full relative"
          aria-label={`View details for ${product.title}`}
          prefetch
        >
          {productImages.map((img, idx) => (
            <img
              key={img.url || idx}
              src={img.url || "/product_1.webp"}
              alt={img.altText || product.title}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
                idx === currentImgIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            />
          ))}
        </Link>

        {/* OUT OF STOCK BADGE ONLY */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none">
            <span className="bg-neutral-950 text-white font-black text-xs md:text-sm px-4 py-2 rounded-2xl border border-neutral-700 shadow-2xl tracking-widest uppercase">
              {translateUiText("품절 (SOLD OUT)", currentLang)}
            </span>
          </div>
        )}

        {/* TOP LEFT BADGES CONTAINER */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-none max-w-[90%]">
          {isSetProduct ? (
            <span className="bg-neutral-950/95 backdrop-blur-xs text-white text-[11px] font-black px-3 py-1.5 rounded-xl uppercase shadow-lg flex items-center gap-1.5 border border-neutral-800 tracking-tight">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-white font-extrabold">{badgeText}</span>
            </span>
          ) : (
            <span className="bg-amber-500 text-neutral-950 text-[11px] font-black px-3 py-1.5 rounded-xl uppercase shadow-lg flex items-center gap-1.5 border border-amber-400 tracking-tight">
              <Clock className="w-3.5 h-3.5 text-neutral-950 shrink-0 animate-pulse" />
              <span className="text-neutral-950 font-black">{badgeText}</span>
              <span className="text-neutral-900 font-bold">|</span>
              <span className="text-neutral-950 font-black tracking-tight">
                {remainingTime.days}{translateUiText("일", currentLang)} {remainingTime.hours}{translateUiText("시", currentLang)} {remainingTime.minutes}{translateUiText("분", currentLang)} {remainingTime.seconds}{translateUiText("초", currentLang)}
              </span>
            </span>
          )}
        </div>

        {/* Left / Right Slider Controls for Set Products */}
        {productImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImg}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 bg-neutral-950/80 hover:bg-neutral-950 text-white p-2 rounded-full shadow-lg backdrop-blur-xs opacity-90 sm:opacity-0 group-hover/slider:opacity-100 transition-all cursor-pointer hover:scale-110 active:scale-95"
              aria-label="Previous product image"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={handleNextImg}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 bg-neutral-950/80 hover:bg-neutral-950 text-white p-2 rounded-full shadow-lg backdrop-blur-xs opacity-90 sm:opacity-0 group-hover/slider:opacity-100 transition-all cursor-pointer hover:scale-110 active:scale-95"
              aria-label="Next product image"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col justify-between grow space-y-4">
        <div>
          <Link href={`/product/${product.handle}`}>
            <h4 className="font-extrabold text-base md:text-lg text-neutral-950 group-hover:text-neutral-700 transition-colors line-clamp-1 mb-1">
              {product.title}
            </h4>
          </Link>
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
            {product.description || "감성적인 디자인과 세련된 실루엣이 돋보이는 대표 베스트 아이템."}
          </p>
        </div>

        {/* Price & Quick Action */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div>
            <span className="text-xs text-neutral-400 line-through font-mono font-semibold block">
              {formatPrice(originalPriceNum.toString(), product.currencyCode)}
            </span>
            <span className="text-xl md:text-2xl font-black text-neutral-950 font-mono tracking-tight block">
              {formatPrice(finalPriceNum.toString(), product.currencyCode)}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="bg-neutral-200 text-neutral-500 font-extrabold text-xs px-4 py-2.5 rounded-2xl shadow-none cursor-not-allowed border border-neutral-300"
            >
              {translateUiText("품절 (SOLD OUT)", currentLang)}
            </button>
          ) : (
            <Suspense fallback={null}>
              <QuickOptionModal
                product={product}
                trigger={
                  <button
                    type="button"
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    {translateUiText(isSetProduct ? "세트할인 담기" : "타임세일 담기", currentLang)}
                  </button>
                }
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};
