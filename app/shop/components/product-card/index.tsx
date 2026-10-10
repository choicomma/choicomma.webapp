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
  const [secretSaleInfo, setSecretSaleInfo] = React.useState<{ discount: number; title?: string } | null>(null);

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
        const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
        const userRole = localStorage.getItem("user_role") || "";
        const isAdmin = userRole === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

        // Check active Secret Time Sales
        const secretSalesRaw = localStorage.getItem("admin_secret_timesales");
        let activeSecretDiscount: number | null = null;
        let activeSecretTitle: string | undefined = undefined;

        if (secretSalesRaw) {
          try {
            const secretSalesList: any[] = JSON.parse(secretSalesRaw);
            for (const sale of secretSalesList) {
              if (sale.status !== "active") continue;
              const matchesProduct = (sale.productIds || []).some(
                (id: string) => String(id) === String(product.id)
              );
              if (!matchesProduct) continue;

              // Check if user is targeted by Email or Grade, or Admin
              const isEmailTargeted = Boolean(
                userEmail &&
                  (sale.targetCustomerEmails || []).some(
                    (em: string) => em.toLowerCase().trim() === userEmail
                  )
              );
              const isGradeTargeted = Boolean(
                (sale.targetGrades || []).length > 0 &&
                  (sale.targetGrades.includes("ALL") ||
                    sale.targetGrades.includes(userRole?.toUpperCase()) ||
                    (userRole?.toUpperCase().includes("VIP") && sale.targetGrades.includes("VIP")))
              );

              if (isEmailTargeted || isGradeTargeted || isAdmin) {
                activeSecretDiscount = Number(sale.discountRate) || 30;
                activeSecretTitle = sale.title;
                break;
              }
            }
          } catch (e) {}
        }

        if (activeSecretDiscount !== null) {
          setSecretSaleInfo({ discount: activeSecretDiscount, title: activeSecretTitle });
          setTimeSaleDiscount(activeSecretDiscount);
          return;
        } else {
          setSecretSaleInfo(null);
        }

        const globalStatus = localStorage.getItem("secret_timesale_status");
        if (globalStatus === "ended" || (product as any).isTimeSale === false) {
          setTimeSaleDiscount(null);
          return;
        }

        let currentProd = product;

        let isSelected = false;
        const savedIds = localStorage.getItem("secret_timesale_product_ids");
        if (savedIds !== null) {
          try {
            const parsedIds: any[] = JSON.parse(savedIds);
            isSelected = parsedIds.some((id: any) => String(id) === String(currentProd.id) || (currentProd.handle && String(id) === String(currentProd.handle)));
          } catch (e) {}
        } else {
          isSelected = (currentProd as any).isTimeSale === true || currentProd.categoryId === "timesale" || currentProd.tags?.includes("TIMESALE");
        }

        const isTimeSale =
          isSelected ||
          (currentProd as any).isTimeSale === true ||
          currentProd.categoryId === "timesale" ||
          currentProd.tags?.includes("TIMESALE");

        if (isTimeSale) {
          let itemDiscount: number | null = null;
          const itemSettingsSaved = localStorage.getItem("secret_timesale_item_settings");
          if (itemSettingsSaved) {
            try {
              const parsedSettings = JSON.parse(itemSettingsSaved);
              const pId = String(currentProd.id || "");
              const pHandle = String(currentProd.handle || "");
              if (parsedSettings[pId]?.discountRate) {
                itemDiscount = parseInt(parsedSettings[pId].discountRate);
              } else if (parsedSettings[pHandle]?.discountRate) {
                itemDiscount = parseInt(parsedSettings[pHandle].discountRate);
              }
            } catch (e) {}
          }

          let discount =
            (currentProd as any).timeSaleDiscountRate ||
            itemDiscount ||
            (currentProd as any).discountRate;

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
      } catch (e) {}
    };

    updateTimeSaleStatus();
    window.addEventListener("storage", updateTimeSaleStatus);
    window.addEventListener("auth_changed", updateTimeSaleStatus);
    window.addEventListener("secret_timesales_updated", updateTimeSaleStatus);
    window.addEventListener("admin_products_updated", updateTimeSaleStatus);
    return () => {
      window.removeEventListener("storage", updateTimeSaleStatus);
      window.removeEventListener("auth_changed", updateTimeSaleStatus);
      window.removeEventListener("secret_timesales_updated", updateTimeSaleStatus);
      window.removeEventListener("admin_products_updated", updateTimeSaleStatus);
    };
  }, [product]);

  const parseSafeAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (typeof val === "object") {
      const inner = val.amount ?? val.value ?? "0";
      const parsed = parseFloat(String(inner).replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const rawMin = product.priceRange?.minVariantPrice?.amount ?? (product as any).price;
  const rawMax = product.priceRange?.maxVariantPrice?.amount ?? (product as any).price;
  const basePrice = parseSafeAmount(rawMin);
  const maxPrice = parseSafeAmount(rawMax);
  const origPriceNum = maxPrice > basePrice ? maxPrice : (basePrice > 0 ? basePrice : 0);

  const isTimeSaleActive = timeSaleDiscount !== null && timeSaleDiscount > 0;
  const timeSalePrice = isTimeSaleActive
    ? Math.round(origPriceNum * (1 - (timeSaleDiscount || 0) / 100))
    : origPriceNum;

  // 상품가격: 쿠폰적용가는 제외하고 타임세일 적용가만 반영
  const finalPriceNum = timeSalePrice;
  const strikethroughPriceNum = isTimeSaleActive && timeSalePrice < origPriceNum ? origPriceNum : null;

  const currCode = product.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "KRW";

  return (
    <Link
      href={`/product/${product.handle || "item"}`}
      className="group relative flex flex-col items-center justify-between aspect-[4/5] overflow-hidden border-b border-r border-neutral-200 bg-white w-full"
    >
      {/* 1. Badges: Moved to Top (상단으로 위치 변경) */}
      <div className="absolute top-2 inset-x-2 sm:top-3 sm:inset-x-3 md:top-4 md:inset-x-4 flex items-center gap-1 sm:gap-1.5 flex-wrap z-20 pointer-events-none">
        {(product as any).productLabel && (
          <span
            className={`text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs shrink-0 whitespace-nowrap shadow-2xs ${
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

        {/* 오픈 예정 / 품절 Badge: 가장 마지막에 배치 */}
        {product.releaseDate && new Date(product.releaseDate).getTime() > Date.now() ? (
          <span className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-amber-500 text-neutral-950 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-neutral-950" />
            <span>오픈 예정</span>
          </span>
        ) : product.availableForSale === false ? (
          <span className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
            품절
          </span>
        ) : null}
      </div>

      {/* 1:1 Square Product Image Area with White Background */}
      <div className="relative w-full aspect-square bg-white flex items-center justify-center p-3 sm:p-5 md:p-7 mt-6 sm:mt-8 md:mt-10">
        <Image
          src={product.featuredImage?.url || "/product_1.webp"}
          alt={product.title || "Product"}
          fill
          unoptimized={true}
          className="object-contain transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Bottom Bar: Title on Top & Price on Bottom */}
      <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4 md:p-5 flex flex-col gap-1 sm:gap-1.5 z-10 w-full bg-gradient-to-t from-white via-white/80 to-transparent pt-6 sm:pt-8">
        {/* 상품명은 한줄로 truncate 유지 (모바일 2열에 최적화된 텍스트 크기) */}
        <span className="text-xs sm:text-base md:text-lg font-black text-neutral-950 uppercase tracking-tight truncate block w-full leading-tight md:leading-normal">
          {product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name"}
        </span>

        {/* 가격 정보 */}
        <div className="flex items-baseline justify-end gap-1.5 sm:gap-2 md:gap-2.5 w-full">
          {strikethroughPriceNum !== null && (
            <span className="text-[10px] sm:text-xs md:text-sm text-neutral-400 line-through font-bold whitespace-nowrap notranslate" translate="no">
              {formatPrice(strikethroughPriceNum.toString(), currCode)}
            </span>
          )}
          <span className="text-xs sm:text-base md:text-xl font-black text-neutral-950 uppercase whitespace-nowrap notranslate" translate="no">
            {formatPrice(finalPriceNum.toString(), currCode)}
          </span>
        </div>
      </div>
    </Link>
  );
};
