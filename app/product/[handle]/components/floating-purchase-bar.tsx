"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductVariant } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { cleanProductTitle } from "./product-detail-header";
import { getAllProductOptions, getProductDirectColor } from "./product-options-helper";
import { useCart } from "@/components/cart/cart-context";
import { ShoppingBag, Zap, ChevronUp, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n/translation";

interface FloatingPurchaseBarProps {
  product: Product;
  sharedPrices?: { originalPrice: number; discountedPrice: number } | null;
}

export function FloatingPurchaseBar({ product, sharedPrices }: FloatingPurchaseBarProps) {
  const router = useRouter();
  const { addCartItem } = useCart();
  const [isVisible, setIsVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");

  // Options State
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  // Sync when localStorage admin_products updates
  const [optionsTick, setOptionsTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setOptionsTick((t) => t + 1);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("admin_products_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("admin_products_updated", handleUpdate);
    };
  }, []);

  // Extract all colors, sizes, sister products and color images
  const {
    colors: parsedColors,
    sizes: extractedSizes,
    colorImageMap,
    colorHandleMap,
    sisterProducts,
  } = useMemo(() => getAllProductOptions(product), [product, optionsTick]);

  // Default selection: 항상 현재 제품의 directColor를 우선 선택
  useEffect(() => {
    if (parsedColors.length > 0) {
      const directColor = getProductDirectColor(product);
      if (directColor && parsedColors.includes(directColor)) {
        setSelectedColor(directColor);
      } else {
        setSelectedColor(parsedColors[0]);
      }
    }
    if (extractedSizes.length > 0) {
      const rawCurrentSize =
        Array.isArray(product.sizes) && product.sizes[0] ? String(product.sizes[0]) : "";
      if (rawCurrentSize && extractedSizes.includes(rawCurrentSize)) {
        setSelectedSize(rawCurrentSize);
      } else {
        setSelectedSize(extractedSizes[0]);
      }
    }
  }, [product.id, product.handle, parsedColors, extractedSizes]);

  // Sync with main header selection events
  useEffect(() => {
    const handleColorSelected = (e: any) => {
      if (e.detail?.color) setSelectedColor(e.detail.color);
    };
    const handleSizeSelected = (e: any) => {
      if (e.detail?.size) setSelectedSize(e.detail.size);
    };
    window.addEventListener("product_color_selected", handleColorSelected);
    window.addEventListener("product_size_selected", handleSizeSelected);
    return () => {
      window.removeEventListener("product_color_selected", handleColorSelected);
      window.removeEventListener("product_size_selected", handleSizeSelected);
    };
  }, []);

  // Sync real-time calculated prices from header (timesales, coupons, etc.)
  const [syncedPrices, setSyncedPrices] = useState<{
    originalPrice?: number;
    discountedPrice?: number;
    unitSalePrice?: number;
    couponDiscountAmount?: number;
    pointsDiscountAmount?: number;
  } | null>(null);

  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    const handleQty = (e: any) => {
      if (typeof e.detail?.quantity === "number") {
        setQuantity(e.detail.quantity);
      }
    };
    window.addEventListener("product_quantity_changed", handleQty);
    return () => window.removeEventListener("product_quantity_changed", handleQty);
  }, []);

  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQuantity(validQty);
    window.dispatchEvent(new CustomEvent("product_quantity_changed", { detail: { quantity: validQty } }));
  };

  useEffect(() => {
    const handlePriceSync = (e: any) => {
      if (e.detail?.originalPrice !== undefined && e.detail?.discountedPrice !== undefined) {
        setSyncedPrices({
          originalPrice: Number(e.detail.originalPrice),
          discountedPrice: Number(e.detail.discountedPrice),
          unitSalePrice: e.detail.unitSalePrice !== undefined ? Number(e.detail.unitSalePrice) : undefined,
          couponDiscountAmount: e.detail.couponDiscountAmount !== undefined ? Number(e.detail.couponDiscountAmount) : 0,
          pointsDiscountAmount: e.detail.pointsDiscountAmount !== undefined ? Number(e.detail.pointsDiscountAmount) : 0,
        });
      }
    };
    window.addEventListener("product_price_calculated", handlePriceSync);
    return () => window.removeEventListener("product_price_calculated", handlePriceSync);
  }, []);

  // Sync language
  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLang = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLang);
    return () => window.removeEventListener("language_changed", handleLang);
  }, []);

  // Scroll detection: Trigger visibility when the detail menu enters viewport and header buttons are scrolled away
  useEffect(() => {
    const checkScroll = () => {
      if (typeof window === "undefined") return;

      // 1. Check if the top product header's action buttons (수량, 장바구니, 구매하기) are still visible in viewport
      const topActionRow = document.getElementById("product-header-action-row");
      let isTopActionOutOfView = true;
      if (topActionRow) {
        const topRect = topActionRow.getBoundingClientRect();
        // If the bottom of the top action row is still within viewport, do NOT show the floating bottom bar
        isTopActionOutOfView = topRect.bottom <= 40;
      }

      // 2. Find visible detail menu element (tabs for 상세정보, 사이즈, 고객후기, etc.)
      const menuElements = document.querySelectorAll('[data-detail-menu="true"]');
      let triggerTop = Infinity;

      menuElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.offsetParent !== null) {
          const rect = htmlEl.getBoundingClientRect();
          triggerTop = Math.min(triggerTop, rect.top);
        }
      });

      // Show bottom bar ONLY when:
      // - The top header's action row has scrolled out of view (so no two sets of action buttons exist simultaneously)
      // - AND the detail menu has reached the upper portion of the viewport (top <= 200px or <= window.innerHeight * 0.35)
      const isDetailMenuReached = triggerTop <= Math.max(160, window.innerHeight * 0.35);
      const shouldShow = isTopActionOutOfView && isDetailMenuReached;

      setIsVisible(shouldShow);

      // Broadcast visibility so other floating elements (like live chat widget) can adapt
      window.dispatchEvent(
        new CustomEvent("choicomma_bottom_bar_visible", { detail: { visible: shouldShow } })
      );
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    checkScroll();

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      window.dispatchEvent(
        new CustomEvent("choicomma_bottom_bar_visible", { detail: { visible: false } })
      );
    };
  }, []);

  // Outside click to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(target)) {
        setIsColorOpen(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(target)) {
        setIsSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Price Calculation: sync with sharedPrices prop, syncedPrices event, or full localStorage fallback
  const basePrice = parseFloat(product.priceRange?.minVariantPrice?.amount || "0");
  const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || "0");
  const origPrice = maxPrice > basePrice ? maxPrice : basePrice;

  // Real-time local fallback calculation to guarantee instant display even before events
  const [localFallbackPrices, setLocalFallbackPrices] = useState<{ originalPrice: number; discountedPrice: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      let activeProd = product;
      const savedAdminProds = localStorage.getItem("admin_products");
      if (savedAdminProds) {
        try {
          const parsed = JSON.parse(savedAdminProds);
          const found = parsed.find((p: any) => p.id === product.id || p.handle === product.handle);
          if (found) activeProd = found;
        } catch (e) {}
      }

      let savedSelectedIds: string[] = [];
      const savedIds = localStorage.getItem("secret_timesale_product_ids");
      if (savedIds) {
        try { savedSelectedIds = JSON.parse(savedIds); } catch (e) {}
      }

      const savedDiscountNum = parseInt(localStorage.getItem("secret_timesale_discount") || "35") || 35;
      const savedSettingsRaw = localStorage.getItem("secret_timesale_item_settings");
      let itemSettings: any = {};
      if (savedSettingsRaw) {
        try { itemSettings = JSON.parse(savedSettingsRaw); } catch (e) {}
      }

      const customDiscountPrice = (activeProd as any).timeSaleDiscountPrice || itemSettings[activeProd.id]?.discountPrice;
      const bPrice = parseFloat(activeProd.priceRange?.minVariantPrice?.amount || "0");
      const mPrice = parseFloat(activeProd.priceRange?.maxVariantPrice?.amount || "0");
      const oPrice = mPrice > bPrice ? mPrice : bPrice;

      let itemRate = (activeProd as any).timeSaleDiscountRate || itemSettings[activeProd.id]?.discountRate || savedDiscountNum || 35;
      if (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)) && oPrice > 0) {
        const discVal = parseFloat(customDiscountPrice);
        if (discVal < oPrice) {
          itemRate = Math.round((1 - discVal / oPrice) * 100);
        }
      }

      const globalStatus = localStorage.getItem("secret_timesale_status");
      const isGlobalOff = globalStatus === "ended";
      const isProductOff = (activeProd as any).isTimeSale === false;
      const isDirectSelected = savedSelectedIds.includes(activeProd.id) || savedSelectedIds.includes(activeProd.handle) || savedSelectedIds.includes((activeProd as any).productCode);
      const isSet = activeProd.tags?.includes("SET_SALE") || activeProd.id.startsWith("set-product-");
      const isCategorySale = activeProd.categoryId === "timesale" || activeProd.tags?.includes("TIMESALE");
      const isSaleActive = !isGlobalOff && !isProductOff && (isDirectSelected || isSet || isCategorySale || (activeProd as any).isTimeSale === true);

      if (isSet || activeProd.tags?.includes("SALE") || activeProd.tags?.some((t: string) => t.includes("% OFF"))) {
        const calcTag = activeProd.tags?.find((t: string) => t.includes("% OFF"));
        const rate = calcTag ? parseInt(calcTag) || 25 : 25;
        setLocalFallbackPrices({
          originalPrice: Math.round(bPrice / (1 - rate / 100)),
          discountedPrice: bPrice,
        });
      } else if (isSaleActive) {
        const calcDiscount = (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)))
          ? parseFloat(customDiscountPrice)
          : Math.round(oPrice * (1 - itemRate / 100));
        setLocalFallbackPrices({
          originalPrice: oPrice,
          discountedPrice: calcDiscount,
        });
      }
    } catch (e) {}
  }, [product]);

  const discountedPriceNum =
    sharedPrices?.discountedPrice ??
    syncedPrices?.discountedPrice ??
    localFallbackPrices?.discountedPrice ??
    basePrice;

  const originalPriceNum =
    sharedPrices?.originalPrice ??
    syncedPrices?.originalPrice ??
    localFallbackPrices?.originalPrice ??
    origPrice;

  // 단가 (기본 세일/타임세일/시크릿타임세일 적용된 개당 가격)
  const effectiveUnitPrice =
    syncedPrices?.unitSalePrice ??
    localFallbackPrices?.discountedPrice ??
    discountedPriceNum;

  const couponDiscountAmount = syncedPrices?.couponDiscountAmount ?? 0;
  const pointsDiscountAmount = syncedPrices?.pointsDiscountAmount ?? 0;

  // 1) 세일, 타임세일, 시크릿 타임세일은 제품마다(수량만큼) 적용
  const totalSaleBasePrice = effectiveUnitPrice * quantity;
  // 2) 쿠폰과 적립금은 1주문당 1번만 사용 가능하므로 제품 1개에만 1회 적용
  const totalFinalBenefitPrice = Math.max(
    0,
    totalSaleBasePrice - couponDiscountAmount - pointsDiscountAmount
  );
  const totalOriginalPrice = originalPriceNum * quantity;

  // Stock check
  const selectedSister =
    sisterProducts.find(
      (sp) => sp.colors?.includes(selectedColor) || sp.title?.includes(selectedColor)
    ) || product;
  const activeStockMap =
    (selectedSister as any)?.sizeStock || (product as any)?.sizeStock || {};

  const comboKey = selectedColor ? `${selectedColor}-${selectedSize}` : selectedSize;
  const curStock =
    activeStockMap[comboKey] !== undefined
      ? activeStockMap[comboKey]
      : activeStockMap[selectedSize] !== undefined
      ? activeStockMap[selectedSize]
      : null;
  const isOutOfStock = curStock === 0 || !product.availableForSale;

  const handleColorChange = (color: string) => {
    setIsColorOpen(false);
    const targetHandle = colorHandleMap?.[color];
    if (targetHandle && targetHandle !== product.handle) {
      router.push(`/product/${targetHandle}`);
      return;
    }
    setSelectedColor(color);
    const customImg =
      colorImageMap[color] ||
      (product as any).colorImages?.[color] ||
      (selectedSister as any)?.featuredImage?.url;
    const fallbackImg = product.featuredImage?.url || "/product_1.webp";
    window.dispatchEvent(
      new CustomEvent("product_color_selected", {
        detail: { color, image: customImg || fallbackImg },
      })
    );
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setIsSizeOpen(false);
    window.dispatchEvent(new CustomEvent("product_size_selected", { detail: { size } }));
  };

  const opt1Label = (product as any).optionNames?.color || (product as any).options?.[0]?.name || "색상";
  const opt2Label = (product as any).optionNames?.size || (product as any).options?.[1]?.name || "사이즈";

  // 장바구니 추가
  const handleAddToCart = () => {
    if (parsedColors.length > 0 && !selectedColor) {
      setIsColorOpen(true);
      toast.error(`${opt1Label}을(를) 선택해 주세요.`);
      return;
    }
    if (extractedSizes.length > 0 && !selectedSize) {
      setIsSizeOpen(true);
      toast.error(`${opt2Label}을(를) 선택해 주세요.`);
      return;
    }
    if (isOutOfStock) {
      toast.error("선택하신 옵션은 품절되었습니다.");
      return;
    }

    setIsAddingToCart(true);

    const variant: ProductVariant = {
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      title: `${cleanProductTitle(product.title)} ${selectedColor ? `- ${selectedColor}` : ""} ${selectedSize ? `/ ${selectedSize}` : ""}`.trim(),
      availableForSale: true,
      selectedOptions: [
        ...(selectedColor ? [{ name: "Color", value: selectedColor }] : []),
        ...(selectedSize ? [{ name: "Size", value: selectedSize }] : []),
      ],
      price: {
        amount: effectiveUnitPrice.toString(),
        currencyCode: product.currencyCode || "KRW",
      },
    };

    addCartItem(variant, product, quantity);

    setTimeout(() => {
      setIsAddingToCart(false);
      toast.success("장바구니에 상품을 담았습니다.");
      window.dispatchEvent(new CustomEvent("choicomma_cart_updated"));
    }, 300);
  };

  // 구매하기 (장바구니 추가 없이 주문서로 바로 이동)
  const handleBuyNow = () => {
    if (parsedColors.length > 0 && !selectedColor) {
      setIsColorOpen(true);
      toast.error("색상을 선택해 주세요.");
      return;
    }
    if (extractedSizes.length > 0 && !selectedSize) {
      setIsSizeOpen(true);
      toast.error("사이즈를 선택해 주세요.");
      return;
    }
    if (isOutOfStock) {
      toast.error("선택하신 옵션은 품절되었습니다.");
      return;
    }

    const variantTitle = `${cleanProductTitle(product.title)} ${selectedColor ? `- ${selectedColor}` : ""} ${selectedSize ? `/ ${selectedSize}` : ""}`.trim();
    const directItem = {
      id: `direct-${product.id}-${selectedColor}-${selectedSize}-${Date.now()}`,
      quantity: quantity,
      cost: {
        totalAmount: {
          amount: totalSaleBasePrice.toString(),
          currencyCode: product.currencyCode || "KRW",
        },
      },
      merchandise: {
        id: `${product.id}-${selectedColor}-${selectedSize}`,
        title: variantTitle,
        selectedOptions: [
          ...(selectedColor ? [{ name: "Color", value: selectedColor }] : []),
          ...(selectedSize ? [{ name: "Size", value: selectedSize }] : []),
        ],
        product: {
          id: product.id,
          handle: product.handle,
          title: product.title,
          featuredImage: product.featuredImage || (product.images && product.images[0]),
          images: product.images || [],
        },
      },
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("choicomma_direct_order", JSON.stringify(directItem));
    }

    router.push("/checkout");
  };

  const thumbImg =
    (selectedColor && colorImageMap[selectedColor]) ||
    (selectedColor && (product as any).colorImages?.[selectedColor]) ||
    (selectedSister as any)?.featuredImage?.url ||
    product.featuredImage?.url ||
    (product.images && product.images[0]?.url) ||
    "/product_1.webp";

  return (
    <aside
      aria-label="하단 구매하기 플로팅 바"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-neutral-800 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out transform font-sans",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 md:px-12 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Product Thumbnail & Title / Price Info (모바일에서는 완전히 숨기고 PC에서만 표시) */}
        <div className="hidden sm:flex items-center gap-3 min-w-0 max-w-xs md:max-w-sm shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
            <img src={thumbImg} alt={product.title} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h4 className="text-xs sm:text-[13px] font-bold text-neutral-900 dark:text-white truncate">
              {cleanProductTitle(product.title)}
            </h4>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
              {/* 할인가 (기본 검정/화이트 색상) */}
              <span className="text-xs sm:text-sm font-black text-neutral-950 dark:text-white font-mono">
                {formatPrice(totalFinalBenefitPrice.toString(), product.currencyCode || "KRW")}
                {quantity > 1 && (
                  <span className="text-[11px] text-neutral-400 font-normal ml-1">
                    ({quantity}개{couponDiscountAmount > 0 || pointsDiscountAmount > 0 ? "·쿠폰1회" : ""})
                  </span>
                )}
              </span>
              {/* 정상가 (우측 빗금친 가격) */}
              {totalOriginalPrice > totalFinalBenefitPrice && (
                <span className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-500 line-through font-normal">
                  {formatPrice(totalOriginalPrice.toString(), product.currencyCode || "KRW")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Option Dropdown Buttons (색상, 사이즈) + 장바구니 아이콘 + 구매하기 */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* 1. 색상 선택 드롭다운 버튼 */}
          {parsedColors.length > 0 && (
            <div ref={colorDropdownRef} className="relative flex-1 sm:flex-initial min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsColorOpen(!isColorOpen);
                  setIsSizeOpen(false);
                }}
                className={cn(
                  "w-full sm:w-auto h-10 sm:h-11 px-3 sm:px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap shadow-2xs",
                  isColorOpen
                    ? "border-neutral-950 bg-neutral-100 text-neutral-950 ring-1 ring-neutral-950"
                    : "border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800"
                )}
                title="색상 선택"
              >
                <span className="font-extrabold text-xs">{opt1Label}</span>
                <ChevronUp
                  className={cn(
                    "w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 shrink-0",
                    isColorOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* 색상 선택 상향 팝업 메뉴 (Dropup) */}
              {isColorOpen && (
                <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-2xl p-2.5 min-w-[210px] max-h-[320px] overflow-y-auto no-scrollbar z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-2 py-1 mb-1 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span>전 {opt1Label}</span>
                    <span className="text-[9px] font-medium text-neutral-400 font-mono">{parsedColors.length} {opt1Label.toUpperCase()}</span>
                  </div>
                  <div className="space-y-1">
                    {parsedColors.map((color) => {
                      const isSelected = selectedColor === color;
                      const customImg =
                        colorImageMap[color] || (product as any).colorImages?.[color];
                      const fallbackImg = product.featuredImage?.url || "/product_1.webp";

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorChange(color)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left",
                            isSelected
                              ? "bg-neutral-950 text-white font-bold"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md overflow-hidden border border-neutral-300 shrink-0 bg-neutral-100">
                              <img src={customImg || fallbackImg} alt={color} className="w-full h-full object-cover" />
                            </div>
                            <span className="truncate">{color}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. 사이즈 선택 드롭다운 버튼 */}
          {extractedSizes.length > 0 && (
            <div ref={sizeDropdownRef} className="relative flex-1 sm:flex-initial min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsSizeOpen(!isSizeOpen);
                  setIsColorOpen(false);
                }}
                className={cn(
                  "w-full sm:w-auto h-10 sm:h-11 px-3 sm:px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap shadow-2xs",
                  isSizeOpen
                    ? "border-neutral-950 bg-neutral-100 text-neutral-950 ring-1 ring-neutral-950"
                    : "border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800"
                )}
                title={`${opt2Label} 선택`}
              >
                <span className="font-extrabold text-xs">{opt2Label}</span>
                <ChevronUp
                  className={cn(
                    "w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 shrink-0",
                    isSizeOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* 사이즈 선택 상향 팝업 메뉴 (Dropup, 우측 정렬로 모바일 화면 밖 벗어남 방지) */}
              {isSizeOpen && (
                <div className="absolute bottom-full mb-2 right-0 sm:right-0 sm:left-auto bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl shadow-2xl p-2.5 min-w-[180px] max-h-[320px] overflow-y-auto no-scrollbar z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 px-2 py-1 mb-1 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span>전 {opt2Label}</span>
                    <span className="text-[9px] font-medium text-neutral-400 font-mono">{extractedSizes.length} {opt2Label.toUpperCase()}</span>
                  </div>
                  <div className="space-y-1">
                    {extractedSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      const sizeCombo = selectedColor ? `${selectedColor}-${size}` : size;
                      const isSoldOut = activeStockMap[sizeCombo] === 0 || activeStockMap[size] === 0;

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => handleSizeChange(size)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left",
                            isSoldOut
                              ? "opacity-35 line-through text-neutral-400 cursor-not-allowed"
                              : isSelected
                              ? "bg-neutral-950 text-white font-bold"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                          )}
                        >
                          <span className="font-mono">{size}</span>
                          {isSoldOut ? (
                            <span className="text-[10px] text-rose-500 font-bold">품절</span>
                          ) : isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. 수량 조절 버튼 */}
          <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-xl h-10 sm:h-11 px-1.5 sm:px-2 bg-white dark:bg-neutral-900 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity - 1)}
              className="w-5 sm:w-6 h-full flex items-center justify-center text-sm font-bold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer select-none"
              aria-label="수량 감소"
            >
              -
            </button>
            <span className="min-w-[18px] sm:min-w-[22px] text-center text-xs font-bold font-mono select-none text-neutral-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity + 1)}
              className="w-5 sm:w-6 h-full flex items-center justify-center text-sm font-bold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer select-none"
              aria-label="수량 증가"
            >
              +
            </button>
          </div>

          {/* 4. 장바구니 버튼 (아이콘 표시) */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAddingToCart}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-950 dark:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group"
            title="장바구니 담기"
            aria-label="장바구니 담기"
          >
            {isAddingToCart ? (
              <span className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4 shrink-0 stroke-[2] group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* 4. 구매하기 버튼 (장바구니 추가 없이 주문서로 바로 이동) */}
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="flex-[1.4] sm:flex-initial min-w-[85px] sm:min-w-0 h-10 sm:h-11 px-3 sm:px-6 rounded-xl bg-neutral-950 hover:bg-black text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98 shrink-0 whitespace-nowrap disabled:bg-neutral-300 disabled:cursor-not-allowed"
            title="주문서로 바로 이동"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>구매하기</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
