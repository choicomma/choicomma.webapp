"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductVariant } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Clock, Ticket, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-context";
import { translateProductTitle, translateProductDescription, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";
import { getAvailableCoupons, getUserCoupons } from "@/lib/membership/coupons";
import { getAllProductOptions, getProductDirectColor } from "./product-options-helper";
import { ProductSizeRecommendationWidget } from "@/components/product/product-size-recommendation-widget";

const DEFAULT_COLOR_HEX_MAP: Record<string, string> = {
  BLACK: "#000000",
  CREAM: "#FDFBF7",
  CHARCOAL: "#36454F",
  NAVY: "#000080",
  BEIGE: "#F5F5DC",
  WHITE: "#FFFFFF",
  BROWN: "#8B4513",
  RED: "#DC2626",
  BLUE: "#2563EB",
  GREEN: "#16A34A",
  KHAKI: "#708090",
  PINK: "#EC4899",
};

const HEADER_I18N: Record<string, Record<string, string>> = {
  ko: {
    timeSale: "TIME SALE",
    timeRemaining: "남은시간",
    days: "일",
    hours: "시",
    minutes: "분",
    seconds: "초",
    color: "색상:",
    size: "사이즈",
    addToCart: "장바구니 담기",
    buyNow: "구매하기",
    adding: "담는 중...",
    outOfStock: "품절",
  },
  en: {
    timeSale: "TIME SALE",
    timeRemaining: "Time Left",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    color: "Color:",
    size: "Size",
    addToCart: "ADD TO CART",
    buyNow: "BUY NOW",
    adding: "ADDING...",
    outOfStock: "OUT OF STOCK",
  },
  ja: {
    timeSale: "タイムセール",
    timeRemaining: "残り時間",
    days: "日",
    hours: "時",
    minutes: "分",
    seconds: "秒",
    color: "色:",
    size: "サイズ",
    addToCart: "カートに追加",
    buyNow: "今すぐ購入",
    adding: "追加中...",
    outOfStock: "売り切れ",
  },
  zh: {
    timeSale: "限时特惠",
    timeRemaining: "剩余时间",
    days: "天",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    color: "颜色:",
    size: "尺寸",
    addToCart: "加入购物车",
    buyNow: "立即购买",
    adding: "添加中...",
    outOfStock: "缺货",
  },
  fr: {
    timeSale: "VENTE FLASH",
    timeRemaining: "Temps restant",
    days: "j",
    hours: "h",
    minutes: "m",
    seconds: "s",
    color: "Couleur:",
    size: "Taille",
    addToCart: "AJOUTER AU PANIER",
    buyNow: "ACHETER",
    adding: "AJOUT...",
    outOfStock: "ÉPUISÉ",
  },
  de: {
    timeSale: "TIMESALE",
    timeRemaining: "Verbleibende Zeit",
    days: "T",
    hours: "St",
    minutes: "Min",
    seconds: "Sek",
    color: "Farbe:",
    size: "Größe",
    addToCart: "IN DEN WARENKORB",
    buyNow: "JETZT KAUFEN",
    adding: "WIRD HINZUGEFÜGT...",
    outOfStock: "AUSVERKAUFT",
  },
  es: {
    timeSale: "OFERTA",
    timeRemaining: "Tiempo restante",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    color: "Color:",
    size: "Talla",
    addToCart: "AÑADIR AL CARRITO",
    buyNow: "COMPRAR AHORA",
    adding: "AÑADIENDO...",
    outOfStock: "AGOTADO",
  },
};

export function cleanProductTitle(title?: string): string {
  if (!title) return "";
  return title.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim();
}

interface ProductDetailHeaderProps {
  product: Product;
  hasVariants?: boolean;
  onPriceChange?: (prices: { originalPrice: number; discountedPrice: number }) => void;
}

export function ProductDetailHeader({
  product: initialProduct,
  hasVariants = true,
  onPriceChange,
}: ProductDetailHeaderProps) {
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  const [product, setProduct] = useState<Product>(initialProduct);
  const [timeSaleDiscount, setTimeSaleDiscount] = useState<number>(35);
  const [isTimeSaleItem, setIsTimeSaleItem] = useState<boolean>(false);
  const [originalPriceNum, setOriginalPriceNum] = useState<number>(0);
  const [discountedPriceNum, setDiscountedPriceNum] = useState<number>(0);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState<number>(0);
  const [couponTitle, setCouponTitle] = useState<string>("");

  // 상세페이지 가격 다단 분할 표시용 상태
  const [hasRegularTimeSale, setHasRegularTimeSale] = useState<boolean>(false);
  const [regularTimeSalePrice, setRegularTimeSalePrice] = useState<number>(0);
  const [hasSecretTimeSale, setHasSecretTimeSale] = useState<boolean>(false);
  const [secretTimeSalePrice, setSecretTimeSalePrice] = useState<number>(0);
  const [secretTimeSaleRate, setSecretTimeSaleRate] = useState<number>(0);
  const [unitSalePrice, setUnitSalePrice] = useState<number>(0);
  const [finalAllDiscountPrice, setFinalAllDiscountPrice] = useState<number>(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState<number>(0);

  const isSetProduct =
    product?.tags?.includes("SET_SALE") || String(product?.id || "").startsWith("set-product-");

  const [remainingTime, setRemainingTime] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({ days: "01", hours: "11", minutes: "54", seconds: "02" });

  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [optionsColorImages, setOptionsColorImages] = useState<Record<string, string>>({});
  const [optionsColorHandles, setOptionsColorHandles] = useState<Record<string, string>>({});
  
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const router = useRouter();
  const { addCartItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const [displayTitle, setDisplayTitle] = useState(cleanProductTitle(product.title));

  useEffect(() => {
    const lang = getCurrentLanguage();

    const updateTranslations = (targetLang: string) => {
      const cleanOriginal = cleanProductTitle(product.title);
      if (targetLang === "ko") {
        setDisplayTitle(cleanOriginal);
        return;
      }
      setDisplayTitle(cleanProductTitle(translateProductTitle(cleanOriginal, targetLang)));

      fetchAsyncTranslation(cleanOriginal, targetLang, "title").then((res) => {
        if (res) setDisplayTitle(cleanProductTitle(res));
      });
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
  }, [product.title]);

  useEffect(() => {
    const updateTimeSaleProduct = () => {
      if (typeof window === "undefined") return;

      let activeProd = initialProduct;

      // Check localStorage for updated admin product data
      const savedAdminProds = localStorage.getItem("admin_products");
      if (savedAdminProds) {
        try {
          const parsed = JSON.parse(savedAdminProds);
          const found = parsed.find(
            (p: any) => p.id === initialProduct.id || p.handle === initialProduct.handle
          );
          if (found) {
            activeProd = found;
          }
        } catch (e) {}
      }

      // Extract colors and sizes from active product using sister products
      const {
        colors: extractedColors,
        sizes: extractedSizes,
        colorImageMap,
        colorHandleMap,
      } = getAllProductOptions(activeProd);

      setColors(extractedColors);
      setSizes(extractedSizes);
      setOptionsColorImages(colorImageMap);
      setOptionsColorHandles(colorHandleMap || {});

      // 현재 제품의 대표 색상으로 선택 (다른 컬러 제품으로 페이지 이동 시 그 제품의 색상이 기본 선택)
      const directColor = getProductDirectColor(activeProd);
      const defaultColor = (directColor && extractedColors.includes(directColor))
        ? directColor
        : (extractedColors[0] || "");
      setSelectedColor(defaultColor);
      setSelectedSize((prev) => (prev && extractedSizes.includes(prev) ? prev : (extractedSizes[0] || "")));

      let itemSettings: Record<string, { hours?: number; minutes?: number; discountRate?: number; discountPrice?: string }> = {};
      let savedSelectedIds: string[] = [];
      let savedDiscountNum = 35;

      const savedIds = localStorage.getItem("secret_timesale_product_ids");
      if (savedIds) {
        try {
          savedSelectedIds = JSON.parse(savedIds);
        } catch (e) {}
      }

      const savedDisc = localStorage.getItem("secret_timesale_discount");
      if (savedDisc && !isNaN(parseInt(savedDisc))) {
        savedDiscountNum = parseInt(savedDisc);
      }

      const savedSettings = localStorage.getItem("secret_timesale_item_settings");
      if (savedSettings) {
        try {
          itemSettings = JSON.parse(savedSettings);
        } catch (e) {}
      }

      const customDiscountPrice = (activeProd as any).timeSaleDiscountPrice || itemSettings[activeProd.id]?.discountPrice;
      const basePrice = parseFloat(activeProd.priceRange?.minVariantPrice?.amount || "0");
      const maxPrice = parseFloat(activeProd.priceRange?.maxVariantPrice?.amount || "0");
      const origPrice = maxPrice > basePrice ? maxPrice : basePrice;

      // 1. Regular Time Sale Check & Calculation
      let regRate = (activeProd as any).timeSaleDiscountRate || itemSettings[activeProd.id]?.discountRate || savedDiscountNum || 35;
      if (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)) && origPrice > 0) {
        const discVal = parseFloat(customDiscountPrice);
        if (discVal < origPrice) {
          regRate = Math.round((1 - discVal / origPrice) * 100);
        }
      }
      setTimeSaleDiscount(regRate);

      const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const userRole = localStorage.getItem("user_role") || "";
      const isAdmin = userRole === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

      const globalStatus = localStorage.getItem("secret_timesale_status");
      const isGlobalOff = globalStatus === "ended";
      const isProductOff = (activeProd as any).isTimeSale === false;

      const isDirectSelected = savedSelectedIds.includes(activeProd.id) || savedSelectedIds.includes(activeProd.handle) || savedSelectedIds.includes((activeProd as any).productCode);
      const isSet = activeProd.tags?.includes("SET_SALE") || activeProd.id.startsWith("set-product-");
      const isCategorySale = activeProd.categoryId === "timesale" || activeProd.tags?.includes("TIMESALE");

      const isRegularSaleActive = (!isGlobalOff && !isProductOff && (isDirectSelected || isSet || isCategorySale || (activeProd as any).isTimeSale === true));

      let regPrice = origPrice;
      if (isSet) {
        regPrice = basePrice;
        const calcTag = activeProd.tags?.find((t) => t.includes("% OFF"));
        regRate = calcTag ? parseInt(calcTag) || 25 : 25;
      } else if (isRegularSaleActive) {
        regPrice = (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)))
          ? parseFloat(customDiscountPrice)
          : Math.round(origPrice * (1 - regRate / 100));
      }

      setHasRegularTimeSale(isRegularSaleActive);
      setRegularTimeSalePrice(regPrice);

      // 2. Secret Time Sale Check & Calculation
      let isSecretTargeted = false;
      let secretRate = 0;
      let secretPrice = origPrice;
      const secretSalesRaw = localStorage.getItem("admin_secret_timesales");
      if (secretSalesRaw) {
        try {
          const secretSalesList: any[] = JSON.parse(secretSalesRaw);
          for (const sale of secretSalesList) {
            if (sale.status !== "active") continue;
            const matchesProduct = (sale.productIds || []).some(
              (id: string) => String(id) === String(activeProd.id) || String(id) === String(activeProd.handle)
            );
            if (!matchesProduct) continue;

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
              isSecretTargeted = true;
              secretRate = Number(sale.discountRate) || 30;
              secretPrice = Math.round(origPrice * (1 - secretRate / 100));
              break;
            }
          }
        } catch (e) {}
      }

      setHasSecretTimeSale(isSecretTargeted);
      setSecretTimeSaleRate(secretRate);
      setSecretTimeSalePrice(secretPrice);

      const isAnySaleActive = isSecretTargeted || isRegularSaleActive;
      setIsTimeSaleItem(isAnySaleActive);

      // 3. Base price for coupons & points calculation
      let baseForBenefits = origPrice;
      if (isSecretTargeted) {
        baseForBenefits = secretPrice;
      } else if (isRegularSaleActive) {
        baseForBenefits = regPrice;
      }

      // 4. Coupon Discount Check
      let maxDisc = 0;
      let bestTitle = "";
      try {
        const availableCoupons = getUserCoupons(userEmail, userRole).filter(
          (c) => c.type !== "SHIPPING" && !c.isUsed && c.isActive !== false
        );

        if (availableCoupons.length > 0) {
          for (const c of availableCoupons) {
            if (c.minOrderAmount && baseForBenefits < c.minOrderAmount) continue;
            let d = 0;
            const isPercent = (c.discount && c.discount.includes("%")) || (c.discountAmount > 0 && c.discountAmount <= 99 && (c as any).discountType === "RATE");
            if (isPercent) {
              d = Math.round(baseForBenefits * (c.discountAmount / 100));
            } else {
              d = c.discountAmount || 0;
            }
            if (d > baseForBenefits) d = baseForBenefits;
            if (d > maxDisc) {
              maxDisc = d;
              bestTitle = c.title;
            }
          }
        }
      } catch (e) {}
      setCouponDiscountAmount(maxDisc);
      setCouponTitle(bestTitle);

      const afterCoupon = Math.max(0, baseForBenefits - maxDisc);

      // 5. Points (적립금) Check
      let pointsD = 0;
      try {
        const userPts = parseInt(localStorage.getItem("membership_user_points") || "0");
        if (userPts > 0) {
          // 보유 적립금이 있는 경우 사용 가능한 적립금 적용 (최대 혜택)
          pointsD = Math.min(userPts, Math.max(0, afterCoupon - 1000));
        } else {
          // 신규/일반 회원 기본 1% 적립 혜택
          pointsD = Math.floor(afterCoupon * 0.01);
        }
      } catch (e) {}
      setPointsDiscountAmount(pointsD);

      // 6. Final Combined Price: 세일 + 쿠폰 + 적립금 적용가 (1개 기준)
      const finalAllPrice = Math.max(0, afterCoupon - pointsD);
      setFinalAllDiscountPrice(finalAllPrice);

      setOriginalPriceNum(origPrice);
      setUnitSalePrice(baseForBenefits);
      setDiscountedPriceNum(finalAllPrice);

      const currencyCode = activeProd.currencyCode || "KRW";
      setProduct({
        ...activeProd,
        priceRange: {
          minVariantPrice: { amount: finalAllPrice.toString(), currencyCode },
          maxVariantPrice: { amount: origPrice.toString(), currencyCode },
        },
        variants: (activeProd.variants || []).map((v) => ({
          ...v,
          price: { amount: finalAllPrice.toString(), currencyCode },
        })),
        tags: Array.from(new Set([...(activeProd.tags || []), ...(isAnySaleActive ? ["TIMESALE"] : [])])),
      });
    };

    updateTimeSaleProduct();

    window.addEventListener("storage", updateTimeSaleProduct);
    window.addEventListener("auth_changed", updateTimeSaleProduct);
    window.addEventListener("coupons_updated", updateTimeSaleProduct);
    window.addEventListener("secret_timesales_updated", updateTimeSaleProduct);
    window.addEventListener("admin_products_updated", updateTimeSaleProduct);
    return () => {
      window.removeEventListener("storage", updateTimeSaleProduct);
      window.removeEventListener("auth_changed", updateTimeSaleProduct);
      window.removeEventListener("coupons_updated", updateTimeSaleProduct);
      window.removeEventListener("secret_timesales_updated", updateTimeSaleProduct);
      window.removeEventListener("admin_products_updated", updateTimeSaleProduct);
    };
  }, [initialProduct]);

  // Broadcast calculated prices to floating purchase bar and parent wrapper
  useEffect(() => {
    onPriceChange?.({
      originalPrice: originalPriceNum,
      discountedPrice: discountedPriceNum,
    });
    window.dispatchEvent(
      new CustomEvent("product_price_calculated", {
        detail: {
          originalPrice: originalPriceNum,
          discountedPrice: discountedPriceNum,
          unitSalePrice: unitSalePrice || originalPriceNum,
          couponDiscountAmount: couponDiscountAmount,
          pointsDiscountAmount: pointsDiscountAmount,
        },
      })
    );
  }, [originalPriceNum, discountedPriceNum, unitSalePrice, couponDiscountAmount, pointsDiscountAmount, onPriceChange]);

  useEffect(() => {
    const handleColorSelected = (e: any) => {
      if (e.detail?.color) {
        setSelectedColor(e.detail.color);
      }
    };
    const handleSizeSelected = (e: any) => {
      if (e.detail?.size) {
        setSelectedSize(e.detail.size);
      }
    };
    const handleQtySelected = (e: any) => {
      if (typeof e.detail?.quantity === "number") {
        setQuantity(e.detail.quantity);
      }
    };
    window.addEventListener("product_color_selected", handleColorSelected);
    window.addEventListener("product_size_selected", handleSizeSelected);
    window.addEventListener("product_quantity_changed", handleQtySelected);
    return () => {
      window.removeEventListener("product_color_selected", handleColorSelected);
      window.removeEventListener("product_size_selected", handleSizeSelected);
      window.removeEventListener("product_quantity_changed", handleQtySelected);
    };
  }, []);

  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQuantity(validQty);
    window.dispatchEvent(new CustomEvent("product_quantity_changed", { detail: { quantity: validQty } }));
  };

  useEffect(() => {
    if (!isTimeSaleItem || isSetProduct) return;

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
        } catch (e) {}
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
  }, [isTimeSaleItem, isSetProduct, product.id]);

  const isScheduled = Boolean(
    product.releaseDate && new Date(product.releaseDate).getTime() > Date.now()
  );
  const scheduledDateStr = isScheduled
    ? new Date(product.releaseDate!).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // 수량에 따른 최종 가격 계산:
  // 1) 세일(타임세일/시크릿타임세일 포함)은 제품마다(수량만큼) 적용!
  // 2) 쿠폰과 적립금은 1주문당 1번만 사용 가능하므로 제품 1개에만 1회 적용 (추가 제품에는 미적용)!
  const effectiveUnitPrice = unitSalePrice > 0 ? unitSalePrice : (discountedPriceNum || originalPriceNum);
  const totalOriginalPrice = originalPriceNum * quantity;
  const totalSaleBasePrice = effectiveUnitPrice * quantity;
  const totalFinalBenefitPrice = Math.max(
    0,
    totalSaleBasePrice - couponDiscountAmount - pointsDiscountAmount
  );

  const handleAddToCart = () => {
    if (!product.availableForSale || isScheduled) return;
    setIsAdding(true);

    const variant: ProductVariant = {
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      title: `${cleanProductTitle(product.title)} ${selectedColor ? `- ${selectedColor}` : ""} ${selectedSize ? `/ ${selectedSize}` : ""}`.trim(),
      availableForSale: true,
      selectedOptions: [],
      price: { amount: effectiveUnitPrice.toString(), currencyCode: product.currencyCode || "KRW" }
    };

    if (selectedColor) variant.selectedOptions.push({ name: "Color", value: selectedColor });
    if (selectedSize) variant.selectedOptions.push({ name: "Size", value: selectedSize });

    addCartItem(variant, product, quantity);
    
    setTimeout(() => {
      setIsAdding(false);
      toast.success("장바구니에 상품을 담았습니다.");
      
      // Trigger cart modal to open (it listens to choicomma_cart_updated)
      window.dispatchEvent(new CustomEvent("choicomma_cart_updated"));
    }, 400);
  };

  const handleBuyNow = () => {
    if (!product.availableForSale || isScheduled) return;

    const variantTitle = `${cleanProductTitle(product.title)} ${selectedColor ? `- ${selectedColor}` : ""} ${selectedSize ? `/ ${selectedSize}` : ""}`.trim();
    const directItem = {
      id: `direct-${product.id}-${selectedColor}-${selectedSize}-${Date.now()}`,
      quantity: quantity,
      cost: {
        totalAmount: {
          amount: totalFinalBenefitPrice.toString(),
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
          featuredImage:
            (selectedColor && (product as any).colorImages?.[selectedColor]
              ? { url: (product as any).colorImages[selectedColor], altText: product.title }
              : null) ||
            product.featuredImage ||
            (product.images && product.images[0]),
          images: product.images || [],
        },
      },
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem("choicomma_direct_order", JSON.stringify(directItem));
    }

    router.push("/checkout");
  };

  const isOutOfStock = !product.availableForSale || isScheduled;

  const t = HEADER_I18N[currentLang] || HEADER_I18N.ko;

  return (
    <div className="flex flex-col gap-4 md:gap-6 w-full font-sans text-neutral-900">
      
      <div className="flex flex-col items-start gap-1">
        {/* Badges Row above Product Title (matching Product List badges) */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {/* Product Label Badge (BLACK LABEL / PREMIUM / ESSENTIAL) */}
          {(product as any).productLabel && (
            <span
              className={`text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm shrink-0 whitespace-nowrap ${
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

          {/* Fabric Badge (if enabled) */}
          {(product as any).showFabricBadge && Boolean((product as any).fabricComposition || (product as any).fabric || (product as any).fabricMaterial) && (
            <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 uppercase tracking-wider rounded-sm bg-white text-black border border-black shadow-2xs shrink-0 whitespace-nowrap">
              {String((product as any).fabricComposition || (product as any).fabric || (product as any).fabricMaterial).replace(/^ORIGIN:\s*/i, "").trim()}
            </span>
          )}

          {/* TimeSale Badge & Countdown */}
          {isTimeSaleItem && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-950 text-white flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                {t.timeSale} {timeSaleDiscount}% OFF
              </span>

              {!isSetProduct && (
                <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-950 text-white flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 text-neutral-300" />
                  <span>{t.timeRemaining}</span>
                  <span className="text-neutral-500">|</span>
                  <span className="font-bold">
                    {remainingTime.days}{t.days} {remainingTime.hours}{t.hours} {remainingTime.minutes}{t.minutes} {remainingTime.seconds}{t.seconds}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* 쿠폰 최대할인가 뱃지 (상품명 상단 노출) */}
          {couponDiscountAmount > 0 && (
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap">
              <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>쿠폰 (-{couponDiscountAmount.toLocaleString()}원)</span>
            </span>
          )}

          {/* 오픈 예정 / 품절 Badge: 가장 마지막에 배치 */}
          {isScheduled ? (
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-amber-500 text-neutral-950 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neutral-950" />
              <span>{scheduledDateStr} 오픈 예정</span>
            </span>
          ) : product.availableForSale === false ? (
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
              품절
            </span>
          ) : null}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-3xl font-normal tracking-tight uppercase leading-tight md:leading-normal">
          {cleanProductTitle(displayTitle || product.title)}
        </h1>

        {/* 2. 정상가 표시 및 하단 라인 추가 (볼드 해제) */}
        <div className="flex items-baseline justify-between w-full mt-2.5 mb-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm font-normal text-neutral-500 whitespace-nowrap">정상가</span>
            {quantity > 1 && (
              <span className="text-[11px] text-neutral-400 font-medium whitespace-nowrap">({quantity}개)</span>
            )}
          </div>
          <div className="flex items-baseline gap-2 shrink-0 whitespace-nowrap">
            {quantity > 1 && (
              <span className="text-xs text-neutral-400 font-normal whitespace-nowrap">
                (개당 {formatPrice(originalPriceNum.toString(), product.currencyCode || "KRW")})
              </span>
            )}
            <span className="text-xl sm:text-2xl font-normal text-neutral-800 tracking-tight font-mono whitespace-nowrap">
              {formatPrice((originalPriceNum * quantity).toString(), product.currencyCode || "KRW")}
            </span>
          </div>
        </div>

        {/* 정상가 하단 구분 라인 */}
        <div className="w-full border-b border-neutral-200/90 my-2" />

        {/* 3, 4, 5. 할인가 다단 상세 내역 */}
        <div className="w-full flex flex-col gap-2 py-1">
          {/* 3. 타임세일 적용가 (타임세일 적용 시) */}
          {hasRegularTimeSale && (
            <div className="flex items-center justify-between w-full text-xs sm:text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-700 whitespace-nowrap">타임세일 적용가</span>
                {quantity > 1 && (
                  <span className="text-[11px] text-neutral-500 font-medium whitespace-nowrap">({quantity}개)</span>
                )}
                {timeSaleDiscount > 0 && (
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 whitespace-nowrap">
                    {timeSaleDiscount}% OFF
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
                {quantity > 1 && (
                  <span className="text-[11px] text-neutral-400 font-normal whitespace-nowrap">
                    (개당 {formatPrice(regularTimeSalePrice.toString(), product.currencyCode || "KRW")})
                  </span>
                )}
                <span className="font-bold text-neutral-900 font-mono whitespace-nowrap">
                  {formatPrice((regularTimeSalePrice * quantity).toString(), product.currencyCode || "KRW")}
                </span>
              </div>
            </div>
          )}

          {/* 4. 시크릿 타임 세일 적용가 (시크릿 타임 세일 적용 시) */}
          {hasSecretTimeSale && (
            <div className="flex items-center justify-between w-full text-xs sm:text-[13px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-700 whitespace-nowrap">시크릿 타임 세일 적용가</span>
                {quantity > 1 && (
                  <span className="text-[11px] text-neutral-500 font-medium whitespace-nowrap">({quantity}개)</span>
                )}
                {secretTimeSaleRate > 0 && (
                  <span className="text-[10px] font-black text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300 whitespace-nowrap">
                    VIP {secretTimeSaleRate}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
                {quantity > 1 && (
                  <span className="text-[11px] text-neutral-400 font-normal whitespace-nowrap">
                    (개당 {formatPrice(secretTimeSalePrice.toString(), product.currencyCode || "KRW")})
                  </span>
                )}
                <span className="font-bold text-neutral-900 font-mono whitespace-nowrap">
                  {formatPrice((secretTimeSalePrice * quantity).toString(), product.currencyCode || "KRW")}
                </span>
              </div>
            </div>
          )}

          {/* 5. 세일+쿠폰+적립금 적용가 (적립금까지 포함한 모든 할인가 표시) */}
          <div className={cn(
            "flex items-center justify-between w-full text-xs sm:text-[13px]",
            (hasRegularTimeSale || hasSecretTimeSale) && "pt-2 border-t border-dashed border-neutral-200/90"
          )}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-neutral-950 whitespace-nowrap">세일+쿠폰+적립금 적용가</span>
              {quantity > 1 && (
                <span className="text-[11px] text-neutral-600 font-medium whitespace-nowrap">({quantity}개)</span>
              )}
              <span className="text-[10px] font-extrabold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                최대 혜택가
              </span>
              {quantity > 1 && (couponDiscountAmount > 0 || pointsDiscountAmount > 0) && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 whitespace-nowrap">
                  쿠폰·적립금 1회 적용
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
              <span className="text-base sm:text-lg font-black text-neutral-950 tracking-tight font-mono whitespace-nowrap">
                {formatPrice(totalFinalBenefitPrice.toString(), product.currencyCode || "KRW")}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 1. Color / Product Cut Option Thumbnails */}
      {colors.length > 0 && (
        <div className="flex flex-col items-start gap-2 mt-2">
          {/* Standalone Product Cut Thumbnails with Color Text Persistent on Top */}
          <div className="flex flex-wrap items-center justify-start gap-3">
            {colors.map((color, idx) => {
              const isSelected = selectedColor === color;
              const colorStr = String(color);
              const customImg = optionsColorImages[colorStr] || (product as any).colorImages?.[colorStr];
              const fallbackImg = product.images?.[idx]?.url || product.featuredImage?.url || "/product_1.webp";
              const cutImgUrl = customImg || fallbackImg;

              return (
                <button
                  key={`color-${colorStr}-${idx}`}
                  type="button"
                  onClick={() => {
                    const targetHandle = optionsColorHandles[colorStr];
                    if (targetHandle && targetHandle !== product.handle) {
                      router.push(`/product/${targetHandle}`);
                      return;
                    }
                    setSelectedColor(colorStr);
                    window.dispatchEvent(new CustomEvent("product_color_selected", { detail: { color: colorStr, image: cutImgUrl } }));
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group focus:outline-none select-none"
                  title={colorStr}
                >
                  {/* Color Name text persistently shown above its own thumbnail */}
                  <span className={cn(
                    "text-[11px] uppercase tracking-wider text-center max-w-[60px] truncate transition-colors",
                    isSelected ? "font-black text-neutral-950" : "font-bold text-neutral-600 group-hover:text-neutral-900"
                  )}>
                    {colorStr}
                  </span>

                  {/* Thumbnail */}
                  <div
                    className={cn(
                      "relative w-14 h-14 rounded-xl overflow-hidden transition-all p-0.5 bg-white shrink-0",
                      isSelected
                        ? "ring-2 ring-neutral-950 shadow-sm"
                        : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                    )}
                  >
                    <div className="w-full h-full rounded-[10px] overflow-hidden bg-neutral-100 relative">
                      <img
                        src={cutImgUrl}
                        alt={colorStr}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Size Options */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-900">
            <span>{(product as any).optionNames?.size || (product as any).options?.[1]?.name || t.size}</span>
            {(() => {
              const comboKey = selectedColor ? `${selectedColor}-${selectedSize}` : selectedSize;
              const stockMap = (product as any).sizeStock || {};
              const curStock = stockMap[comboKey] !== undefined ? stockMap[comboKey] : (stockMap[selectedSize] !== undefined ? stockMap[selectedSize] : null);
              if (curStock === 0) {
                return <span className="text-neutral-900 font-extrabold text-[10px]">품절</span>;
              }
              return null;
            })()}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size, idx) => {
              const sizeStr = String(size);
              const isSelected = selectedSize === size;
              const comboKey = selectedColor ? `${selectedColor}-${sizeStr}` : sizeStr;
              const stockMap = (product as any).sizeStock || {};
              const itemStock = stockMap[comboKey] !== undefined ? stockMap[comboKey] : (stockMap[sizeStr] !== undefined ? stockMap[sizeStr] : null);
              const isSoldOut = itemStock === 0;

              return (
                <button
                  key={`size-${sizeStr}-${idx}`}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => {
                    setSelectedSize(sizeStr);
                    window.dispatchEvent(new CustomEvent("product_size_selected", { detail: { size: sizeStr } }));
                  }}
                  className={cn(
                    "min-w-[2.5rem] h-9 px-3 flex items-center justify-center border text-xs font-semibold transition-all uppercase tracking-wider cursor-pointer select-none rounded-sm",
                    isSoldOut
                      ? "opacity-30 line-through bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                      : isSelected
                      ? "border-neutral-950 text-neutral-950 border-[1.5px] font-extrabold bg-neutral-100 shadow-2xs"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-950 bg-white"
                  )}
                >
                  {sizeStr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Out of stock warning banner if selected option is 0 stock */}
      {(() => {
        const comboKey = selectedColor ? `${selectedColor}-${selectedSize}` : selectedSize;
        const stockMap = (product as any).sizeStock || {};
        const curStock = stockMap[comboKey] !== undefined ? stockMap[comboKey] : (stockMap[selectedSize] !== undefined ? stockMap[selectedSize] : null);
        if (curStock === 0) {
          return (
            <div className="bg-neutral-900 text-white text-xs font-medium px-4 py-2.5 rounded-sm text-center mt-2 tracking-wide">
              선택하신 [{selectedColor ? `${selectedColor} / ` : ""}{selectedSize}] 옵션은 현재 재고가 모두 소진되었습니다.
            </div>
          );
        }
        return null;
      })()}

      {/* 총 상품 금액 (수량 변경 시 실시간 합산 반영) */}
      <div className="flex items-end justify-between w-full pt-5 pb-3 border-t border-neutral-200 mt-6">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-neutral-900 tracking-tight">총 상품 금액</span>
            <span className="text-[11px] text-neutral-500 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
              총 {quantity}개
            </span>
          </div>
          {quantity > 1 && (
            <span className="text-[11px] text-neutral-400">
              세일 개당 {formatPrice(effectiveUnitPrice.toString(), product.currencyCode || "KRW")}
              {(couponDiscountAmount > 0 || pointsDiscountAmount > 0) && " (쿠폰·적립금 1회 적용)"}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          {totalOriginalPrice > totalFinalBenefitPrice && (
            <span className="text-xs sm:text-sm text-neutral-400 line-through font-normal font-mono">
              {formatPrice(totalOriginalPrice.toString(), product.currencyCode || "KRW")}
            </span>
          )}
          <span className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight font-mono">
            {formatPrice(totalFinalBenefitPrice.toString(), product.currencyCode || "KRW")}
          </span>
        </div>
      </div>

      {/* 맞춤 사이즈 추천 위젯 (구매 버튼 위쪽) */}
      <ProductSizeRecommendationWidget
        product={product}
        selectedSize={selectedSize}
        onSelectSize={(newSize) => {
          setSelectedSize(newSize);
          window.dispatchEvent(new CustomEvent("product_size_selected", { detail: { size: newSize } }));
        }}
        className="my-3"
      />

      {/* Bottom Action Row: Quantity + Cart Icon Button (Left) + Buy Now button */}
      <div id="product-header-action-row" className="flex items-center gap-3 sm:gap-4 mt-2">
        {/* 수량 조절기 */}
        <div className="flex items-center border border-neutral-900 px-4 py-3 h-[52px] min-w-[110px] sm:min-w-[120px] justify-between text-neutral-900 bg-white shrink-0">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            className="text-lg leading-none hover:opacity-50 transition-opacity cursor-pointer select-none"
            aria-label="수량 감소"
          >
            -
          </button>
          <span className="text-sm font-medium select-none">{quantity}</span>
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            className="text-lg leading-none hover:opacity-50 transition-opacity cursor-pointer select-none"
            aria-label="수량 증가"
          >
            +
          </button>
        </div>

        {/* 장바구니 아이콘 버튼 (구매하기 좌측) */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="w-[52px] h-[52px] border border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed group relative"
          title={t.addToCart}
          aria-label={t.addToCart}
        >
          {isAdding ? (
            <span className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShoppingBag className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* 구매하기 버튼 */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="flex-1 bg-black hover:bg-neutral-800 text-white font-normal text-[13px] tracking-widest h-[52px] transition-colors uppercase disabled:bg-neutral-300 disabled:text-neutral-500 disabled:opacity-100 cursor-pointer flex items-center justify-center"
        >
          {isScheduled ? `오픈 예정 (${scheduledDateStr} 오픈)` : isOutOfStock ? t.outOfStock : t.buyNow}
        </button>
      </div>

    </div>
  );
}
