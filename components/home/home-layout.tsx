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
  // (미진열 상품은 이후 서버 동기화 단계와 동일하게 처음부터 제외해 히어로가 나타났다 사라지는 깜빡임을 방지)
  const initialHeroCandidates = (products || []).filter((p: any) =>
    p.isMainFeatured !== false &&
    (p.isHeroFeatured ||
      Boolean(p.heroCustomImage) ||
      p.categoryId === "main_banner" ||
      String(p.id).startsWith("hero-slide-"))
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
    // 요청 순번: 이벤트가 연달아 발생해도 "가장 마지막에 시작한 요청"의 응답만 화면에 반영한다.
    let requestSeq = 0;
    let abortController: AbortController | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // 서버가 알려준 삭제 상품 ID (서버 응답 수신 후에는 이 목록이 유일한 기준)
    let serverDeletedIds: Set<string> | null = null;
    // 화면에 반영할 "서버 기준" 최신 상품 목록 (최초에는 SSR 목록, 서버 응답 수신 후에는 서버 응답으로 교체)
    // → 이벤트 핸들러가 이 변수를 참조하므로, 서버 데이터를 한 번 받은 뒤 SSR 데이터로 되돌아가는 롤백이 방지된다.
    let authoritativeProducts: any[] = products || [];

    const getDeletedSet = (): Set<string> => {
      if (serverDeletedIds) return serverDeletedIds;
      // 서버 응답 전(최초 SSR 렌더 직후)에는 이 기기에 기록된 삭제 목록으로만 임시 필터링
      let local = new Set<string>();
      if (typeof window !== "undefined") {
        try {
          const deletedRaw = localStorage.getItem("admin_deleted_product_ids");
          if (deletedRaw) local = new Set(JSON.parse(deletedRaw).map(String));
        } catch {}
      }
      return local;
    };

    const applyProductsToList = (rawList: any[], updateHero: boolean = true) => {
      if (!isSubscribed) return;
      const deletedSet = getDeletedSet();

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

      setAllProducts(gridProducts);

      // SSR 목록에는 배너/히어로 상품이 포함되지 않으므로, SSR 목록 적용 시에는 히어로를 건드리지 않는다
      // (건드리면 기본 슬라이드로 바뀌었다가 서버 응답 후 다시 배너로 바뀌는 깜빡임 발생)
      if (!updateHero) return;

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
    };

    // 서버 API가 알려주는 최신 목록이 유일한 기준 (이 기기의 오래된 localStorage 스냅샷은 사용/수정하지 않음)
    const syncFromServer = async () => {
      const mySeq = ++requestSeq;
      abortController?.abort();
      const controller = new AbortController();
      abortController = controller;

      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store", signal: controller.signal });
        if (!res.ok || !isSubscribed || mySeq !== requestSeq) return;

        let deleted: Set<string> | null = null;
        const delHeader = res.headers.get("x-deleted-product-ids");
        if (delHeader) {
          try {
            const ids = JSON.parse(delHeader);
            if (Array.isArray(ids)) deleted = new Set(ids.map(String));
          } catch {}
        }

        const serverData = await res.json();
        // 응답을 기다리는 사이 더 최신 요청이 시작됐다면 이 (오래된) 응답은 버린다
        if (!Array.isArray(serverData) || !isSubscribed || mySeq !== requestSeq) return;

        // 서버 응답을 권위 있는 최신 목록으로 업데이트
        authoritativeProducts = serverData;
        if (deleted) serverDeletedIds = deleted;
        applyProductsToList(serverData);
      } catch (e) {
        // 네트워크 오류/요청 중단: 현재 화면을 유지한다 (오래된 로컬 캐시로 되돌리지 않음)
      }
    };

    // storage 이벤트(다른 탭 변경)는 debounce로 모아서 한 번만 조회
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        syncFromServer();
      }, 250);
    };

    // 어드민 상품 저장/수정 이벤트: 즉시 서버에서 최신 데이터를 가져온다
    // (debounce 없이 즉각 반영해야 수정 후 화면에 바로 반영됨)
    const handleAdminProductsUpdated = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      syncFromServer();
    };

    // 로그인/시간세일 설정 변경은 네트워크를 기다리지 않고 마지막으로 받은 서버 목록으로 즉시 다시 계산
    const handleLocalSettingChange = () => {
      applyProductsToList(authoritativeProducts);
    };

    // 1. SSR로 내려온 서버 목록을 즉시 반영 (이 기기에서 삭제한 상품만 추가로 걸러냄)
    applyProductsToList(authoritativeProducts, false);
    // 2. 서버 최신 데이터로 갱신
    syncFromServer();
    setIsHydrated(true);

    // Listen for storage events & same-tab admin updates
    window.addEventListener("storage", scheduleSync);
    window.addEventListener("admin_products_updated", handleAdminProductsUpdated);
    window.addEventListener("auth_changed", handleLocalSettingChange);
    window.addEventListener("secret_timesales_updated", handleLocalSettingChange);
    return () => {
      isSubscribed = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      abortController?.abort();
      window.removeEventListener("storage", scheduleSync);
      window.removeEventListener("admin_products_updated", handleAdminProductsUpdated);
      window.removeEventListener("auth_changed", handleLocalSettingChange);
      window.removeEventListener("secret_timesales_updated", handleLocalSettingChange);
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
