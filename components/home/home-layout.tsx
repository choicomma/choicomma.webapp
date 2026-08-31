"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { translateProductTitle, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";

function HomeProductTitle({ title, lang }: { title: string; lang: string }) {
  const [translated, setTranslated] = useState(() => translateProductTitle(title, lang));

  useEffect(() => {
    if (lang === "ko") {
      setTranslated(title);
      return;
    }
    setTranslated(translateProductTitle(title, lang));
    fetchAsyncTranslation(title, lang, "title").then((res) => {
      if (res) setTranslated(res);
    });
  }, [title, lang]);

  return <>{translated || title || "Product Name"}</>;
}

function ChoicommaMarqueeTicker() {
  const marqueeItems = [
    "CHOICOMMA",
    "✦",
    "SIGNATURE COLLECTION",
    "✦",
    "CHOICOMMA",
    "✦",
    "HIGH-END LUXURY SILHOUETTE",
    "✦",
    "CHOICOMMA",
    "✦",
    "SEOUL",
    "✦",
    "CHOICOMMA",
    "✦",
    "PREMIUM TAILORED",
    "✦",
  ];

  return (
    <div className="w-full bg-neutral-950 text-white border-y border-neutral-800 py-3.5 overflow-hidden select-none z-20 shadow-md -mt-px">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-8 font-sans">
        {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, idx) => (
          <span
            key={idx}
            className={`text-xs md:text-sm uppercase transition-colors ${item === "CHOICOMMA"
                ? "text-white font-sans text-xs md:text-sm tracking-[0.35em] font-black"
                : item === "✦"
                  ? "text-neutral-500 text-xs"
                  : "text-neutral-300 font-medium tracking-[0.2em]"
              }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HomeLayout({ products = [] }: { products?: any[] }) {
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    window.addEventListener("language-changed", handleLangChange);
    return () => {
      window.removeEventListener("language_changed", handleLangChange);
      window.removeEventListener("language-changed", handleLangChange);
    };
  }, []);

  // Use first 4 products for the grid, or mock data if not enough
  const gridProducts = products.slice(0, 4);

  const [heroImages, setHeroImages] = React.useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  // Pagination and all products state - strictly filter isMainFeatured === true
  const initialMainFeatured = (products || []).filter((p: any) => p.isMainFeatured === true);
  const [allProducts, setAllProducts] = React.useState<any[]>(initialMainFeatured);
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 9;

  const [isHydrated, setIsHydrated] = React.useState(false);

  const [timeSaleSettings, setTimeSaleSettings] = React.useState<{
    savedIds: string[];
    itemSettings: Record<string, { discountRate?: number }>;
    globalDiscount: number;
    hasSavedIdsKey: boolean;
  }>({
    savedIds: [],
    itemSettings: {},
    globalDiscount: 35,
    hasSavedIdsKey: false,
  });

  React.useEffect(() => {
    const updateTimeSaleInfo = () => {
      if (typeof window === "undefined") return;
      try {
        let savedIds: string[] = [];
        let hasSavedIdsKey = false;
        const saved = localStorage.getItem("secret_timesale_product_ids");
        if (saved !== null) {
          hasSavedIdsKey = true;
          try { savedIds = JSON.parse(saved); } catch (e) { }
        }
        let itemSettings: Record<string, { discountRate?: number }> = {};
        const savedItem = localStorage.getItem("secret_timesale_item_settings");
        if (savedItem) {
          try { itemSettings = JSON.parse(savedItem); } catch (e) { }
        }
        let globalDiscount = 35;
        const savedDisc = localStorage.getItem("secret_timesale_discount");
        if (savedDisc && !isNaN(parseInt(savedDisc))) {
          globalDiscount = parseInt(savedDisc);
        }
        setTimeSaleSettings({ savedIds, itemSettings, globalDiscount, hasSavedIdsKey });
      } catch (e) { }
    };

    updateTimeSaleInfo();
    window.addEventListener("storage", updateTimeSaleInfo);
    window.addEventListener("admin_products_updated", updateTimeSaleInfo);
    window.addEventListener("focus", updateTimeSaleInfo);
    const interval = setInterval(updateTimeSaleInfo, 1000);
    return () => {
      window.removeEventListener("storage", updateTimeSaleInfo);
      window.removeEventListener("admin_products_updated", updateTimeSaleInfo);
      window.removeEventListener("focus", updateTimeSaleInfo);
      clearInterval(interval);
    };
  }, []);

  const getTimeSaleDiscount = (product: any): number | null => {
    if (!product) return null;

    if (typeof window !== "undefined") {
      const savedStatus = localStorage.getItem("secret_timesale_status");
      if (savedStatus === "ended") return null;
    }

    if (product.isTimeSale === false) return null;

    const prodId = String(product.id || "");
    const handle = String(product.handle || "");
    const pCode = String(product.productCode || "");

    if (timeSaleSettings.hasSavedIdsKey) {
      const isSelected = timeSaleSettings.savedIds.some(
        (id: any) => String(id) === prodId || String(id) === handle || String(id) === pCode
      );
      if (!isSelected && product.isTimeSale !== true) return null;
    } else {
      if (!product.isTimeSale && product.categoryId !== "timesale" && !product.tags?.includes("TIMESALE")) {
        return null;
      }
    }

    const itemSetting = timeSaleSettings.itemSettings[prodId] || timeSaleSettings.itemSettings[handle] || timeSaleSettings.itemSettings[pCode];

    if (itemSetting?.discountRate) return parseInt(String(itemSetting.discountRate));
    if (product.timeSaleDiscountRate) return parseInt(String(product.timeSaleDiscountRate));
    if (product.discountRate) return parseInt(String(product.discountRate));

    return timeSaleSettings.globalDiscount || 35;
  };

  React.useEffect(() => {
    const updateHomeData = () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("admin_products");
          if (saved) {
            const parsed = JSON.parse(saved);

            // Helper to match admin page sorting
            const getProductNo = (product: any): number => {
              if (product.productNo !== undefined && !isNaN(Number(product.productNo))) {
                return Number(product.productNo);
              }
              const match = String(product.id || "").match(/\d+/);
              if (match) return parseInt(match[0], 10);
              return 0;
            };

            // Filter strictly for products where main display is checked (isMainFeatured === true)
            // Preserves exact custom order configured by Admin
            const featuredProducts = parsed.filter((p: any) => p.isMainFeatured === true);

            // Update all products for grid
            setAllProducts(featuredProducts);

            // Update hero image (either explicitly marked or has custom image, fallback to defaults)
            const DEFAULT_HERO_IMAGES = [
              "https://cdn.imweb.me/thumbnail/20260825/a947ed8906a74ea3.jpg",
              "/product_1.webp",
              "/product_2.webp",
            ];

            const heroProducts = parsed.filter((p: any) => p.isHeroFeatured === true || Boolean(p.heroCustomImage));
            const urls = heroProducts.map((p: any) => p.heroCustomImage || p.featuredImage?.url).filter(Boolean);

            if (urls.length > 0) {
              setHeroImages(urls);
              setCurrentSlideIndex(0);
            } else {
              setHeroImages(DEFAULT_HERO_IMAGES);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Initial load
    updateHomeData();
    setIsHydrated(true);

    // Listen for storage events & same-tab admin updates
    window.addEventListener("storage", updateHomeData);
    window.addEventListener("admin_products_updated", updateHomeData);
    return () => {
      window.removeEventListener("storage", updateHomeData);
      window.removeEventListener("admin_products_updated", updateHomeData);
    };
  }, []);

  React.useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  if (!isHydrated) {
    return (
      <div className="w-full flex flex-col bg-white min-h-screen animate-pulse">
        <section className="relative w-full h-[95vh] md:h-[105vh] min-h-[800px] border-b border-neutral-200 bg-neutral-100" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-white">
      {/* SECTION 1: Auto Slider Hero Image (Only rendered if explicit hero images exist) */}
      {heroImages.length > 0 && (
        <section className="relative w-full h-[95vh] md:h-[105vh] min-h-[800px] bg-white overflow-hidden">
          <div
            className="flex w-full h-full transition-transform duration-1000 ease-in-out"
            style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
          >
            {heroImages.map((src, idx) => (
              <div key={`${src}-${idx}`} className="relative min-w-full h-full">
                <Image
                  src={src}
                  alt={`Main Hero ${idx + 1}`}
                  fill
                  quality={100}
                  unoptimized={src.startsWith('data:')}
                  className="object-cover object-center"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INFINITE MARQUEE TICKER BANNER: CHOICOMMA Logo & Luxury Branding */}
      <ChoicommaMarqueeTicker />

      {/* SECTION 2: 3x3 Paginated Grid */}
      <section className="w-full bg-white">
        <div className="grid grid-cols-2 md:grid-cols-3">
          {allProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((product, idx) => {
            const timeSaleDiscount = getTimeSaleDiscount(product);

            const basePrice = parseFloat(product.priceRange?.minVariantPrice?.amount || "0");
            const maxPrice = parseFloat(product.priceRange?.maxVariantPrice?.amount || "0");
            const origPriceNum = maxPrice > basePrice ? maxPrice : basePrice;

            let finalPriceNum = basePrice;
            let strikethroughPriceNum: number | null = null;

            if (timeSaleDiscount !== null && timeSaleDiscount > 0) {
              strikethroughPriceNum = origPriceNum;
              finalPriceNum = Math.round(origPriceNum * (1 - timeSaleDiscount / 100));
            }

            const currCode = product.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "KRW";

            return (
              <Link
                key={product.id || idx}
                href={`/product/${product.handle || "item"}`}
                className="group relative flex flex-col items-center justify-center aspect-[4/5] overflow-hidden border-b border-r border-neutral-200 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(3n)]:border-r-0"
              >
                <Image
                  src={product.featuredImage?.url || `/product_${(idx % 4) + 1}.webp`}
                  alt={product.title || `Product ${idx}`}
                  fill
                  className="object-contain p-4 md:p-8 transition-transform duration-700 group-hover:scale-105"
                />

                {/* Product Name & Label (Bottom Left) */}
                <div className="absolute bottom-0 left-0 p-3 flex flex-col items-start z-10 w-full md:w-auto">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    {product.productLabel && (
                      <span className={`text-[8px] md:text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-sm ${product.productLabel === 'BLACK_LABEL' ? 'bg-black text-white' :
                          product.productLabel === 'PREMIUM' ? 'bg-neutral-600 text-white' :
                            'bg-neutral-200 text-neutral-800'
                        }`}>
                        {product.productLabel.replace('_', ' ')}
                      </span>
                    )}
                    {timeSaleDiscount !== null && (
                      <span className="text-[8px] md:text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider rounded-sm bg-white text-neutral-950 flex items-center gap-0.5 border border-neutral-300 shadow-2xs">
                        <Clock className="w-2.5 h-2.5 text-neutral-950 shrink-0" />
                        <span>TIME SALE {timeSaleDiscount}% OFF</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-neutral-900 uppercase tracking-widest truncate md:pr-0 w-full mb-0.5">
                    {product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || "Product Name"}
                  </span>

                  {/* Mobile Price Display */}
                  <div className="flex items-center gap-1 md:hidden notranslate" translate="no">
                    {strikethroughPriceNum !== null && (
                      <span className="text-[9px] text-neutral-400 line-through font-semibold notranslate" translate="no">
                        {formatPrice(strikethroughPriceNum.toString(), currCode)}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-neutral-900 uppercase notranslate" translate="no">
                      {formatPrice(finalPriceNum.toString(), currCode)}
                    </span>
                  </div>
                </div>

                {/* Product Price (Bottom Right) - Visible on PC */}
                <div className="hidden md:flex absolute bottom-0 right-0 p-3 flex-col items-end z-10 leading-tight notranslate" translate="no">
                  {strikethroughPriceNum !== null && (
                    <span className="text-[10px] text-neutral-400 line-through font-semibold mb-0.5 notranslate" translate="no">
                      {formatPrice(strikethroughPriceNum.toString(), currCode)}
                    </span>
                  )}
                  <span className="text-xs font-extrabold text-neutral-900 uppercase notranslate" translate="no">
                    {formatPrice(finalPriceNum.toString(), currCode)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {allProducts.length > PAGE_SIZE && (
          <div className="flex justify-center items-center py-12 gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
            >
              &lt; Prev
            </button>
            <span className="text-xs text-neutral-900">
              {currentPage} / {Math.ceil(allProducts.length / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(allProducts.length / PAGE_SIZE), p + 1))}
              disabled={currentPage >= Math.ceil(allProducts.length / PAGE_SIZE)}
              className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
            >
              Next &gt;
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
