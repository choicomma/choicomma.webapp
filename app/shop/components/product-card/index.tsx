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

import {
  translateProductTitle,
  translateProductDescription,
  translateUiText,
  getCurrentLanguage,
  fetchAsyncTranslation,
  useProductTranslation,
} from "@/lib/i18n/translation";
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
  const [metrics, setMetrics] = React.useState<{
    isOverflowing: boolean;
    unitWidth: number;
    duration: number;
    repeatCount: number;
  }>({
    isOverflowing: false,
    unitWidth: 0,
    duration: 0,
    repeatCount: 2,
  });

  const GAP = 36; // 글자 사이 고정 간격 (36px)
  const SPEED = 35; // 모든 상품명의 일정한 이동 속도 (초당 35픽셀)

  React.useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const measure = () => {
      if (containerRef.current && textRef.current) {
        const textWidth = textRef.current.scrollWidth;
        const containerWidth = containerRef.current.clientWidth;
        const isOver = textWidth > containerWidth + 2;

        if (isOver) {
          const unitWidth = Math.round(textWidth + GAP);
          // 모든 상품명 속도 일치: 이동 거리(unitWidth) / 속도(SPEED)
          const duration = Math.max(3, parseFloat((unitWidth / SPEED).toFixed(2)));
          // 화면에 여백이 절대 생기지 않도록 충분한 복제 트랙(최소 4개 이상) 생성
          const repeatCount = Math.max(4, Math.ceil((containerWidth * 2) / unitWidth) + 2);

          setMetrics({
            isOverflowing: true,
            unitWidth,
            duration,
            repeatCount,
          });
        } else {
          setMetrics({
            isOverflowing: false,
            unitWidth: 0,
            duration: 0,
            repeatCount: 1,
          });
        }
      }
    };

    measure();
    const timer = setTimeout(measure, 150);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    window.addEventListener("resize", measure);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [title]);

  // flex 인라인 트랙의 너비를 방해하는 block, w-full, truncate 클래스 정리
  const itemClassName = className
    .replace(/\b(w-full|block|truncate)\b/g, "")
    .trim();

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full whitespace-nowrap relative select-none"
    >
      {/* 텍스트 실제 폭 정밀 측정용 가상 스팬 */}
      <span
        ref={textRef}
        aria-hidden="true"
        className={`invisible pointer-events-none whitespace-nowrap fixed left-[-9999px] top-[-9999px] ${itemClassName}`}
      >
        {title}
      </span>

      {metrics.isOverflowing ? (
        <div
          className="inline-flex will-change-transform hover:[animation-play-state:paused] active:[animation-play-state:paused]"
          style={
            {
              display: "inline-flex",
              width: "max-content",
              "--marquee-offset": `-${metrics.unitWidth}px`,
              animation: `marquee-unit ${metrics.duration}s linear infinite`,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: metrics.repeatCount }).map((_, idx) => (
            <span
              key={idx}
              style={{ paddingRight: `${GAP}px` }}
              className={`inline-block shrink-0 whitespace-nowrap ${itemClassName}`}
              aria-hidden={idx > 0 ? "true" : undefined}
            >
              {title}
            </span>
          ))}
        </div>
      ) : (
        <span className={`block truncate w-full ${className}`}>
          {title}
        </span>
      )}
    </div>
  );
};

// 금액 숫자와 통화단위(KRW 등)를 분리하여 통화단위 폰트를 반으로 축소 렌더링
function renderPriceWithSmallCurrency(priceFormatted: string, numberClass: string, currencyClass?: string) {
  const parts = priceFormatted.trim().split(" ");
  if (parts.length >= 2) {
    const currency = parts.pop();
    const amount = parts.join(" ");
    return (
      <span className={numberClass}>
        <span>{amount}</span>
        <span className={`text-[9px] sm:text-[10px] md:text-xs font-semibold ml-0.5 tracking-normal opacity-70 ${currencyClass || ""}`}>
          {" "}{currency}
        </span>
      </span>
    );
  }
  return <span className={numberClass}>{priceFormatted}</span>;
}

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

  const cleanTitle = React.useMemo(
    () => product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name",
    [product.title]
  );
  const displayTitle = useProductTranslation(cleanTitle);

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
      className={`group relative flex flex-col items-center justify-between aspect-[3/5] sm:aspect-[4/5] overflow-hidden border-b border-r border-neutral-200 bg-white w-full cursor-pointer select-none ${
        isOverlayActive ? "z-30 ring-2 ring-blue-600 shadow-xl" : ""
      }`}
    >
      {/* [1단] 상단 뱃지 영역: 고정 높이(h-[28px] sm:h-[36px])를 주어 뱃지 유무와 상관없이 모든 카드의 상품명 높이 100% 일치 */}
      <div className="w-full px-2 pt-1.5 pb-0.5 sm:px-3 sm:pt-3 md:px-4 md:pt-4 flex items-center justify-center md:justify-start gap-1 sm:gap-1.5 flex-wrap z-10 pointer-events-none h-[28px] sm:h-[36px] shrink-0">
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

        {/* 타임세일 할인율 Badge: 모바일에서는 하단 가격 영역에 세일 정보가 이미 노출되므로 상단 세일 뱃지는 삭제(PC만 노출) */}
        {isTimeSaleActive && timeSaleDiscount && (
          secretSaleInfo ? (
            <span
              className="hidden md:inline-flex text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-neutral-950 text-amber-300 border border-neutral-700 shadow-2xs shrink-0 whitespace-nowrap items-center gap-1"
              title={secretSaleInfo.title ? `[시크릿 VIP 특가] ${secretSaleInfo.title}` : "[시크릿 VIP 특가]"}
            >
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0 hidden md:inline-block" />
              <span className="hidden md:inline">SECRET VIP </span>
              <span>{timeSaleDiscount}% OFF</span>
            </span>
          ) : (
            <span className="hidden md:inline-flex text-[9px] sm:text-[11px] md:text-xs font-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-red-600 text-white shadow-2xs shrink-0 whitespace-nowrap items-center gap-1">
              <span className="hidden md:inline">🔥 TIME SALE </span>
              <span>{timeSaleDiscount}% OFF</span>
            </span>
          )
        )}

        {/* 오픈 예정 / 품절 Badge: 모바일 상단 중앙 배치 (mx-auto md:mx-0) */}
        {product.releaseDate && new Date(product.releaseDate).getTime() > Date.now() ? (
          <span className="mx-auto md:mx-0 text-[9px] sm:text-[11px] md:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-amber-500 text-neutral-950 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-neutral-950" />
            <span className="md:hidden">{formatReleaseDateBadge(product.releaseDate, currentLang)}</span>
            <span className="hidden md:inline">{formatReleaseDateBadge(product.releaseDate, currentLang)}</span>
          </span>
        ) : ((product as any).stock !== undefined &&
            (product as any).stock !== null &&
            Number((product as any).stock) <= 0) ||
          (product.availableForSale === false && !(product.releaseDate && new Date(product.releaseDate).getTime() <= Date.now())) ? (
          <span className="mx-auto md:mx-0 text-[9px] sm:text-[11px] md:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 uppercase tracking-wider rounded-xs bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
            {translateUiText("품절", currentLang)}
          </span>
        ) : null}
      </div>

      {/* [2단] 중앙 제품 이미지 영역: 남는 높이를 100% 온전히 차지하며 잘림/가림 0% 보장 (flex-1 safe area) */}
      <div className="relative w-full flex-1 min-h-0 bg-white flex items-center justify-center px-1 py-0.5 sm:px-4 sm:py-2 overflow-hidden">
        <ProductCardImageSlider
          images={productImages}
          alt={product.title || "Product"}
          paddingClass="p-0"
          imageClassName="object-contain transition-transform duration-700 group-hover:scale-105"
          fillContainer={true}
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

      {/* [3단] 하단 정보 바: 상품명(2배) & 가격(1.5배), 독립 Flex 하단 아이템으로 절대 이미지를 침범하지 않음 */}
      <div className="w-full px-2.5 pb-2.5 pt-1 sm:px-4 sm:pb-3 sm:pt-2 md:px-5 md:pb-4 flex flex-col gap-0.5 sm:gap-1.5 z-10 bg-white shrink-0">
        <MarqueeProductTitle
          title={displayTitle}
          className="text-2xl sm:text-base md:text-lg font-black text-neutral-950 uppercase tracking-tight block w-full leading-tight md:leading-normal"
        />

        {/* 가격 정보: 2행 고정 구조로 정상가(취소선) 유무와 관계없이 모든 카드의 상품명 높이를 수평선으로 100% 일치 */}
        <div className="flex flex-col justify-end w-full min-h-[38px] sm:min-h-[42px]">
          {/* 1행: 정상가 (취소선) - 정가 상품도 동일한 높이를 차지하도록 빈 공간 유지 */}
          <div className="h-4 flex items-center justify-center md:justify-end">
            {strikethroughPriceNum !== null ? (
              <span className="notranslate" translate="no">
                {renderPriceWithSmallCurrency(
                  formatPrice(strikethroughPriceNum.toString(), currCode),
                  "text-xs sm:text-xs md:text-sm text-neutral-400 line-through font-bold whitespace-nowrap",
                  "text-[8px] sm:text-[9px] md:text-[10px] no-underline opacity-60"
                )}
              </span>
            ) : (
              <span className="h-4 invisible select-none" aria-hidden="true">-</span>
            )}
          </div>

          {/* 2행: 할인가 및 할인 퍼센트 (모바일 중앙 정렬, KRW 반 크기) */}
          <div className="flex items-baseline justify-center md:justify-end gap-1.5 sm:gap-2">
            {isTimeSaleActive && timeSaleDiscount && (
              <span
                className="text-lg sm:text-base md:text-lg font-black text-red-600 whitespace-nowrap notranslate"
                translate="no"
              >
                {timeSaleDiscount}%
              </span>
            )}
            <span className="notranslate" translate="no">
              {renderPriceWithSmallCurrency(
                formatPrice(finalPriceNum.toString(), currCode),
                "text-lg sm:text-base md:text-xl font-black text-neutral-950 uppercase whitespace-nowrap",
                "text-[9px] sm:text-[10px] md:text-xs font-semibold text-neutral-500"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
