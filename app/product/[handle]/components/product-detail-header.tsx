"use client";

import { useEffect, useState } from "react";
import { Product, ProductVariant } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-context";
import { translateProductTitle, translateProductDescription, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";

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
    adding: "AÑADIENDO...",
    outOfStock: "AGOTADO",
  },
};

interface ProductDetailHeaderProps {
  product: Product;
  hasVariants?: boolean;
}

export function ProductDetailHeader({
  product: initialProduct,
  hasVariants = true,
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

  const isSetProduct =
    product.tags?.includes("SET_SALE") || product.id.startsWith("set-product-");

  const [remainingTime, setRemainingTime] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({ days: "01", hours: "11", minutes: "54", seconds: "02" });

  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const { addCartItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const [displayTitle, setDisplayTitle] = useState(product.title);
  const [displayDesc, setDisplayDesc] = useState(product.description || "");

  useEffect(() => {
    const lang = getCurrentLanguage();

    const updateTranslations = (targetLang: string) => {
      if (targetLang === "ko") {
        setDisplayTitle(product.title);
        setDisplayDesc(product.description || "");
        return;
      }
      setDisplayTitle(translateProductTitle(product.title, targetLang));
      setDisplayDesc(translateProductDescription(product.description || "", targetLang));

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

      // Extract colors and sizes from active product
      let rawColors: any[] = Array.isArray(activeProd.colors) ? activeProd.colors : [];
      let rawSizes: any[] = Array.isArray(activeProd.sizes) ? activeProd.sizes : [];

      if (rawSizes.length === 0 && activeProd.options) {
        const sizeOpt = activeProd.options.find(
          (o: any) => o.name?.toLowerCase() === "size" || o.name === "사이즈"
        );
        if (sizeOpt && Array.isArray(sizeOpt.values)) {
          rawSizes = sizeOpt.values;
        }
      }

      const parsedColors = Array.from(
        new Set(
          rawColors
            .map((c: any) => (typeof c === "object" && c != null ? c.name || c.value || c.id || String(c) : String(c)))
            .filter(Boolean)
        )
      );

      const parsedSizes = Array.from(
        new Set(
          rawSizes
            .map((s: any) => (typeof s === "object" && s != null ? s.name || s.value || s.id || String(s) : String(s)))
            .filter(Boolean)
        )
      );

      const extractedColors = parsedColors;
      const extractedSizes = parsedSizes.length > 0 ? parsedSizes : ["1", "2", "3", "FREE"];

      setColors(extractedColors);
      setSizes(extractedSizes);
      setSelectedColor((prev) => (prev && extractedColors.includes(prev) ? prev : (extractedColors[0] || "")));
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

      let itemRate = (activeProd as any).timeSaleDiscountRate || itemSettings[activeProd.id]?.discountRate || savedDiscountNum || 35;
      if (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)) && origPrice > 0) {
        const discVal = parseFloat(customDiscountPrice);
        if (discVal < origPrice) {
          itemRate = Math.round((1 - discVal / origPrice) * 100);
        }
      }
      setTimeSaleDiscount(itemRate);

      const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const userRole = localStorage.getItem("user_role") || "";
      const isAdmin = userRole === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

      // 1. Check Secret Time Sales
      let isSecretTargeted = false;
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
              itemRate = Number(sale.discountRate) || 30;
              break;
            }
          }
        } catch (e) {}
      }

      const globalStatus = localStorage.getItem("secret_timesale_status");
      const isGlobalOff = globalStatus === "ended";
      const isProductOff = (activeProd as any).isTimeSale === false;

      const isDirectSelected = savedSelectedIds.includes(activeProd.id) || savedSelectedIds.includes(activeProd.handle) || savedSelectedIds.includes((activeProd as any).productCode);
      const isSet = activeProd.tags?.includes("SET_SALE") || activeProd.id.startsWith("set-product-");
      const isCategorySale = activeProd.categoryId === "timesale" || activeProd.tags?.includes("TIMESALE");

      const isSaleActive = isSecretTargeted || (!isGlobalOff && !isProductOff && (isDirectSelected || isSet || isCategorySale || (activeProd as any).isTimeSale === true));
      setIsTimeSaleItem(isSaleActive);

      if (isSet) {
        setDiscountedPriceNum(basePrice);
        const calcTag = activeProd.tags?.find((t) => t.includes("% OFF"));
        const rate = calcTag ? parseInt(calcTag) || 25 : 25;
        setOriginalPriceNum(Math.round(basePrice / (1 - rate / 100)));
      } else if (isSaleActive) {
        const calcDiscount = (customDiscountPrice && !isNaN(parseFloat(customDiscountPrice)))
          ? parseFloat(customDiscountPrice)
          : Math.round(origPrice * (1 - itemRate / 100));
        setOriginalPriceNum(origPrice);
        setDiscountedPriceNum(calcDiscount);

        const currencyCode = activeProd.currencyCode || "KRW";

        setProduct({
          ...activeProd,
          priceRange: {
            minVariantPrice: { amount: calcDiscount.toString(), currencyCode },
            maxVariantPrice: { amount: origPrice.toString(), currencyCode },
          },
          variants: (activeProd.variants || []).map((v) => ({
            ...v,
            price: { amount: calcDiscount.toString(), currencyCode },
          })),
          tags: Array.from(new Set([...(activeProd.tags || []), "TIMESALE"])),
        });
      } else {
        setProduct(activeProd);
        setOriginalPriceNum(basePrice);
        setDiscountedPriceNum(basePrice);
      }
    };

    updateTimeSaleProduct();

    window.addEventListener("storage", updateTimeSaleProduct);
    window.addEventListener("auth_changed", updateTimeSaleProduct);
    window.addEventListener("secret_timesales_updated", updateTimeSaleProduct);
    window.addEventListener("admin_products_updated", updateTimeSaleProduct);
    return () => {
      window.removeEventListener("storage", updateTimeSaleProduct);
      window.removeEventListener("auth_changed", updateTimeSaleProduct);
      window.removeEventListener("secret_timesales_updated", updateTimeSaleProduct);
      window.removeEventListener("admin_products_updated", updateTimeSaleProduct);
    };
  }, [initialProduct]);

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

  const handleAddToCart = () => {
    if (!product.availableForSale) return;
    setIsAdding(true);

    const variant: ProductVariant = {
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      title: `${product.title} ${selectedColor ? `- ${selectedColor}` : ""} ${selectedSize ? `/ ${selectedSize}` : ""}`.trim(),
      availableForSale: true,
      selectedOptions: [],
      price: { amount: discountedPriceNum.toString(), currencyCode: product.currencyCode || "KRW" }
    };

    if (selectedColor) variant.selectedOptions.push({ name: "Color", value: selectedColor });
    if (selectedSize) variant.selectedOptions.push({ name: "Size", value: selectedSize });

    addCartItem(variant, product, quantity);
    
    setTimeout(() => {
      setIsAdding(false);
      
      // Trigger cart modal to open (it listens to choicomma_cart_updated)
      window.dispatchEvent(new CustomEvent("choicomma_cart_updated"));
    }, 500);
  };

  const isOutOfStock = !product.availableForSale;

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

          {/* 품절 Badge: 가장 마지막에 배치 */}
          {product.availableForSale === false && (
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
              품절
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-normal tracking-tight uppercase">
          {product.title}
        </h1>

        {/* Price Section directly below Title */}
        <div className="flex items-baseline gap-2.5 mt-1.5 mb-1">
          {originalPriceNum > discountedPriceNum && (
            <span className="text-sm text-neutral-400 line-through font-normal">
              {formatPrice(originalPriceNum.toString(), product.currencyCode || "KRW")}
            </span>
          )}
          <span className="text-xl md:text-2xl font-black text-neutral-950 tracking-tight">
            {formatPrice(discountedPriceNum.toString(), product.currencyCode || "KRW")}
          </span>
        </div>

        {product.description && (
          typeof product.description === "string" && (product.description.includes("<img") || product.description.includes("<p>")) ? (
            <div
              className="text-xs text-neutral-600 leading-relaxed mt-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-2"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="text-xs text-neutral-600 leading-relaxed mt-1">
              {product.description}
            </p>
          )
        )}
      </div>

      {/* 1. Color / Product Cut Option Thumbnails */}
      {colors.length > 0 && (
        <div className="flex flex-col items-start gap-2 mt-2">
          {/* Standalone Product Cut Thumbnails with Color Text Persistent on Top */}
          <div className="flex flex-wrap items-center justify-start gap-3">
            {colors.map((color, idx) => {
              const isSelected = selectedColor === color;
              const colorStr = String(color);
              const customImg = (product as any).colorImages?.[colorStr];
              const fallbackImg = product.images?.[idx]?.url || product.featuredImage?.url || "/product_1.webp";
              const cutImgUrl = customImg || fallbackImg;

              return (
                <button
                  key={`color-${colorStr}-${idx}`}
                  type="button"
                  onClick={() => {
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
            <span>{t.size}</span>
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
                  onClick={() => setSelectedSize(sizeStr)}
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

      {/* Bottom Action Row: Quantity + Add To Cart button */}
      <div className="flex items-center gap-4 mt-8">
        <div className="flex items-center border border-neutral-900 px-4 py-3 h-[52px] min-w-[120px] justify-between text-neutral-900 bg-white">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="text-lg leading-none hover:opacity-50 transition-opacity cursor-pointer select-none"
          >
            -
          </button>
          <span className="text-sm font-medium select-none">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="text-lg leading-none hover:opacity-50 transition-opacity cursor-pointer select-none"
          >
            +
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="flex-1 bg-black hover:bg-neutral-800 text-white font-normal text-[13px] tracking-widest h-[52px] transition-colors uppercase disabled:bg-neutral-300 disabled:text-neutral-500 disabled:opacity-100 cursor-pointer"
        >
          {isOutOfStock ? t.outOfStock : isAdding ? t.adding : t.addToCart}
        </button>
      </div>

    </div>
  );
}
