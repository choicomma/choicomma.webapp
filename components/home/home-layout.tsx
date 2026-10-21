"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Sliders, Edit3, ExternalLink, ChevronRight, ChevronLeft, X } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { translateProductTitle, getCurrentLanguage, fetchAsyncTranslation } from "@/lib/i18n/translation";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/app/shop/components/product-card";
import { HomePopupModal } from "./home-popup-modal";
import { ProductFormModal } from "@/app/admin/components/product-form-modal";
import { reorderProduct } from "@/lib/products/reorder-helper";
import { toast } from "sonner";

const categoriesList = [
  { id: "timesale", name: "TIMESALE", count: 8, description: "신상품 & 타임세일 컬렉션" },
  { id: "outer", name: "OUTER", count: 12, description: "아우터 & 재킷" },
  { id: "top", name: "TOP", count: 24, description: "상의 & 니트웨어" },
  { id: "bottom", name: "BOTTOM", count: 16, description: "팬츠 & 스커트" },
  { id: "bag", name: "BAG", count: 6, description: "가방 & 래더 굿즈" },
  { id: "shoes", name: "SHOES", count: 9, description: "슈즈 & 슈케어" },
  { id: "accessory", name: "ACCESSORY", count: 15, description: "액세서리 & 잡화" },
];

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

function getPageNumbers(current: number, total: number) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, 5];
  }
  if (current >= total - 2) {
    return [total - 4, total - 3, total - 2, total - 1, total];
  }
  return [current - 2, current - 1, current, current + 1, current + 2];
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

  // Initial Grid Products: 메인진열(isMainFeatured === true) 처리된 제품이면 홈화면에 전부 노출
  const initialValidCandidates = (products || []).filter(
    (p: any) =>
      p &&
      p.isMainFeatured !== false &&
      p.categoryId !== "main_banner" &&
      !String(p.id).startsWith("hero-slide-")
  );
  let initialGrid = initialValidCandidates.filter((p: any) => p.isMainFeatured === true);
  if (initialGrid.length === 0) {
    initialGrid = initialValidCandidates;
  }
  const [allProducts, setAllProducts] = React.useState<any[]>(initialGrid);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);

  const router = useRouter();
  const [adminOverlayProductId, setAdminOverlayProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      if (typeof window !== "undefined") {
        const userRole = (localStorage.getItem("user_role") || "").toLowerCase().trim();
        const userGrade = (localStorage.getItem("user_grade") || localStorage.getItem("membership_user_grade") || "").toUpperCase().trim();
        const isAdmin =
          userRole === "admin" ||
          userRole === "staff" ||
          userGrade === "STAFF" ||
          sessionStorage.getItem("choicomma_admin_authenticated") === "true";
        setIsAdminUser(isAdmin);
      }
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    return () => window.removeEventListener("storage", checkAdmin);
  }, []);

  const handleSaveProduct = async (savedProduct: any, isNew: boolean) => {
    try {
      const nowIso = new Date().toISOString();
      const finalProduct: any = {
        ...savedProduct,
        updated_at: nowIso,
        updatedAt: nowIso,
      };

      // 1. 로컬스토리지 admin_products 즉시 동기화
      if (typeof window !== "undefined") {
        const currentSaved = localStorage.getItem("admin_products");
        let list: any[] = [];
        if (currentSaved) {
          try {
            list = JSON.parse(currentSaved);
          } catch (e) {}
        }
        if (!Array.isArray(list) || list.length === 0) {
          list = allProducts;
        }
        list = list.map((p: any) =>
          String(p.id) === String(finalProduct.id) || String(p.productCode) === String(finalProduct.productCode)
            ? finalProduct
            : p
        );
        localStorage.setItem("admin_products", JSON.stringify(list));
      }

      // 2. 서버 영구 저장 API (POST /api/products)
      try {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalProduct),
        });
      } catch (err) {}

      // 3. 홈화면 실시간 반영
      setAllProducts((prev) =>
        prev.map((p) =>
          String(p.id) === String(finalProduct.id) || String(p.productCode) === String(finalProduct.productCode)
            ? finalProduct
            : p
        )
      );

      setEditingProduct(null);
      toast.success(`'${finalProduct.title}' 상품 정보가 성공적으로 수정되었습니다.`);

      // 4. 실시간 동기화 이벤트 브로드캐스트
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("admin_products_updated"));
        window.dispatchEvent(new CustomEvent("products_updated"));
        window.dispatchEvent(new CustomEvent("storage"));
      }
    } catch (err) {
      toast.error("상품 정보 저장 중 오류가 발생했습니다.");
    }
  };

  React.useEffect(() => {
    const handleResize = () => {
      setPageSize(12);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== "undefined") {
      const el = document.getElementById("home-product-grid-section");
      if (el) {
        const navOffset = 64; // Header offset
        const top = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };


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
    const handleFocusOrVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        updateTimeSaleInfo();
      }
    };
    window.addEventListener("storage", updateTimeSaleInfo);
    window.addEventListener("admin_products_updated", updateTimeSaleInfo);
    window.addEventListener("secret_timesales_updated", updateTimeSaleInfo);
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    return () => {
      window.removeEventListener("storage", updateTimeSaleInfo);
      window.removeEventListener("admin_products_updated", updateTimeSaleInfo);
      window.removeEventListener("secret_timesales_updated", updateTimeSaleInfo);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, []);

  const getTimeSaleDiscount = (product: any): number | null => {
    if (typeof window !== "undefined") {
      const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const userRole = localStorage.getItem("user_role") || "";
      const userGrade = (localStorage.getItem("user_grade") || localStorage.getItem("membership_user_grade") || userRole || "").toUpperCase().trim();
      const isAdmin =
        userRole === "admin" ||
        userRole === "staff" ||
        userGrade === "STAFF" ||
        sessionStorage.getItem("choicomma_admin_authenticated") === "true";

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
              userGrade &&
                (sale.targetGrades || []).length > 0 &&
                (sale.targetGrades.includes("ALL") ||
                  sale.targetGrades.includes(userGrade) ||
                  sale.targetGrades.includes(userRole?.toUpperCase()) ||
                  (userGrade.includes("VIP") && sale.targetGrades.includes("VIP")) ||
                  (userGrade.includes("VVIP") && (sale.targetGrades.includes("VVIP") || sale.targetGrades.includes("VIP"))))
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
      const isCategoryOrTag = product.categoryId === "timesale" || product.tags?.includes("TIMESALE");
      if (!isSelected && !isCategoryOrTag) return null;
    } else {
      const isCategoryOrTag = product.categoryId === "timesale" || product.tags?.includes("TIMESALE");
      if (!product.isTimeSale && !isCategoryOrTag) {
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

      // 로컬스토리지 admin_products 에서 관리자가 방금 수정한 메인진열 상태 및 상품 오버레이 병합
      let mergedList = rawList || [];
      if (typeof window !== "undefined") {
        try {
          const localAdminRaw = localStorage.getItem("admin_products");
          if (localAdminRaw) {
            const localAdminList: any[] = JSON.parse(localAdminRaw);
            if (Array.isArray(localAdminList) && localAdminList.length > 0) {
              const localMap = new Map(localAdminList.map((p) => [String(p.id), p]));
              mergedList = mergedList.map((p: any) => {
                const localItem = localMap.get(String(p.id));
                if (!localItem) return p;
                const localTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
                const serverTime = p.updated_at ? new Date(p.updated_at).getTime() : 0;
                // 로컬에 더 최신이거나 메인진열 상태가 명시되어 있다면 로컬 오버레이 적용 (단, 로컬 절약본이 서버의 4개 원본 이미지를 덮어쓰지 않도록 보호)
                if (localTime >= serverTime && localItem.isMainFeatured !== undefined) {
                  const hasDummyImgs = Array.isArray(localItem.images) && localItem.images.some((im: any) => (typeof im === "string" ? im : im?.url) === "/product_1.webp");
                  const preserveServerImages = (localItem._lightStripped || hasDummyImgs) && Array.isArray(p.images) && p.images.length > 0;
                  return {
                    ...p,
                    ...localItem,
                    ...(preserveServerImages ? { images: p.images, featuredImage: p.featuredImage } : {}),
                  };
                }
                return p;
              });

              // 로컬에 새로 등록된 상품이 있다면 앞쪽에 병합
              const existingIds = new Set(mergedList.map((p: any) => String(p.id)));
              const newLocalItems = localAdminList.filter((p: any) => p && !existingIds.has(String(p.id)));
              if (newLocalItems.length > 0) {
                mergedList = [...newLocalItems, ...mergedList];
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // 1. 삭제된 상품 블랙리스트 필터링
      const notDeleted = mergedList.filter(
        (p: any) =>
          p &&
          !deletedSet.has(String(p.id)) &&
          !deletedSet.has(String(p.productCode)) &&
          !deletedSet.has(String(p.handle))
      );

      // 2. ⭐ 핵심: 미진열 상품(isMainFeatured === false)은 홈화면 추천/카탈로그에서 원천 차단
      const validHomeProducts = notDeleted.filter(
        (p: any) =>
          p &&
          p.isMainFeatured !== false &&
          p.categoryId !== "main_banner" &&
          !String(p.id).startsWith("hero-slide-")
      );

      // ⭐ 상품리스트에서 메인진열(isMainFeatured === true) 처리된 제품이면 홈화면에 전부 노출
      let gridProducts = validHomeProducts.filter(
        (p: any) => p.isMainFeatured === true
      );
      // 안전 폴백: 메인진열 플래그가 하나도 없는 경우 미진열(false) 제외한 유효 상품 노출
      if (gridProducts.length === 0) {
        gridProducts = validHomeProducts;
      }

      gridProducts = [...gridProducts].sort((a: any, b: any) => {
        const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : null;
        const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : null;
        if (orderA !== null && orderB !== null) return orderA - orderB;
        if (orderA !== null) return -1;
        if (orderB !== null) return 1;

        // displayOrder가 둘 다 없거나 동일한 경우 최신 수정/생성순 정렬
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return timeB - timeA;
      });

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
        const res = await fetch(`/api/products?fresh=1&slim=1&_t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
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
        applyProductsToList(authoritativeProducts);
        syncFromServer();
      }, 250);
    };

    // 어드민 상품 저장/수정 이벤트: 로컬 상태 즉시 반영 후 서버에서 최신 데이터 가져온다
    const handleAdminProductsUpdated = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      applyProductsToList(authoritativeProducts);
      syncFromServer();
    };

    // 관리자가 다른 탭에서 설정을 바꾼 뒤 홈 화면 탭으로 전환(포커스)할 때 즉시 최신 데이터 반영
    const handleTabFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        applyProductsToList(authoritativeProducts);
        syncFromServer();
      }
    };

    // 로그인/시간세일 설정 변경은 네트워크를 기다리지 않고 마지막으로 받은 서버 목록으로 즉시 다시 계산
    const handleLocalSettingChange = () => {
      applyProductsToList(authoritativeProducts);
      syncFromServer();
    };

    // 1. SSR로 내려온 서버 목록을 즉시 반영 (이 기기에서 삭제한 상품만 추가로 걸러냄)
    applyProductsToList(authoritativeProducts, false);
    // 2. 서버 최신 데이터로 갱신
    syncFromServer();
    setIsHydrated(true);

    // Listen for storage events & same-tab admin updates & focus/visibility
    window.addEventListener("storage", scheduleSync);
    window.addEventListener("admin_products_updated", handleAdminProductsUpdated);
    window.addEventListener("auth_changed", handleLocalSettingChange);
    window.addEventListener("secret_timesales_updated", handleLocalSettingChange);
    window.addEventListener("focus", handleTabFocus);
    document.addEventListener("visibilitychange", handleTabFocus);
    return () => {
      isSubscribed = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      abortController?.abort();
      window.removeEventListener("storage", scheduleSync);
      window.removeEventListener("admin_products_updated", handleAdminProductsUpdated);
      window.removeEventListener("auth_changed", handleLocalSettingChange);
      window.removeEventListener("secret_timesales_updated", handleLocalSettingChange);
      window.removeEventListener("focus", handleTabFocus);
      document.removeEventListener("visibilitychange", handleTabFocus);
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
      {/* Home Popup Modal (Admin Configured & Deployed) */}
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
      <section id="home-product-grid-section" className="w-full bg-white scroll-mt-20">
        {allProducts.length > 0 ? (
          <>
            {/* 투명 배경 클릭 시 활성화된 상품의 관리자 오버레이 닫기 */}
            {adminOverlayProductId && (
              <div
                className="fixed inset-0 z-20 bg-black/10 cursor-default"
                onClick={() => setAdminOverlayProductId(null)}
              />
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 border-t md:border-t-0 border-neutral-200 bg-white pb-6 w-full relative">
              {allProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((product, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx;
                const isFirst = globalIndex === 0;
                const isLast = globalIndex === allProducts.length - 1;
                return (
                  <ProductCard
                    key={`${product.id || idx}-${currentPage}-${product.updated_at || ""}-${product.availableForSale}-${product.releaseDate || ""}-${product.stock ?? ""}`}
                    product={product}
                    isFirst={isFirst}
                    isLast={isLast}
                    isAdminOverlayOpen={adminOverlayProductId === String(product.id)}
                    onAdminClick={isAdminUser ? (p) => setAdminOverlayProductId(String(p.id)) : undefined}
                    onAdminOverlayClose={() => setAdminOverlayProductId(null)}
                    onAdminEdit={(p) => {
                      setAdminOverlayProductId(null);
                      setEditingProduct(p);
                    }}
                    onMoveOrder={async (p, direction) => {
                      const res = await reorderProduct(String(p.id), direction, allProducts);
                      if (res.success) {
                        toast.success(
                          direction === "prev"
                            ? `'${p.title}' 상품이 앞으로 이동되었습니다.`
                            : `'${p.title}' 상품이 뒤로 이동되었습니다.`
                        );
                        if (res.updatedList) {
                          const updatedIds = new Set(allProducts.map((it) => String(it.id)));
                          const nextVisible = res.updatedList.filter((it) => updatedIds.has(String(it.id)));
                          setAllProducts(nextVisible);
                        }
                      } else if (res.error) {
                        toast.info(res.error);
                      }
                    }}
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            {allProducts.length > pageSize && (() => {
              const totalPages = Math.ceil(allProducts.length / pageSize);
              const pageNumbers = getPageNumbers(currentPage, totalPages);
              return (
                <div className="flex flex-col sm:flex-row justify-center items-center py-10 sm:py-12 gap-3 sm:gap-4 border-t border-neutral-200/80 mt-4 mb-16 select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="min-w-[40px] h-10 px-2.5 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-100 disabled:opacity-25 disabled:pointer-events-none text-neutral-700 transition-colors flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
                      title="이전 페이지"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">이전</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {pageNumbers.map((p) => {
                        const isActive = p === currentPage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`min-w-[36px] sm:min-w-[40px] h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                              isActive
                                ? "bg-neutral-950 text-white shadow-sm scale-105"
                                : "border border-neutral-200/80 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="min-w-[40px] h-10 px-2.5 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-100 disabled:opacity-25 disabled:pointer-events-none text-neutral-700 transition-colors flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
                      title="다음 페이지"
                    >
                      <span className="hidden sm:inline">다음</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono sm:hidden">
                    {currentPage} / {totalPages} 페이지
                  </span>
                </div>
              );
            })()}
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


      {/* Unified Product Form Modal (상품 수정 모달) */}
      {editingProduct && (
        <ProductFormModal
          isOpen={Boolean(editingProduct)}
          mode="edit"
          initialProduct={editingProduct}
          categoriesList={categoriesList}
          productsList={allProducts}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          triggerToast={(msg) => toast.success(msg)}
        />
      )}
    </div>
  );
}
