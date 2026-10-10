"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { translateProductTitle, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/app/shop/components/product-card";
import { HomePopupModal } from "@/components/home/home-popup-modal";

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

  // Initial Hero Images: Strictly filter for dedicated main banner images or custom hero images
  const initialHeroCandidates = (products || []).filter((p: any) =>
    p.isHeroFeatured ||
    Boolean(p.heroCustomImage) ||
    p.categoryId === "main_banner" ||
    String(p.id).startsWith("hero-slide-")
  );
  let heroUrlsFiltered = initialHeroCandidates.map((p: any) => p.heroCustomImage || p.featuredImage?.url).filter(Boolean);
  if (heroUrlsFiltered.length === 0) {
    heroUrlsFiltered = Array.from({ length: 9 }, (_, i) => `/main_slider/${i + 1}.webp`);
  }
  const [heroImages, setHeroImages] = React.useState<string[]>(heroUrlsFiltered);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  // Initial Grid Products: Strictly require products not marked as unfeatured (isMainFeatured !== false)
  const initialValidCandidates = (products || []).filter(
    (p: any) => p.isMainFeatured !== false && p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")
  );
  let initialGrid = initialValidCandidates.filter((p: any) => p.isBottomFeatured || (p.isMainFeatured === true && !p.isHeroFeatured));
  if (initialGrid.length === 0) {
    initialGrid = initialValidCandidates.filter((p: any) => p.isMainFeatured === true);
  }
  if (initialGrid.length === 0) {
    initialGrid = initialValidCandidates;
  }
  const [allProducts, setAllProducts] = React.useState<any[]>(initialGrid);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);

  React.useEffect(() => {
    const handleResize = () => {
      setPageSize(12);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


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
        const savedSettings = localStorage.getItem("secret_timesale_item_settings");
        if (savedSettings) {
          try { itemSettings = JSON.parse(savedSettings); } catch (e) { }
        }
        let globalDiscount = 35;
        const savedGlobal = localStorage.getItem("secret_timesale_global_discount");
        if (savedGlobal) {
          const parsedG = parseInt(savedGlobal, 10);
          if (!isNaN(parsedG)) globalDiscount = parsedG;
        }
        setTimeSaleSettings({ savedIds, itemSettings, globalDiscount, hasSavedIdsKey });
      } catch (e) { }
    };

    updateTimeSaleInfo();
    window.addEventListener("storage", updateTimeSaleInfo);
    window.addEventListener("admin_products_updated", updateTimeSaleInfo);
    return () => {
      window.removeEventListener("storage", updateTimeSaleInfo);
      window.removeEventListener("admin_products_updated", updateTimeSaleInfo);
    };
  }, []);

  const getTimeSaleDiscount = (product: any): number | null => {
    if (typeof window !== "undefined") {
      const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const userRole = localStorage.getItem("user_role") || "";
      const isAdmin = userRole === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

      // 1. Check Secret Time Sales first
      const secretSalesRaw = localStorage.getItem("admin_secret_timesales");
      if (secretSalesRaw) {
        try {
          const secretSalesList: any[] = JSON.parse(secretSalesRaw);
          for (const sale of secretSalesList) {
            if (sale.status !== "active") continue;
            const matchesProduct = (sale.productIds || []).some(
              (id: string) => String(id) === String(product.id) || String(id) === String(product.handle)
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
              return Number(sale.discountRate) || 30;
            }
          }
        } catch (e) {}
      }

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

    if (product.timeSaleDiscountRate) return parseInt(String(product.timeSaleDiscountRate));
    if (itemSetting?.discountRate) return parseInt(String(itemSetting.discountRate));
    if (product.discountRate) return parseInt(String(product.discountRate));

    return timeSaleSettings.globalDiscount || 35;
  };

  React.useEffect(() => {
    let isSubscribed = true;

    const updateHomeData = async () => {
      let currentList = products || [];
      let localList: any[] | null = null;
      let deletedSet = new Set<string>();

      if (typeof window !== "undefined") {
        try {
          const deletedRaw = localStorage.getItem("admin_deleted_product_ids");
          if (deletedRaw) deletedSet = new Set(JSON.parse(deletedRaw).map(String));
        } catch {}

        try {
          const localRaw = localStorage.getItem("admin_products");
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localList = parsed;
              currentList = parsed;
            }
          }
        } catch {}
      }

      const applyProductsToList = (rawList: any[]) => {
        // 1. 삭제된 상품 블랙리스트 필터링
        const notDeleted = rawList.filter(
          (p: any) =>
            p &&
            !deletedSet.has(String(p.id)) &&
            !deletedSet.has(String(p.productCode)) &&
            !deletedSet.has(String(p.handle))
        );

        // 2. ⭐ 핵심: 미진열 상품(isMainFeatured === false)은 홈화면 추천/카탈로그에서 원천 차단
        const validHomeProducts = notDeleted.filter(
          (p: any) =>
            p.isMainFeatured !== false &&
            p.categoryId !== "main_banner" &&
            !String(p.id).startsWith("hero-slide-")
        );

        // 1순위: 메인 진열 설정된 상품 (isMainFeatured === true)
        let gridProducts = validHomeProducts.filter(
          (p: any) => p.isBottomFeatured || (p.isMainFeatured === true && !p.isHeroFeatured)
        );
        if (gridProducts.length === 0) {
          gridProducts = validHomeProducts.filter((p: any) => p.isMainFeatured === true);
        }
        // 2순위 (안전 폴백): 0개일 때도 미진열(isMainFeatured === false) 상품은 절대 제외하고 정상 진열 상품들만 노출
        if (gridProducts.length === 0) {
          gridProducts = validHomeProducts;
        }

        if (isSubscribed) {
          setAllProducts(gridProducts);

          // Hero Slider Images: 미진열 상품은 히어로 배너 후보에서도 제외
          const heroCandidates = notDeleted.filter(
            (p: any) =>
              p.isMainFeatured !== false &&
              (p.isHeroFeatured ||
                Boolean(p.heroCustomImage) ||
                p.categoryId === "main_banner" ||
                String(p.id).startsWith("hero-slide-"))
          );

          let urls = heroCandidates
            .map((p: any) => p.heroCustomImage || p.featuredImage?.url)
            .filter(Boolean);

          if (urls.length === 0) {
            urls = Array.from({ length: 9 }, (_, i) => `/main_slider/${i + 1}.webp`);
          }

          setHeroImages(urls);
        }
      };

      // 1. 브라우저 localStorage 최신 데이터 즉각 동기화 (깜빡임 및 롤백 방지)
      applyProductsToList(currentList);

      // 2. 서버 API 최신 권한 데이터 비동기 페치 (삭제 동기화 및 최신 상태 반영)
      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
        if (res.ok && isSubscribed) {
          // 서버에서 영구 삭제된 상품 ID 블랙리스트를 수신하여 로컬에 즉시 동기화
          const delHeader = res.headers.get("x-deleted-product-ids");
          if (delHeader) {
            try {
              const serverDelIds = JSON.parse(delHeader);
              if (Array.isArray(serverDelIds) && serverDelIds.length > 0) {
                serverDelIds.forEach((id: string) => deletedSet.add(String(id)));
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem("admin_deleted_product_ids", JSON.stringify(Array.from(deletedSet)));
                  } catch {}
                }
              }
            } catch {}
          }

          const serverData = await res.json();
          if (Array.isArray(serverData)) {
            // 서버에 없는 상품은 삭제된 상품이므로 로컬 캐시(admin_products)에서도 깨끗하게 동기화(제거)
            if (localList && localList.length > 0) {
              const serverIdSet = new Set(serverData.map((sp: any) => String(sp.id)));
              const serverCodeSet = new Set(serverData.map((sp: any) => sp.productCode ? String(sp.productCode) : ""));
              serverCodeSet.delete("");

              const pruned = localList.filter((p: any) => {
                if (!p) return false;
                const idMatch = serverIdSet.has(String(p.id));
                const codeMatch = p.productCode && serverCodeSet.has(String(p.productCode));
                const isDeleted = deletedSet.has(String(p.id)) || (p.productCode && deletedSet.has(String(p.productCode)));
                return (idMatch || codeMatch) && !isDeleted;
              });

              if (typeof window !== "undefined" && pruned.length !== localList.length) {
                try {
                  localStorage.setItem("admin_products", JSON.stringify(pruned));
                } catch {}
              }
            }

            // 화면은 서버의 최신 권한 데이터(삭제된 상품이 이미 제외된 목록)로 즉시 갱신
            applyProductsToList(serverData);
          }
        }
      } catch (e) {}
    };

    // Initial load
    updateHomeData();
    setIsHydrated(true);

    // Listen for storage events & same-tab admin updates
    window.addEventListener("storage", updateHomeData);
    window.addEventListener("admin_products_updated", updateHomeData);
    return () => {
      isSubscribed = false;
      window.removeEventListener("storage", updateHomeData);
      window.removeEventListener("admin_products_updated", updateHomeData);
    };
  }, [products]);

  // True Infinite Loop Carousel with Embla (Native Auto-slide)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    duration: 35,
    skipSnaps: false,
  });

  useEffect(() => {
    if (!emblaApi || heroImages.length <= 1) return;

    let timer: NodeJS.Timeout | null = null;

    const startAutoSlide = () => {
      stopAutoSlide();
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          emblaApi.scrollNext();
        }
      }, 3500);
    };

    const stopAutoSlide = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoSlide();
      } else {
        // Reset and restart timer freshly when tab becomes active again
        startAutoSlide();
      }
    };

    startAutoSlide();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", startAutoSlide);
    window.addEventListener("blur", stopAutoSlide);

    return () => {
      stopAutoSlide();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", startAutoSlide);
      window.removeEventListener("blur", stopAutoSlide);
    };
  }, [emblaApi, heroImages.length]);

  return (
    <div className="w-full flex flex-col bg-white">
      {/* Home Popup Modal (Centered, immediate on visit) */}
      <HomePopupModal />

      {/* SECTION 1: Auto Slider Hero Image (True Infinite Seamless Loop) */}
      {heroImages.length > 0 && (
        <section className="relative w-full h-[80vh] md:h-[105vh] min-h-[500px] md:min-h-[800px] bg-white overflow-hidden">
          <div className="w-full h-full overflow-hidden" ref={emblaRef}>
            <div className="flex w-full h-full touch-pan-y">
              {heroImages.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="relative min-w-full h-full flex-[0_0_100%]"
                >
                  <Image
                    src={src}
                    alt={`Main Hero ${idx}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 1920px"
                    className="object-cover object-center pointer-events-none select-none"
                    priority={idx === 0}
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* INFINITE MARQUEE TICKER BANNER: CHOICOMMA Logo & Luxury Branding */}
      <ChoicommaMarqueeTicker />

      {/* SECTION 2: Responsive Paginated Grid (Matching Shop Page: 2 Columns on Mobile, 3 Columns on PC) */}
      <section className="w-full bg-white">
        {allProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 border-t md:border-t-0 border-neutral-200 bg-white pb-6 w-full">
              {allProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((product, idx) => (
                <ProductCard key={`${product.id || idx}-${currentPage}`} product={product} />
              ))}
            </div>

            {/* Pagination Controls (Matching Shop Page Layout: < Prev  X / Y  Next >) */}
            {allProducts.length > pageSize && (
              <div className="flex justify-center items-center py-12 gap-4 border-t border-neutral-200/80 mt-4 mb-16">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={currentPage === 1}
                  className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  &lt; Prev
                </button>
                <span className="text-xs text-neutral-900 font-medium font-mono">
                  {currentPage} / {Math.ceil(allProducts.length / pageSize)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(Math.ceil(allProducts.length / pageSize), p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={currentPage >= Math.ceil(allProducts.length / pageSize)}
                  className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Next &gt;
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center flex flex-col items-center justify-center border-t border-neutral-200 px-4">
            <p className="text-sm font-bold text-neutral-800">
              현재 준비 중인 컬렉션입니다.
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              초이콤마의 새로운 시그니처 아이템이 곧 업데이트됩니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
