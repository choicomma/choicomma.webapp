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
import { Sparkles, Plus, Clock, ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { getAvailableCoupons } from "@/lib/membership/coupons";

import { translateProductTitle, translateProductDescription, translateUiText, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";

export const ProductCard = ({ product }: { product: Product }) => {
  const [currentLang, setCurrentLang] = React.useState("ko");
  const [timeSaleDiscount, setTimeSaleDiscount] = React.useState<number | null>(null);
  const [secretSaleInfo, setSecretSaleInfo] = React.useState<{ discount: number; title?: string } | null>(null);
  const [bestCouponDiscount, setBestCouponDiscount] = React.useState<number>(0);
  const [bestCouponTitle, setBestCouponTitle] = React.useState<string>("");

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

  const basePrice = parseFloat(product.priceRange?.minVariantPrice?.amount || (product as any).price || "0");
  const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || (product as any).price || "0");
  const origPriceNum = maxPrice > basePrice ? maxPrice : basePrice;

  // Calculate Best Available Coupon for this Customer
  React.useEffect(() => {
    const updateCouponStatus = () => {
      if (typeof window === "undefined") return;
      try {
        const isLoggedInFlag = localStorage.getItem("is_logged_in") === "true";
        const userName = localStorage.getItem("membership_user_name");
        const isLogged = isLoggedInFlag || Boolean(userName && userName.trim().length > 0);

        if (!isLogged) {
          setBestCouponDiscount(0);
          setBestCouponTitle("");
          return;
        }

        // Check if Time Sale is active for this product
        const isTimeSaleActive = timeSaleDiscount !== null && timeSaleDiscount > 0;
        const allowCouponInTimeSale = (product as any).timeSaleAllowCoupon !== false;

        // 타임세일 중인데 해당 상품의 타임세일 설정에서 쿠폰 적용이 비활성화된 경우 제외
        if (isTimeSaleActive && !allowCouponInTimeSale) {
          setBestCouponDiscount(0);
          setBestCouponTitle("");
          return;
        }

        const email = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
        const grade = (localStorage.getItem("user_grade") || localStorage.getItem("user_role") || "GENERAL").toUpperCase();
        const availableCoupons = getAvailableCoupons(email, grade);

        // 배송비 쿠폰(SHIPPING) 및 사용완료 쿠폰 제외, 상품 할인 가능한 쿠폰만 필터링
        const eligibleCoupons = availableCoupons.filter(
          (c) => c.type !== "SHIPPING" && !c.isUsed && c.isActive !== false
        );

        if (eligibleCoupons.length === 0) {
          setBestCouponDiscount(0);
          setBestCouponTitle("");
          return;
        }

        // 쿠폰 할인 계산 기준 금액 (타임세일 적용 시 타임세일가, 아닐 시 정상가)
        const currentTargetPrice = isTimeSaleActive
          ? Math.round(origPriceNum * (1 - (timeSaleDiscount || 0) / 100))
          : origPriceNum;

        let maxDiscount = 0;
        let bestTitle = "";

        // 보유 쿠폰 중 가장 할인 금액이 큰 쿠폰 1개 자동 선택
        for (const coupon of eligibleCoupons) {
          if (coupon.minOrderAmount && currentTargetPrice < coupon.minOrderAmount) {
            continue;
          }

          let discountVal = 0;
          const isPercent =
            (coupon.discount && coupon.discount.includes("%")) ||
            (coupon.discountAmount > 0 && coupon.discountAmount <= 99 && (coupon as any).discountType === "RATE");

          if (isPercent) {
            discountVal = Math.round(currentTargetPrice * (coupon.discountAmount / 100));
          } else {
            discountVal = coupon.discountAmount || 0;
          }

          if (discountVal > currentTargetPrice) {
            discountVal = currentTargetPrice;
          }

          if (discountVal > maxDiscount) {
            maxDiscount = discountVal;
            bestTitle = coupon.title;
          }
        }

        setBestCouponDiscount(maxDiscount);
        setBestCouponTitle(bestTitle);
      } catch (e) {
        setBestCouponDiscount(0);
        setBestCouponTitle("");
      }
    };

    updateCouponStatus();
    window.addEventListener("storage", updateCouponStatus);
    window.addEventListener("auth_changed", updateCouponStatus);
    window.addEventListener("coupons_updated", updateCouponStatus);
    window.addEventListener("secret_timesales_updated", updateCouponStatus);
    window.addEventListener("admin_products_updated", updateCouponStatus);
    return () => {
      window.removeEventListener("storage", updateCouponStatus);
      window.removeEventListener("auth_changed", updateCouponStatus);
      window.removeEventListener("coupons_updated", updateCouponStatus);
      window.removeEventListener("secret_timesales_updated", updateCouponStatus);
      window.removeEventListener("admin_products_updated", updateCouponStatus);
    };
  }, [product, timeSaleDiscount, origPriceNum]);

  const isTimeSaleActive = timeSaleDiscount !== null && timeSaleDiscount > 0;
  const timeSalePrice = isTimeSaleActive
    ? Math.round(origPriceNum * (1 - (timeSaleDiscount || 0) / 100))
    : origPriceNum;

  let finalPriceNum = isTimeSaleActive ? timeSalePrice : origPriceNum;
  let strikethroughPriceNum: number | null = null;

  if (isTimeSaleActive) {
    strikethroughPriceNum = origPriceNum;
    if (bestCouponDiscount > 0) {
      finalPriceNum = Math.max(0, timeSalePrice - bestCouponDiscount);
    }
  } else if (bestCouponDiscount > 0) {
    strikethroughPriceNum = origPriceNum;
    finalPriceNum = Math.max(0, origPriceNum - bestCouponDiscount);
  }

  const currCode = product.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "KRW";

  return (
    <Link
      href={`/product/${product.handle || "item"}`}
      className="group relative flex flex-col items-center justify-between aspect-[4/5] overflow-hidden border-b md:border-r border-neutral-200 bg-white w-full"
    >
      {/* 1. Badges: Moved to Top (상단으로 위치 변경) */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center gap-1.5 flex-wrap z-20 pointer-events-none">
        {(product as any).productLabel && (
          <span
            className={`text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm shrink-0 whitespace-nowrap shadow-xs ${
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

        {secretSaleInfo ? (
          <span className="text-[11px] sm:text-xs px-2.5 py-1 font-black uppercase tracking-wider rounded-sm bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 flex items-center gap-1 border border-amber-400 shadow-xs shrink-0 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950 shrink-0 animate-spin-slow" />
            <span>SECRET SALE {secretSaleInfo.discount}% OFF</span>
          </span>
        ) : timeSaleDiscount !== null ? (
          <span className="text-[11px] sm:text-xs px-2.5 py-1 font-black uppercase tracking-wider rounded-sm bg-white text-neutral-950 flex items-center gap-1 border border-neutral-300 shadow-xs shrink-0 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-neutral-950 shrink-0" />
            <span>TIME SALE {timeSaleDiscount}% OFF</span>
          </span>
        ) : null}
        {/* 쿠폰 최대할인 뱃지 */}
        {bestCouponDiscount > 0 && (
          <span className="text-[11px] sm:text-xs px-2.5 py-1 font-black uppercase tracking-wider rounded-sm bg-neutral-900 text-white flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap">
            <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>쿠폰 (-{bestCouponDiscount.toLocaleString()}원)</span>
          </span>
        )}
        {/* 오픈 예정 / 품절 Badge: 가장 마지막에 배치 */}
        {product.releaseDate && new Date(product.releaseDate).getTime() > Date.now() ? (
          <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-amber-500 text-neutral-950 shadow-xs shrink-0 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-neutral-950" />
            <span>오픈 예정</span>
          </span>
        ) : product.availableForSale === false ? (
          <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white shadow-xs shrink-0 whitespace-nowrap">
            품절
          </span>
        ) : null}
      </div>

      {/* 1:1 Square Product Image Area with White Background (상단 뱃지와의 여백을 위해 mt-8 sm:mt-10 적용) */}
      <div className="relative w-full aspect-square bg-white flex items-center justify-center p-5 sm:p-7 md:p-7 mt-8 sm:mt-10">
        <Image
          src={product.featuredImage?.url || "/product_1.webp"}
          alt={product.title || "Product"}
          fill
          unoptimized={true}
          className="object-contain transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Bottom Bar: Title on Top (Single Full Line) & Price on Bottom */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex flex-col gap-1.5 z-10 w-full bg-gradient-to-t from-white via-white/80 to-transparent pt-8">
        {/* 2. 상품명은 한줄로 변경 (모바일에서 2배 크기, PC는 기존 md:text-lg 유지) */}
        <span className="text-2xl sm:text-3xl md:text-lg font-black text-neutral-950 uppercase tracking-tight truncate block w-full leading-tight md:leading-normal">
          {product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name"}
        </span>

        {/* 3. 가격은 하단으로 위치 변경 & 4. 빗금친 원래 가격이 할인 가격 바로 옆에 붙어있도록 수정 (justify-end) */}
        <div className="flex items-baseline justify-end gap-2 sm:gap-2.5 w-full">
          {strikethroughPriceNum !== null && (
            <span className="text-xs sm:text-sm text-neutral-400 line-through font-bold whitespace-nowrap notranslate" translate="no">
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
