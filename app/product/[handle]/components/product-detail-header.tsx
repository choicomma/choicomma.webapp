"use client";

import { useEffect, useState } from "react";
import { Product, ProductVariant } from "@/lib/sfcc/types";
import { formatPrice } from "@/lib/sfcc/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-context";
import { translateProductTitle, translateProductDescription, getCurrentLanguage } from "@/lib/i18n/translation";

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
      let rawColors: any[] = activeProd.colors || [];
      let rawSizes: any[] = activeProd.sizes || [];

      if (rawColors.length === 0 && activeProd.options) {
        const colorOpt = activeProd.options.find(
          (o: any) => o.name?.toLowerCase() === "color" || o.name === "색상"
        );
        if (colorOpt && Array.isArray(colorOpt.values)) {
          rawColors = colorOpt.values;
        }
      }
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

      const extractedColors = parsedColors.length > 0 ? parsedColors : ["BLACK", "CREAM", "CHARCOAL"];
      const extractedSizes = parsedSizes.length > 0 ? parsedSizes : ["1", "2", "3", "FREE"];

      setColors(extractedColors);
      setSizes(extractedSizes);
      setSelectedColor((prev) => (prev && extractedColors.includes(prev) ? prev : extractedColors[0]));
      setSelectedSize((prev) => (prev && extractedSizes.includes(prev) ? prev : extractedSizes[0]));

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

      const globalStatus = localStorage.getItem("secret_timesale_status");
      const isGlobalOff = globalStatus === "ended";
      const isProductOff = (activeProd as any).isTimeSale === false;

      const isDirectSelected = savedSelectedIds.includes(activeProd.id) || savedSelectedIds.includes(activeProd.handle) || savedSelectedIds.includes((activeProd as any).productCode);
      const isSet = activeProd.tags?.includes("SET_SALE") || activeProd.id.startsWith("set-product-");
      const isCategorySale = activeProd.categoryId === "timesale" || activeProd.tags?.includes("TIMESALE");

      const isSaleActive = !isGlobalOff && !isProductOff && (isDirectSelected || isSet || isCategorySale || (activeProd as any).isTimeSale === true);
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
    window.addEventListener("admin_products_updated", updateTimeSaleProduct);
    return () => {
      window.removeEventListener("storage", updateTimeSaleProduct);
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
    <div className="flex flex-col gap-6 w-full font-sans text-neutral-900">
      
      <div className="flex flex-col items-start gap-1">
        {isTimeSaleItem && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className="bg-neutral-950 text-white font-black rounded-full px-3.5 py-1 text-xs shadow-sm border border-neutral-800 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
              {t.timeSale} {timeSaleDiscount}% OFF
            </Badge>

            {!isSetProduct && (
              <Badge className="bg-neutral-950 text-white font-black rounded-full px-3.5 py-1 text-xs shadow-sm border border-neutral-800 uppercase flex items-center gap-1.5 tracking-tight">
                <Clock className="w-3.5 h-3.5 text-neutral-300" />
                <span>{t.timeRemaining}</span>
                <span className="text-neutral-500">|</span>
                <span className="font-bold">
                  {remainingTime.days}{t.days} {remainingTime.hours}{t.hours} {remainingTime.minutes}{t.minutes} {remainingTime.seconds}{t.seconds}
                </span>
              </Badge>
            )}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-normal tracking-tight uppercase">
          {translateProductTitle(product.title, currentLang)}
        </h1>
        {product.description && (
          <p className="text-xs text-neutral-600 leading-relaxed mt-1">
            {translateProductDescription(product.description, currentLang)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {originalPriceNum > discountedPriceNum && (
          <span className="text-sm text-neutral-400 line-through">
            {formatPrice(originalPriceNum.toString(), product.currencyCode || "KRW")}
          </span>
        )}
        <span className="text-lg font-bold">
          {formatPrice(discountedPriceNum.toString(), product.currencyCode || "KRW")}
        </span>
      </div>

      {/* 1. Color Options */}
      {colors.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-1.5">
            <span>{t.color}</span>
            <span className="font-extrabold text-neutral-950">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((color, idx) => {
              const isSelected = selectedColor === color;
              const bgLower = color.toLowerCase();
              let bgColor = "#000000";
              const colorStr = String(color);
              if ((DEFAULT_COLOR_HEX_MAP as any)?.[colorStr.toUpperCase()]) {
                bgColor = (DEFAULT_COLOR_HEX_MAP as any)[colorStr.toUpperCase()];
              } else {
                const bgLower = colorStr.toLowerCase();
                if (bgLower.includes("black")) bgColor = "#000000";
                else if (bgLower.includes("white")) bgColor = "#ffffff";
                else if (bgLower.includes("cream")) bgColor = "#fdfbf7";
                else if (bgLower.includes("charcoal")) bgColor = "#36454F";
                else if (bgLower.includes("navy")) bgColor = "#000080";
                else if (bgLower.includes("beige")) bgColor = "#f5f5dc";
                else if (bgLower.includes("brown")) bgColor = "#8B4513";
                else if (bgLower.includes("red")) bgColor = "#DC2626";
                else if (bgLower.includes("blue")) bgColor = "#2563EB";
                else if (bgLower.includes("green")) bgColor = "#16A34A";
                else if (bgLower.includes("khaki")) bgColor = "#708090";
                else if (bgLower.includes("pink")) bgColor = "#EC4899";
              }

              return (
                <button
                  key={`color-${colorStr}-${idx}`}
                  type="button"
                  onClick={() => setSelectedColor(colorStr)}
                  className={cn(
                    "h-9 px-3 flex items-center gap-2 border text-xs font-semibold transition-all uppercase tracking-wider cursor-pointer rounded-sm select-none",
                    isSelected
                      ? "border-neutral-900 text-neutral-900 border-[1.5px] font-extrabold bg-neutral-50 shadow-2xs"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-500 bg-white"
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs inline-block shrink-0"
                    style={{ backgroundColor: bgColor }}
                  />
                  <span>{colorStr}</span>
                  {isSelected && <Check className="w-3 h-3 text-neutral-900 stroke-[3] ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full h-px bg-neutral-200 my-1" />

      {/* 2. Size Options */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">
            {t.size}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size, idx) => {
              const sizeStr = String(size);
              const isSelected = selectedSize === size;
              return (
                <button
                  key={`size-${sizeStr}-${idx}`}
                  type="button"
                  onClick={() => setSelectedSize(sizeStr)}
                  className={cn(
                    "min-w-[2.25rem] h-9 px-2.5 flex items-center justify-center border text-xs font-medium transition-all uppercase tracking-wider cursor-pointer select-none",
                    isSelected ? "border-neutral-900 text-neutral-900 border-[1.5px] font-bold" : "border-neutral-300 text-neutral-500 hover:border-neutral-600"
                  )}
                >
                  {sizeStr}
                </button>
              );
            })}
          </div>
        </div>
      )}



      <div className="flex flex-row gap-4 mt-8">
        <div className="flex items-center border border-neutral-300 px-4 py-3 h-[52px] min-w-[120px] justify-between text-neutral-900 bg-white">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-lg leading-none hover:opacity-50 transition-opacity">-</button>
          <span className="text-sm font-medium">{quantity}</span>
          <button onClick={() => setQuantity(quantity + 1)} className="text-lg leading-none hover:opacity-50 transition-opacity">+</button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className="flex-1 bg-[#808080] hover:bg-[#666666] text-white font-normal text-[13px] tracking-widest h-[52px] transition-colors uppercase disabled:opacity-50"
        >
          {isOutOfStock ? t.outOfStock : isAdding ? t.adding : t.addToCart}
        </button>
      </div>

    </div>
  );
}
