import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Product } from "@/lib/sfcc/types";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/sfcc/utils";
import { QuickOptionModal } from "./quick-option-modal";
import { Clock } from "lucide-react";
import { translateProductTitle, translateProductDescription, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";

// Returns badge config by productLabel value
function getLabelBadge(label?: string) {
  switch (label) {
    case "BLACK_LABEL":
      return { text: "BLACK LABEL", className: "bg-neutral-950 text-white" };
    case "PREMIUM":
      return { text: "PREMIUM", className: "bg-neutral-950 text-white" };
    case "ESSENTIAL":
      return { text: "ESSENTIAL", className: "bg-neutral-950 text-white" };
    default:
      return null;
  }
}

function cleanTitleText(t: string): string {
  if (!t) return "";
  return t.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim();
}

export function FeaturedProductLabel({
  product,
  principal = false,
  className,
}: {
  product: Product;
  principal?: boolean;
  className?: string;
}) {
  const [currentLang, setCurrentLang] = useState("ko");
  const [displayTitle, setDisplayTitle] = useState(cleanTitleText(product.title));
  const [displayDesc, setDisplayDesc] = useState(product.description || "The Verde Lounge Chair is a bold blend of sculptural form and deep comfort.");

  useEffect(() => {
    const lang = getCurrentLanguage();
    setCurrentLang(lang);

    const updateTranslations = (targetLang: string) => {
      const cleanOriginal = cleanTitleText(product.title);
      if (targetLang === "ko") {
        setDisplayTitle(cleanOriginal);
        setDisplayDesc(product.description || "The Verde Lounge Chair is a bold blend of sculptural form and deep comfort.");
        return;
      }
      setDisplayTitle(cleanTitleText(translateProductTitle(cleanOriginal, targetLang)));
      setDisplayDesc(translateProductDescription(product.description || "The Verde Lounge Chair is a bold blend of sculptural form and deep comfort.", targetLang));

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

  const labelBadge = getLabelBadge((product as any).productLabel);

  const [timeSaleDiscount, setTimeSaleDiscount] = useState<number | null>(null);

  useEffect(() => {
    const updateTimeSaleStatus = () => {
      if (typeof window === "undefined") return;
      try {
        const linked = (product as any).linkedProduct;
        const linkedId = (product as any).linkedProductId;
        const possibleIds = Array.from(
          new Set(
            [
              String(product.id || ""),
              String(product.handle || ""),
              linkedId ? String(linkedId) : "",
              linked?.id ? String(linked.id) : "",
              linked?.handle ? String(linked.handle) : "",
            ].filter(Boolean)
          )
        );

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
            isSelected = parsedIds.some((id: any) =>
              possibleIds.includes(String(id))
            );
          } catch (e) {}
        } else {
          isSelected = (product as any).isTimeSale === true || product.categoryId === "timesale" || product.tags?.includes("TIMESALE");
        }

        let itemDiscount: number | null = null;
        const itemSettingsSaved = localStorage.getItem("secret_timesale_item_settings");
        if (itemSettingsSaved) {
          try {
            const parsedSettings = JSON.parse(itemSettingsSaved);
            for (const pid of possibleIds) {
              if (parsedSettings[pid]?.discountRate) {
                itemDiscount = parseInt(parsedSettings[pid].discountRate);
                break;
              }
            }
          } catch (e) {}
        }

        const isTimeSale = isSelected || (product as any).isTimeSale === true || (linked as any)?.isTimeSale === true;

        if (isTimeSale) {
          let discount =
            itemDiscount ||
            (product as any).timeSaleDiscountRate ||
            (linked as any)?.timeSaleDiscountRate ||
            (product as any).discountRate ||
            (linked as any)?.discountRate;

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
      } catch (e) {
        console.error("Error in FeaturedProductLabel timeSale check", e);
      }
    };

    updateTimeSaleStatus();
    window.addEventListener("storage", updateTimeSaleStatus);
    window.addEventListener("admin_products_updated", updateTimeSaleStatus);
    window.addEventListener("focus", updateTimeSaleStatus);

    const interval = setInterval(updateTimeSaleStatus, 1000);

    return () => {
      window.removeEventListener("storage", updateTimeSaleStatus);
      window.removeEventListener("admin_products_updated", updateTimeSaleStatus);
      window.removeEventListener("focus", updateTimeSaleStatus);
      clearInterval(interval);
    };
  }, [product]);

  const basePrice = parseFloat(product.priceRange?.minVariantPrice?.amount || "0");
  const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || "0");
  const origPriceNum = maxPrice > basePrice ? maxPrice : basePrice;

  let finalPriceNum = basePrice;
  let strikethroughPriceNum: number | null = null;

  if (timeSaleDiscount !== null && timeSaleDiscount > 0) {
    strikethroughPriceNum = origPriceNum;
    finalPriceNum = Math.round(origPriceNum * (1 - timeSaleDiscount / 100));
  }

  if (principal) {
    return (
      <div
        className={cn(
          "p-5 md:p-6 bg-white border border-neutral-100 rounded-none shadow-xl w-full flex flex-col justify-between gap-3.5 text-neutral-950",
          className
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-start w-full">
          {/* Left Column: Badge, Title */}
          <div className="flex flex-col items-start min-w-0">
            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
              {timeSaleDiscount !== null && (
                <Badge className="font-extrabold rounded-none text-xs px-3 py-1 bg-white text-neutral-950 border border-neutral-300 shadow-2xs tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-950 shrink-0" />
                  <span>TIME SALE {timeSaleDiscount}% OFF</span>
                </Badge>
              )}
              {isSetProduct ? (
                <Badge className="font-extrabold rounded-none text-xs px-3.5 py-1 bg-neutral-950 text-white border-none">
                  SET SALE
                </Badge>
              ) : labelBadge ? (
                <Badge className={`font-black rounded-none text-xs px-3.5 py-1 border-none tracking-wider ${labelBadge.className}`}>
                  {labelBadge.text}
                </Badge>
              ) : null}
            </div>

            <Link
              href={`/product/${product.handle}`}
              className="block text-xl md:text-2xl font-bold text-neutral-950 hover:underline leading-snug tracking-tight line-clamp-2"
            >
              {product.title}
            </Link>
          </div>

          {/* Right Column: Description */}
          <div className="text-xs md:text-sm font-medium text-neutral-700 leading-relaxed line-clamp-3">
            {product.description || "The Verde Lounge Chair is a bold blend of sculptural form and deep comfort."}
          </div>
        </div>

        {/* Bottom Row: Price on Left, Add To Cart Button on Right */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-100/80">
          <div className="flex flex-col items-start leading-none notranslate" translate="no">
            {strikethroughPriceNum !== null && (
              <span className="text-xs md:text-sm text-neutral-400 line-through font-semibold mb-1 notranslate" translate="no">
                {formatPrice(strikethroughPriceNum.toString(), product.currencyCode)}
              </span>
            )}
            <p className="text-2xl md:text-3xl font-extrabold text-neutral-950 tracking-tight leading-none notranslate" translate="no">
              {formatPrice(finalPriceNum.toString(), product.currencyCode)}
            </p>
          </div>

          <Suspense fallback={null}>
            <QuickOptionModal product={product} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-2 sm:p-3 bg-white w-full rounded-none flex flex-col justify-between gap-2 transition-all",
        className
      )}
    >
      <div className="flex flex-col gap-1 min-w-0 w-full">
        <div className="flex items-center gap-1.5 flex-wrap">
          {timeSaleDiscount !== null && (
            <Badge className="bg-white text-neutral-950 font-black text-[10px] px-2.5 py-0.5 rounded-none uppercase border border-neutral-300 shadow-2xs tracking-wider inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-950 shrink-0" />
              <span>TIME SALE {timeSaleDiscount}% OFF</span>
            </Badge>
          )}
          {isSetProduct ? (
            <Badge className="bg-neutral-950 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-none uppercase inline-block border-none">
              SET SALE
            </Badge>
          ) : labelBadge ? (
            <Badge className={`font-black text-[10px] px-2.5 py-0.5 rounded-none uppercase inline-block border-none tracking-widest ${labelBadge.className}`}>
              {labelBadge.text}
            </Badge>
          ) : null}
        </div>
        <Link
          href={`/product/${product.handle}`}
          className="block text-sm md:text-base font-bold text-neutral-950 hover:underline leading-tight tracking-tight line-clamp-2"
        >
          {product.title}
        </Link>
      </div>

      {/* Bottom Row: Price & Add To Cart Button */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-neutral-100">
        <div className="flex flex-col items-start leading-none notranslate" translate="no">
          {strikethroughPriceNum !== null && (
            <span className="text-[11px] text-neutral-400 line-through font-semibold mb-0.5 notranslate" translate="no">
              {formatPrice(strikethroughPriceNum.toString(), product.currencyCode)}
            </span>
          )}
          <p className="text-sm sm:text-base font-extrabold text-neutral-950 tracking-tight shrink-0 notranslate" translate="no">
            {formatPrice(finalPriceNum.toString(), product.currencyCode)}
          </p>
        </div>

        <Suspense fallback={null}>
          <QuickOptionModal product={product} />
        </Suspense>
      </div>
    </div>
  );
}
