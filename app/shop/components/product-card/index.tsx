"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Product } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { ProductImage } from "./product-image";
import { QuickOptionModal } from "@/components/products/quick-option-modal";
import { Sparkles, Plus, Clock, ChevronLeft, ChevronRight, Lock, Sliders, Edit3, ExternalLink, X } from "lucide-react";

import { translateProductTitle, translateProductDescription, translateUiText, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";
import { ProductCardImageSlider, extractProductImages } from "@/components/products/product-card-image-slider";
import { reorderProduct } from "@/lib/products/reorder-helper";
import { formatReleaseDateBadge } from "@/lib/product-availability";
import { toast } from "sonner";

export interface ProductCardProps {
  product: Product;
  onAdminClick?: (product: Product) => void;
  onAdminEdit?: (product: Product) => void;
  isAdminOverlayOpen?: boolean;
  onAdminOverlayClose?: () => void;
  onMoveOrder?: (product: Product, direction: "prev" | "next") => void;
  isFirst?: boolean;
  isLast?: boolean;
}

interface MarqueeProductTitleProps {
  title: string;
  className?: string;
}

export const MarqueeProductTitle = ({ title, className = "" }: MarqueeProductTitleProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 1);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 200);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => checkOverflow());
      ro.observe(el);
    }
    window.addEventListener("resize", checkOverflow);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full whitespace-nowrap relative select-none"
    >
      {/* Off-screen measurement span to accurately compare scrollWidth with container clientWidth */}
      <span
        ref={textRef}
        aria-hidden="true"
        className={`invisible pointer-events-none whitespace-nowrap fixed left-[-9999px] top-[-9999px] ${className}`}
      >
        {title}
      </span>

      {isOverflowing ? (
        <div
          className="inline-flex will-change-transform hover:[animation-play-state:paused] active:[animation-play-state:paused]"
          style={{
            display: "inline-flex",
            width: "max-content",
            animation: "marquee 14s linear infinite",
          }}
        >
          <span className={`pr-8 shrink-0 whitespace-nowrap ${className}`}>
            {title}
          </span>
          <span className={`pr-8 shrink-0 whitespace-nowrap ${className}`} aria-hidden="true">
            {title}
          </span>
        </div>
      ) : (
        <span className={`block truncate w-full ${className}`}>
          {title}
        </span>
      )}
    </div>
  );
};

export const ProductCard = ({
  product,
  onAdminClick,
  onAdminEdit,
  isAdminOverlayOpen,
  onAdminOverlayClose,
  onMoveOrder,
  isFirst = false,
  isLast = false,
}: ProductCardProps) => {
  const router = useRouter();
  const [internalOverlayOpen, setInternalOverlayOpen] = React.useState(false);
  const isOverlayActive = Boolean(isAdminOverlayOpen !== undefined ? isAdminOverlayOpen : internalOverlayOpen);
  const [isMoving, setIsMoving] = React.useState(false);

  const handleMoveOrder = async (direction: "prev" | "next") => {
    if (isMoving) return;
    if (onMoveOrder) {
      onMoveOrder(product, direction);
      return;
    }
    try {
      setIsMoving(true);
      const res = await reorderProduct(String(product.id), direction);
      if (res.success) {
        toast.success(
          direction === "prev"
            ? `'${product.title}' 상품이 앞으로 이동되었습니다.`
            : `'${product.title}' 상품이 뒤로 이동되었습니다.`
        );
      } else if (res.error) {
        toast.info(res.error);
      }
    } finally {
      setIsMoving(false);
    }
  };

  const handleCloseOverlay = () => {
    if (onAdminOverlayClose) {
      onAdminOverlayClose();
    } else {
      setInternalOverlayOpen(false);
    }
  };
  const [currentLang, setCurrentLang] = React.useState("ko");
  const [timeSaleDiscount, setTimeSaleDiscount] = React.useState<number | null>(null);
  const [secretSaleInfo, setSecretSaleInfo] = React.useState<{ discount: number; title?: string } | null>(null);
  const [isAdminUser, setIsAdminUser] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const userRole = (localStorage.getItem("user_role") || "").toLowerCase().trim();
      const userGrade = (localStorage.getItem("user_grade") || "").toUpperCase().trim();
      const isAdmin =
        userRole === "admin" ||
        userRole === "staff" ||
        userGrade === "STAFF" ||
        sessionStorage.getItem("choicomma_admin_authenticated") === "true";
      setIsAdminUser(isAdmin);
    }
  }, []);

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
        const userGrade = (localStorage.getItem("user_grade") || localStorage.getItem("membership_user_grade") || userRole || "").toUpperCase().trim();
        const isAdmin =
          userRole === "admin" ||
          userRole === "staff" ||
          userGrade === "STAFF" ||
          sessionStorage.getItem("choicomma_admin_authenticated") === "true";

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
                userGrade &&
                  (sale.targetGrades || []).length > 0 &&
                  (sale.targetGrades.includes("ALL") ||
                    sale.targetGrades.includes(userGrade) ||
                    sale.targetGrades.includes(userRole?.toUpperCase()) ||
                    (userGrade.includes("VIP") && sale.targetGrades.includes("VIP")) ||
                    (userGrade.includes("VVIP") && (sale.targetGrades.includes("VVIP") || sale.targetGrades.includes("VIP"))))
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

          const tagRate = Array.isArray(currentProd.tags)
            ? currentProd.tags.find((t: any) => typeof t === "string" && t.startsWith("tsrate:"))?.replace("tsrate:", "")
            : null;
          const parsedTagRate = tagRate && !isNaN(Number(tagRate)) ? Number(tagRate) : null;

          let discount =
            (currentProd as any).timeSaleDiscountRate ||
            parsedTagRate ||
            itemDiscount ||
            (currentProd as any).discountRate;

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

  const productImages = React.useMemo(() => extractProductImages(product), [product]);

  return (
    <div
      onClick={(e) => {
        if (isAdminUser && (onAdminClick || onAdminEdit)) {
          e.preventDefault();
          e.stopPropagation();
          if (onAdminClick) {
            onAdminClick(product);
          } else {
            setInternalOverlayOpen(true);
          }
        } else {
          router.push(`/product/${product.handle || "item"}`);
        }
      }}
      className={`group relative flex flex-col items-center justify-between aspect-[3/4] sm:aspect-[4/5] overflow-hidden border-b border-r border-neutral-200 bg-white w-full cursor-pointer select-none ${
        isOverlayActive ? "z-30 ring-2 ring-blue-600 shadow-xl" : ""
      }`}
    >
      {/* 1. Badges: Moved to Top (상단으로 위치 변경) - 블랙라벨/프리미엄은 PC(md 이상)에서만 노출, 모바일 미노출 */}
      <div className="absolute top-2 inset-x-2 sm:top-3 sm:inset-x-3 md:top-4 md:inset-x-4 flex items-center gap-1 sm:gap-1.5 flex-wrap z-20 pointer-events-none">
        {(product as any).productLabel && (
          <span
            className={`hidden md:inline-flex text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs shrink-0 whitespace-nowrap shadow-2xs ${
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

        {/* 타임세일 할인율 Badge: 모바일에선 퍼센트와 OFF만 노출, PC에선 전체 라벨 및 아이콘 노출 */}
        {isTimeSaleActive && timeSaleDiscount && (
          secretSaleInfo ? (
            <span
              className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-neutral-950 text-amber-300 border border-neutral-700 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1"
              title={secretSaleInfo.title ? `[시크릿 VIP 특가] ${secretSaleInfo.title}` : "[시크릿 VIP 특가]"}
            >
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0 hidden md:inline-block" />
              <span className="hidden md:inline">SECRET VIP </span>
              <span>{timeSaleDiscount}% OFF</span>
            </span>
          ) : (
            <span className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-red-600 text-white shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
              <span className="hidden md:inline">🔥 TIME SALE </span>
              <span>{timeSaleDiscount}% OFF</span>
            </span>
          )
        )}

        {/* 오픈 예정 / 품절 Badge: 가장 마지막에 배치 */}
        {product.releaseDate && new Date(product.releaseDate).getTime() > Date.now() ? (
          <span className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-amber-500 text-neutral-950 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-neutral-950" />
            <span className="md:hidden">{formatReleaseDateBadge(product.releaseDate)}</span>
            <span className="hidden md:inline">오픈 예정</span>
          </span>
        ) : ((product as any).stock !== undefined &&
            (product as any).stock !== null &&
            Number((product as any).stock) <= 0) ||
          (product.availableForSale === false && !(product.releaseDate && new Date(product.releaseDate).getTime() <= Date.now())) ? (
          <span className="text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
            품절
          </span>
        ) : null}
      </div>

      {/* 1:1 Square Product Image Area with White Background - 뱃지 겹침 방지 상단 여백(mt-10), 상품명 여백 확보 하단 여백(pb-20) */}
      <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2.5 pt-2 pb-20 sm:p-5 md:p-7 mt-10 sm:mt-8 md:mt-10 overflow-hidden">
        <ProductCardImageSlider
          images={productImages}
          alt={product.title || "Product"}
          paddingClass="p-0"
          imageClassName="object-contain transition-transform duration-700 group-hover:scale-105"
        />

        {/* 관리자 상품 액션 오버레이 (제품 이미지 바로 위에 노출) */}
        {isOverlayActive && (
          <div
            className="absolute inset-0 z-30 bg-neutral-950/85 backdrop-blur-xs flex flex-col justify-between p-3 sm:p-4 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* 상단: 관리자 라벨 & 닫기 버튼 */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <Sliders className="w-2.5 h-2.5" />
                <span>관리자</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseOverlay();
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            {/* 중앙: 상품 수정 / 상세페이지 / 순서 변경 버튼 */}
            <div className="flex flex-col gap-1.5 sm:gap-2 w-full my-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseOverlay();
                  onAdminEdit?.(product);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-white text-neutral-950 hover:bg-neutral-100 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>상품 수정</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseOverlay();
                  router.push(`/product/${product.handle || product.id}`);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-2 bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/20 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                <span>상세페이지</span>
              </button>

              {/* 순서 변경 버튼: 앞으로 가기 / 뒤로 가기 */}
              <div className="grid grid-cols-2 gap-1.5 w-full pt-0.5">
                <button
                  type="button"
                  disabled={isFirst || isMoving}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMoveOrder("prev");
                  }}
                  title={isFirst ? "이미 목록의 첫 번째 상품입니다." : "상품 순서를 한 칸 앞으로 이동합니다."}
                  className="w-full flex items-center justify-center gap-1 py-2 sm:py-2 px-1 bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/20 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>앞으로 가기</span>
                </button>

                <button
                  type="button"
                  disabled={isLast || isMoving}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMoveOrder("next");
                  }}
                  title={isLast ? "이미 목록의 마지막 상품입니다." : "상품 순서를 한 칸 뒤로 이동합니다."}
                  className="w-full flex items-center justify-center gap-1 py-2 sm:py-2 px-1 bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/20 rounded-lg sm:rounded-xl font-bold text-[11px] sm:text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>뒤로 가기</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* 하단: 안내 텍스트 */}
            <div className="text-center text-[9px] sm:text-[10px] text-white/50 font-medium">
              순서 이동 또는 작업을 선택하세요
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Title on Top & Price on Bottom - 상품명 폰트 2배(text-2xl), 가격 폰트는 그대로 유지 */}
      <div className="absolute bottom-0 inset-x-0 p-2 sm:p-4 md:p-5 pb-1.5 sm:pb-4 flex flex-col gap-0.5 sm:gap-1.5 z-10 w-full bg-gradient-to-t from-white via-white/95 to-transparent pt-2 sm:pt-8">
        <MarqueeProductTitle
          title={product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name"}
          className="text-2xl sm:text-base md:text-lg font-black text-neutral-950 uppercase tracking-tight block w-full leading-tight md:leading-normal"
        />

        {/* 가격 정보: 모바일 폰트 1.5배 확대 (text-lg / text-sm) 및 깔끔한 가로 정렬 */}
        <div className="flex items-baseline justify-end gap-1.5 sm:gap-2 flex-wrap sm:flex-row sm:items-baseline sm:justify-end sm:gap-2 md:gap-2.5">
          {/* 정상가 (취소선) */}
          {strikethroughPriceNum !== null && (
            <span
              className="text-sm sm:text-xs md:text-sm text-neutral-400 line-through font-bold whitespace-nowrap sm:order-2 notranslate"
              translate="no"
            >
              {formatPrice(strikethroughPriceNum.toString(), currCode)}
            </span>
          )}

          {/* 할인가 및 할인 퍼센트 */}
          <div className="flex items-baseline justify-end gap-1.5 sm:gap-2 sm:contents">
            {isTimeSaleActive && timeSaleDiscount && (
              <span
                className="text-lg sm:text-base md:text-lg font-black text-red-600 whitespace-nowrap sm:order-1 notranslate"
                translate="no"
              >
                {timeSaleDiscount}%
              </span>
            )}
            <span
              className="text-lg sm:text-base md:text-xl font-black text-neutral-950 uppercase whitespace-nowrap sm:order-3 notranslate"
              translate="no"
            >
              {formatPrice(finalPriceNum.toString(), currCode)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
