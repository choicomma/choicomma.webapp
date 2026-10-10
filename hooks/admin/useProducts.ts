"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import productsCache from "@/data/products-cache.json";
import { getRegisteredSetProducts } from "@/lib/sfcc/set-products-helper";

interface UseProductsOptions {
  triggerToast: (msg: string) => void;
  adminTimeSaleProductIds?: string[];
  setAdminTimeSaleProductIds?: React.Dispatch<React.SetStateAction<string[]>>;
  adminTimeSaleHours?: string;
  adminTimeSaleMinutes?: string;
  adminTimeSaleDiscount?: string;
  handleUpdateProductTimeSetting?: (
    productId: string,
    hours: number,
    minutes: number,
    discountPrice?: string,
    discountRate?: number
  ) => void;
}

const INITIAL_CHOICOMMA_PRODUCTS: any[] = (productsCache as any[]) || [];

export function getDeletedProductIdsFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("admin_deleted_product_ids");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch {}
  return new Set();
}

export function addDeletedProductIdsToStorage(ids: string[]) {
  if (typeof window === "undefined" || !ids || ids.length === 0) return;
  try {
    const currentSet = getDeletedProductIdsFromStorage();
    ids.forEach((id) => {
      if (id) currentSet.add(String(id));
    });
    localStorage.setItem("admin_deleted_product_ids", JSON.stringify(Array.from(currentSet)));
  } catch {}
}

export function removeDeletedProductIdsFromStorage(ids: string[]) {
  if (typeof window === "undefined" || !ids || ids.length === 0) return;
  try {
    const currentSet = getDeletedProductIdsFromStorage();
    ids.forEach((id) => {
      if (id) currentSet.delete(String(id));
    });
    localStorage.setItem("admin_deleted_product_ids", JSON.stringify(Array.from(currentSet)));
  } catch {}
}

export function filterOutDeletedProducts(list: any[], deletedSet: Set<string>): any[] {
  if (!Array.isArray(list)) return [];
  if (deletedSet.size === 0) return list;
  return list.filter((p) => {
    if (!p) return false;
    const id = String(p.id || "");
    const code = String(p.productCode || "");
    const handle = String(p.handle || "");
    return !deletedSet.has(id) && !deletedSet.has(code) && !deletedSet.has(handle);
  });
}

export function useProducts({
  triggerToast,
  adminTimeSaleProductIds = [],
  setAdminTimeSaleProductIds,
  adminTimeSaleHours = "24",
  adminTimeSaleMinutes = "0",
  adminTimeSaleDiscount = "35",
  handleUpdateProductTimeSetting,
}: UseProductsOptions) {
  const isProductsLoadedRef = useRef(false);
  const [productsList, setProductsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const deletedSet = getDeletedProductIdsFromStorage();
        const saved = localStorage.getItem("admin_products");
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return filterOutDeletedProducts(parsed, deletedSet);
          }
        }
        return filterOutDeletedProducts(INITIAL_CHOICOMMA_PRODUCTS, deletedSet);
      } catch (e) {}
    }
    return INITIAL_CHOICOMMA_PRODUCTS;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState("");
  const [productSortOrder, setProductSortOrderState] = useState<
    "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom"
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("admin_product_sort_order");
        if (
          saved &&
          ["productNoDesc", "productNoAsc", "nameAsc", "priceDesc", "priceAsc", "custom"].includes(saved)
        ) {
          return saved as any;
        }
      } catch (e) {}
    }
    return "custom";
  });

  const setProductSortOrder = useCallback((
    newOrder: "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom"
  ) => {
    setProductSortOrderState(newOrder);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("admin_product_sort_order", newOrder);
      } catch (e) {}
    }
  }, []);

  // Sync sort order on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("admin_product_sort_order");
      if (
        saved &&
        ["productNoDesc", "productNoAsc", "nameAsc", "priceDesc", "priceAsc", "custom"].includes(saved)
      ) {
        setProductSortOrderState(saved as any);
      }
    } catch (e) {}
  }, []);

  // One-time legacy local storage cleanup on admin mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hasCleaned = localStorage.getItem("choicomma_legacy_cleaned_v2");
      if (!hasCleaned) {
        localStorage.removeItem("admin_deleted_shipment_ids");
        const savedSessions = localStorage.getItem("admin_chat_sessions");
        if (savedSessions) {
          try {
            const parsed = JSON.parse(savedSessions);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(
                (s: any) => s?.id && s.id !== "vip@choicomma.com" && !s?.name?.includes("최상위 VIP")
              );
              localStorage.setItem("admin_chat_sessions", JSON.stringify(cleaned));
            }
          } catch {}
        }
        localStorage.setItem("choicomma_legacy_cleaned_v2", "true");
      }
    } catch {}
  }, []);

  // Concurrency queue to completely prevent race conditions and rollback overwrites
  const isSavingRef = useRef(false);
  const pendingSaveListRef = useRef<any[] | null>(null);

  // Client-side hydration sync for productsList (Source of Truth: Central Server File /api/products with Local Persistence)
  useEffect(() => {
    let isMounted = true;
    const fetchServerProducts = async () => {
      let hasLocalData = false;
      let localParsedList: any[] = [];
      const deletedSet = getDeletedProductIdsFromStorage();

      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("admin_products");
          if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              hasLocalData = true;
              localParsedList = parsed;
              const filtered = filterOutDeletedProducts(parsed, deletedSet);
              if (isMounted) {
                setProductsList(filtered);
                isProductsLoadedRef.current = true;
              }
            }
          }
        } catch (e) {}
      }

      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            const sanitized = filterOutDeletedProducts(data, deletedSet);
            // If local changes exist in this browser, preserve them; otherwise sync server catalog
            // Also if server catalog has items missing from local storage (e.g. quota issue or saved on server), sync server
            if (hasLocalData && localParsedList.length > 0) {
              const localIdSet = new Set(localParsedList.map((p: any) => String(p?.id || "")));
              const missingLocally = sanitized.filter((sp: any) => sp && !localIdSet.has(String(sp.id || "")));
              if (missingLocally.length > 0 || sanitized.length >= localParsedList.length) {
                setProductsList(sanitized);
                try {
                  localStorage.setItem("admin_products", JSON.stringify(sanitized));
                } catch (e) {}
              }
            } else {
              setProductsList(sanitized);
              try {
                localStorage.setItem("admin_products", JSON.stringify(sanitized));
              } catch (e) {}
            }
            isProductsLoadedRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch products from /api/products", err);
      }

      if (isMounted && !hasLocalData) {
        const fallback = filterOutDeletedProducts(INITIAL_CHOICOMMA_PRODUCTS, deletedSet);
        setProductsList((prev) => (prev.length > 0 ? prev : fallback));
        isProductsLoadedRef.current = true;
      }
    };

    fetchServerProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fast single product save helper (High performance save to Server file)
  const saveSingleProduct = useCallback(async (product: any, isNew: boolean = false): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, isNew }),
      });

      if (!res.ok) {
        console.error("Failed to persist single product, status:", res.status);
        triggerToast("⚠️ 상품 저장에 실패했습니다. 다시 시도해주세요.");
        return false;
      }

      // If this product was previously deleted, un-blacklist it
      removeDeletedProductIdsFromStorage([
        String(product.id || ""),
        String(product.productCode || ""),
        String(product.handle || ""),
      ]);

      window.dispatchEvent(new CustomEvent("admin_products_updated"));
      return true;
    } catch (err) {
      console.error("Failed to persist single product:", err);
      triggerToast("⚠️ 네트워크 오류로 상품 저장에 실패했습니다.");
      return false;
    }
  }, [triggerToast]);

  // Sequential queue processor ensuring save requests never resolve out-of-order
  const executeSaveQueue = useCallback(async (listToSend: any[]): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    isSavingRef.current = true;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listToSend),
      });

      if (!res.ok) {
        console.warn("Server file persistence skipped or failed (e.g. read-only serverless environment), local persistence active.");
        return false;
      }

      window.dispatchEvent(new CustomEvent("admin_products_updated"));
      return true;
    } catch (err) {
      console.warn("Network error during /api/products sync, local persistence active:", err);
      return false;
    } finally {
      isSavingRef.current = false;
      if (pendingSaveListRef.current !== null) {
        const nextList = pendingSaveListRef.current;
        pendingSaveListRef.current = null;
        setTimeout(() => {
          executeSaveQueue(nextList);
        }, 0);
      }
    }
  }, []);

  // Helper: Safely save to Central Server file (/api/products) and localStorage with concurrency protection
  const saveProductsToStorage = useCallback((list: any[]) => {
    if (typeof window === "undefined") return;

    // 1. Immediately persist to localStorage for instant reload resilience
    try {
      localStorage.setItem("admin_products", JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("admin_products_updated"));
      window.dispatchEvent(new CustomEvent("storage"));
    } catch (e) {
      console.warn("Failed to save products to localStorage, attempting lightweight fallback:", e);
      try {
        const lightList = list.map((p: any) => {
          if (!p) return p;
          let detail = p.detailDescription || "";
          if (typeof detail === "string" && detail.includes("data:image")) {
            detail = detail.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, "/product_1.webp");
          }
          return {
            ...p,
            detailDescription: detail,
            descriptionHtml: detail,
          };
        });
        localStorage.setItem("admin_products", JSON.stringify(lightList));
        window.dispatchEvent(new CustomEvent("admin_products_updated"));
        window.dispatchEvent(new CustomEvent("storage"));
      } catch (fallbackErr) {
        console.warn("Lightweight fallback also failed:", fallbackErr);
      }
    }

    // 2. Concurrency queue to server API (/api/products)
    if (isSavingRef.current) {
      // Save is currently in-flight; queue the latest snapshot so it executes immediately after
      pendingSaveListRef.current = list;
      return;
    }

    executeSaveQueue(list);
  }, [executeSaveQueue]);

  // Replace all products helper (Used for full JSON backup restore)
  const handleReplaceAllProducts = useCallback((fullList: any[]) => {
    if (!fullList || !Array.isArray(fullList) || fullList.length === 0) return;
    setProductsList(fullList);
    saveProductsToStorage(fullList);
    triggerToast(`총 ${fullList.length}개의 상품 목록이 파일로부터 성공적으로 동기화되었습니다.`);
  }, [saveProductsToStorage, triggerToast]);



  const getProductNoNum = useCallback((product: any): number => {
    if (product?.productNo !== undefined && !isNaN(Number(product.productNo))) {
      return Number(product.productNo);
    }
    const code = product?.productCode || product?.id || "";
    const match = String(code).match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 0;
  }, []);

  const getProductNo = useCallback((product: any): string => {
    if (product?.productCode && String(product.productCode).startsWith("CC-")) {
      return String(product.productCode);
    }
    const num = getProductNoNum(product);
    return `CC-${String(num).padStart(3, "0")}`;
  }, [getProductNoNum]);

  const getSortedBaseList = useCallback(
    (list: any[], order: string) => {
      if (order === "custom") return [...list];
      return [...list].sort((a, b) => {
        if (order === "productNoDesc") {
          // 최신 등록순 (1순위: 등록번호 높은 순, 2순위: 등록일시 최신순)
          const numA = getProductNoNum(a);
          const numB = getProductNoNum(b);
          if (numB !== numA) return numB - numA;

          const timeA = (a.created_at || a.createdAt) ? new Date(a.created_at || a.createdAt).getTime() : 0;
          const timeB = (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (order === "productNoAsc") {
          const numA = getProductNoNum(a);
          const numB = getProductNoNum(b);
          if (numA !== numB) return numA - numB;
          return 0;
        }
        if (order === "nameAsc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (order === "priceDesc") {
          const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
          const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
          return pB - pA;
        }
        if (order === "priceAsc") {
          const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
          const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
          return pA - pB;
        }
        return 0;
      });
    },
    [getProductNoNum]
  );

  const filteredProducts = useMemo(() => {
    const filtered = productsList.filter((p) => {
      // Ignore main banner slides from product catalog
      if (p.categoryId === "main_banner" || String(p.id).startsWith("hero-slide-")) {
        return false;
      }

      // 1. Search Query Filter (Supports multi-term AND search, CC-code variations, tags, colors, categories)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const terms = q.split(/\s+/).filter(Boolean);

        const code = (p.productCode || "").toLowerCase();
        const dynamicCode = getProductNo(p).toLowerCase();
        const no = String(p.productNo || "");
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const detailDesc = (p.detailDescription || "").toLowerCase();
        const handle = (p.handle || "").toLowerCase();
        const colors = Array.isArray(p.colors) ? p.colors.join(" ").toLowerCase() : "";
        const tags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : "";
        const category = (p.categoryId || "").toLowerCase();

        // Normalized codes without hyphens/spaces (e.g., "cc463" matches "CC-463")
        const codeClean = code.replace(/[^a-z0-9가-힣]/g, "");
        const dynamicCodeClean = dynamicCode.replace(/[^a-z0-9가-힣]/g, "");

        // Category Korean keyword mappings for natural search
        const catMap: Record<string, string[]> = {
          outer: ["아우터", "자켓", "재킷", "코트", "패딩", "점퍼"],
          top: ["상의", "니트", "셔츠", "티셔츠", "맨투맨", "후드", "블라우스"],
          bottom: ["하의", "바지", "팬츠", "스커트", "치마", "슬랙스", "데님"],
          bag: ["가방", "백", "토트", "숄더"],
          shoes: ["신발", "슈즈", "부츠", "로퍼", "스니커즈"],
          accessory: ["악세사리", "액세서리", "잡화", "머플러", "스카프", "벨트", "모자"],
          timesale: ["타임세일", "세일", "할인"],
        };

        const catKeywords = (catMap[category] || []).join(" ");

        const matchesAllTerms = terms.every((term) => {
          const termClean = term.replace(/[^a-z0-9가-힣]/g, "");
          return (
            code.includes(term) ||
            dynamicCode.includes(term) ||
            no.includes(term) ||
            title.includes(term) ||
            desc.includes(term) ||
            detailDesc.includes(term) ||
            handle.includes(term) ||
            colors.includes(term) ||
            tags.includes(term) ||
            category.includes(term) ||
            catKeywords.includes(term) ||
            (termClean.length >= 2 && (codeClean.includes(termClean) || dynamicCodeClean.includes(termClean)))
          );
        });

        if (!matchesAllTerms) {
          return false;
        }
      }

      // 2. Category Filter (Case-insensitive, supports categoryIds array and time-sale tags)
      if (selectedCategoryFilter !== "all") {
        const filterLower = selectedCategoryFilter.toLowerCase();
        if (filterLower === "timesale") {
          const isTimeSale =
            (p.categoryId && String(p.categoryId).toLowerCase() === "timesale") ||
            (Array.isArray(p.categoryIds) && p.categoryIds.some((c: string) => String(c).toLowerCase() === "timesale")) ||
            p.isTimeSale === true ||
            adminTimeSaleProductIds.includes(String(p.id)) ||
            (p.timeSaleDiscountRate !== undefined && Number(p.timeSaleDiscountRate) > 0);
          if (!isTimeSale) return false;
        } else {
          const prodCat = p.categoryId ? String(p.categoryId).toLowerCase() : "";
          const prodCats = Array.isArray(p.categoryIds) ? p.categoryIds.map((c: any) => String(c).toLowerCase()) : [];
          const hasCategory = prodCat === filterLower || prodCats.includes(filterLower);
          if (!hasCategory) return false;
        }
      }

      return true;
    });

    return getSortedBaseList(filtered, productSortOrder);
  }, [productsList, searchQuery, selectedCategoryFilter, productSortOrder, adminTimeSaleProductIds, getProductNo, getSortedBaseList]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryForProducts) return [];
    const filterLower = selectedCategoryForProducts.toLowerCase();
    if (filterLower === "timesale") {
      return productsList.filter(
        (p) =>
          (p.categoryId && String(p.categoryId).toLowerCase() === "timesale") ||
          (Array.isArray(p.categoryIds) && p.categoryIds.some((c: string) => String(c).toLowerCase() === "timesale")) ||
          p.isTimeSale === true ||
          adminTimeSaleProductIds.includes(String(p.id)) ||
          (p.timeSaleDiscountRate !== undefined && Number(p.timeSaleDiscountRate) > 0)
      );
    }
    return productsList.filter((p) => {
      const prodCat = p.categoryId ? String(p.categoryId).toLowerCase() : "";
      const prodCats = Array.isArray(p.categoryIds) ? p.categoryIds.map((c: any) => String(c).toLowerCase()) : [];
      return prodCat === filterLower || prodCats.includes(filterLower);
    });
  }, [selectedCategoryForProducts, productsList, adminTimeSaleProductIds]);

  const actualProductsCount = useMemo(() => {
    return productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")).length;
  }, [productsList]);

  const getProductStock = useCallback((product: any) => {
    if (product?.stock !== undefined && product?.stock !== null) return Number(product.stock);
    return 0;
  }, []);

  const toggleStock = useCallback((id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const isCurrentlyAvailable = targetProduct.availableForSale !== false;
    const confirmMessage = isCurrentlyAvailable
      ? `'${targetProduct.title}' 상품을 품절 처리하시겠습니까?`
      : `'${targetProduct.title}' 상품을 [재고 있음] 상태로 변경하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    const nextAvailable = !isCurrentlyAvailable;

    const updated = productsList.map((p) => {
      if (p.id === id) {
        triggerToast(
          nextAvailable
            ? `'${p.title}' 상태가 [재고 있음]으로 변경되었습니다.`
            : `'${p.title}' 상품이 [품절] 처리되었습니다.`
        );
        return { ...p, availableForSale: nextAvailable };
      }
      return p;
    });

    setProductsList(updated);
    saveProductsToStorage(updated);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const toggleProductPurchasable = useCallback((id: string) => {
    const targetProduct = productsList.find((p) => String(p.id) === String(id));
    if (!targetProduct) return;

    const isCurrentlyAvailable = targetProduct.availableForSale !== false;
    const nextAvailable = !isCurrentlyAvailable;

    const confirmMessage = nextAvailable
      ? `'${targetProduct.title}' 상품의 구매를 [ON (구매 가능)] 상태로 변경하시겠습니까?`
      : `'${targetProduct.title}' 상품의 구매를 [OFF (구매 불가)] 상태로 변경하시겠습니까?\n\n변경 시 고객 쇼핑몰 화면에서 구매 버튼이 비활성화됩니다.`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    const updated = productsList.map((p) => {
      if (String(p.id) === String(id)) {
        return {
          ...p,
          availableForSale: nextAvailable,
          variants: Array.isArray(p.variants)
            ? p.variants.map((v: any) => ({ ...v, availableForSale: nextAvailable }))
            : p.variants,
        };
      }
      return p;
    });

    setProductsList(updated);
    saveProductsToStorage(updated);
    triggerToast(
      nextAvailable
        ? `'${targetProduct.title}' 상품이 [구매 가능(ON)]으로 설정되었습니다.`
        : `'${targetProduct.title}' 상품이 [구매 불가(OFF)]로 설정되었습니다.`
    );
  }, [productsList, saveProductsToStorage, triggerToast]);

  const toggleMainFeatured = useCallback((id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const isCurrentlyFeatured = targetProduct.isMainFeatured === true;
    const nextFeatured = !isCurrentlyFeatured;

    const confirmMsg = nextFeatured
      ? `'${targetProduct.title}' 상품을 쇼핑몰에 정상 진열(전체 노출)하시겠습니까?`
      : `'${targetProduct.title}' 상품을 미진열(쇼핑몰 전체에서 완전히 숨김) 처리하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const updated = productsList.map((p) => {
      if (p.id === id) {
        triggerToast(
          nextFeatured
            ? `'${p.title}' 상품이 쇼핑몰 [정상 진열]로 설정되었습니다.`
            : `'${p.title}' 상품이 쇼핑몰 [미진열 (전체 숨김)] 처리되었습니다.`
        );
        const existingTags = Array.isArray(p.tags) ? p.tags : [];
        let newTags = [...existingTags];
        if (nextFeatured) {
          if (!newTags.includes("top-seller")) newTags.push("top-seller");
        } else {
          newTags = newTags.filter((t: string) => t !== "top-seller");
        }
        return {
          ...p,
          isMainFeatured: nextFeatured,
          tags: newTags,
        };
      }
      return p;
    });

    setProductsList(updated);
    saveProductsToStorage(updated);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleDeleteProduct = useCallback(async (id: string, title: string) => {
    const isConfirmed = window.confirm(
      `정말로 '${title}' 상품을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const targetProduct = productsList.find((p) => String(p.id) === String(id));
    const idsToBlacklist: string[] = [String(id)];
    if (targetProduct) {
      if (targetProduct.productCode) idsToBlacklist.push(String(targetProduct.productCode));
      if (targetProduct.handle) idsToBlacklist.push(String(targetProduct.handle));
    }

    // 1. Immediately record in persistent deleted IDs blacklist in localStorage
    addDeletedProductIdsToStorage(idsToBlacklist);

    // 2. Optimistically remove from state & localStorage
    const updatedList = productsList.filter(
      (p) =>
        String(p.id) !== String(id) &&
        (!targetProduct?.productCode || String(p.productCode) !== String(targetProduct.productCode))
    );
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);

    // 3. Explicitly call Server DELETE endpoint
    try {
      await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (delErr) {
      console.warn("Failed to call /api/products DELETE endpoint:", delErr);
    }

    // 4. Sync adminTimeSaleProductIds if the deleted product was in timesale
    if (adminTimeSaleProductIds.includes(String(id))) {
      const updatedTimeSaleIds = adminTimeSaleProductIds.filter((pId) => pId !== String(id));
      setAdminTimeSaleProductIds?.(updatedTimeSaleIds);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedTimeSaleIds));
        } catch {}
      }
    }

    // 5. Clean up from set bundle items if applicable
    if (typeof window !== "undefined") {
      try {
        const setSalesRaw = localStorage.getItem("admin_set_sales");
        if (setSalesRaw) {
          const setSales = JSON.parse(setSalesRaw);
          if (Array.isArray(setSales)) {
            const cleaned = setSales.map((s: any) => ({
              ...s,
              items: Array.isArray(s.items)
                ? s.items.filter((item: any) => String(item.id || item.productId) !== String(id))
                : s.items,
            }));
            localStorage.setItem("admin_set_sales", JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent("admin_set_sales_updated"));
          }
        }
      } catch {}
    }

    window.dispatchEvent(new CustomEvent("admin_products_updated"));
    window.dispatchEvent(new CustomEvent("products_updated"));
    triggerToast(`'${title}' 상품이 성공적으로 삭제되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast, adminTimeSaleProductIds, setAdminTimeSaleProductIds]);

  const handleBulkUpdateMainFeatured = useCallback((targetIds: string[], isFeatured: boolean) => {
    if (!targetIds || targetIds.length === 0) return;
    const actionLabel = isFeatured ? "쇼핑몰 전체 정상 진열" : "쇼핑몰 전체 미진열 (완전 숨김)";
    const isConfirmed = window.confirm(
      `선택한 ${targetIds.length}개 상품을 [${actionLabel}]로 일괄 변경하시겠습니까?`
    );
    if (!isConfirmed) return;

    const idSet = new Set(targetIds.map(String));
    const updatedList = productsList.map((p) => {
      if (idSet.has(String(p.id))) {
        const existingTags = Array.isArray(p.tags) ? p.tags : [];
        let newTags = [...existingTags];
        if (isFeatured) {
          if (!newTags.includes("top-seller")) {
            newTags.push("top-seller");
          }
        } else {
          newTags = newTags.filter((t: string) => t !== "top-seller");
        }
        return {
          ...p,
          isMainFeatured: isFeatured,
          tags: newTags,
        };
      }
      return p;
    });

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(
      isFeatured
        ? `✨ 선택한 ${targetIds.length}개 상품이 쇼핑몰 [정상 진열]로 일괄 등록되었습니다.`
        : `🔒 선택한 ${targetIds.length}개 상품이 쇼핑몰 [미진열 (전체 숨김)]으로 일괄 변경되었습니다.`
    );
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleBulkUpdateStock = useCallback((targetIds: string[], stockQty: number) => {
    if (!targetIds || targetIds.length === 0) return;
    const actionLabel = stockQty === 0 ? "품절 (재고 0개)" : `정상 판매중 (재고 ${stockQty}개)`;
    const isConfirmed = window.confirm(
      `선택한 ${targetIds.length}개 상품의 재고를 [${actionLabel}]으로 일괄 설정하시겠습니까?`
    );
    if (!isConfirmed) return;

    const idSet = new Set(targetIds.map(String));
    const isSoldOut = stockQty === 0;
    const updatedList = productsList.map((p) => {
      if (idSet.has(String(p.id))) {
        let updatedStockMap = p.stockMap;
        let updatedSizeStock = p.sizeStock;

        if (isSoldOut) {
          if (p.sizeStock && typeof p.sizeStock === "object") {
            const clearedSizeStock: Record<string, number> = {};
            Object.keys(p.sizeStock).forEach((k) => {
              clearedSizeStock[k] = 0;
            });
            updatedSizeStock = clearedSizeStock;
          }
          if (p.stockMap && typeof p.stockMap === "object") {
            const clearedStockMap: Record<string, number> = {};
            Object.keys(p.stockMap).forEach((k) => {
              clearedStockMap[k] = 0;
            });
            updatedStockMap = clearedStockMap;
          }
        }

        const nextAvail = isSoldOut ? false : (p.availableForSale !== false);
        return {
          ...p,
          stock: stockQty,
          availableForSale: nextAvail,
          sizeStock: updatedSizeStock,
          stockMap: updatedStockMap,
          variants: Array.isArray(p.variants)
            ? p.variants.map((v: any) => ({ ...v, availableForSale: nextAvail }))
            : p.variants,
        };
      }
      return p;
    });

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(
      isSoldOut
        ? `🔒 선택한 ${targetIds.length}개 상품이 [품절] 상태로 일괄 변경되었습니다.`
        : `📦 선택한 ${targetIds.length}개 상품의 재고가 [${stockQty}개]로 일괄 변경되었습니다.`
    );
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleBulkDeleteProducts = useCallback(async (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const isConfirmed = window.confirm(
      `정말로 선택한 ${targetIds.length}개의 상품을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const idSet = new Set(targetIds.map(String));
    const allIdsToBlacklist = new Set<string>(targetIds.map(String));
    productsList.forEach((p) => {
      if (idSet.has(String(p.id)) || (p.productCode && idSet.has(String(p.productCode)))) {
        if (p.id) allIdsToBlacklist.add(String(p.id));
        if (p.productCode) allIdsToBlacklist.add(String(p.productCode));
        if (p.handle) allIdsToBlacklist.add(String(p.handle));
      }
    });

    // 1. Immediately record in persistent deleted IDs blacklist in localStorage
    addDeletedProductIdsToStorage(Array.from(allIdsToBlacklist));

    // 2. Optimistically remove from state & localStorage
    const updatedList = productsList.filter((p) => !allIdsToBlacklist.has(String(p.id)));
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);

    // 3. Explicitly call Server DELETE endpoint
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(allIdsToBlacklist) }),
      });
    } catch (delErr) {
      console.warn("Failed to delete via /api/products DELETE endpoint:", delErr);
    }

    // 4. Clean up any deleted IDs from timesale
    const remainingTimeSaleIds = adminTimeSaleProductIds.filter((pId) => !allIdsToBlacklist.has(String(pId)));
    if (remainingTimeSaleIds.length !== adminTimeSaleProductIds.length) {
      setAdminTimeSaleProductIds?.(remainingTimeSaleIds);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(remainingTimeSaleIds));
        } catch {}
      }
    }

    // 5. Clean up from set sales
    if (typeof window !== "undefined") {
      try {
        const setSalesRaw = localStorage.getItem("admin_set_sales");
        if (setSalesRaw) {
          const setSales = JSON.parse(setSalesRaw);
          if (Array.isArray(setSales)) {
            const cleaned = setSales.map((s: any) => ({
              ...s,
              items: Array.isArray(s.items)
                ? s.items.filter((item: any) => !allIdsToBlacklist.has(String(item.id || item.productId)))
                : s.items,
            }));
            localStorage.setItem("admin_set_sales", JSON.stringify(cleaned));
            window.dispatchEvent(new CustomEvent("admin_set_sales_updated"));
          }
        }
      } catch {}
    }

    window.dispatchEvent(new CustomEvent("admin_products_updated"));
    window.dispatchEvent(new CustomEvent("products_updated"));
    triggerToast(`🗑️ 선택한 ${targetIds.length}개 상품이 성공적으로 삭제되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast, adminTimeSaleProductIds, setAdminTimeSaleProductIds]);

  const handleReorderProducts = useCallback((fromId: string, toId: string, showToast: boolean = true) => {
    setProductSortOrder("custom");
    const baseList = getSortedBaseList(productsList, productSortOrder);
    const fromIdx = baseList.findIndex((p) => String(p.id) === String(fromId));
    const toIdx = baseList.findIndex((p) => String(p.id) === String(toId));
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const updated = [...baseList];
    const [movedItem] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, movedItem);
    setProductsList(updated);
    saveProductsToStorage(updated);
    if (showToast) {
      triggerToast(`'${movedItem.title}' 상품 순서가 이동되었습니다.`);
    }
  }, [getSortedBaseList, productSortOrder, productsList, saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleClearAllProducts = useCallback(async () => {
    const totalCount = actualProductsCount;
    const isConfirmed = window.confirm(
      `정말로 상품관리에 등록된 전체 상품 (${totalCount}개)을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const allIds = productsList.map((p) => String(p.id));
    addDeletedProductIdsToStorage(allIds);

    setProductsList([]);
    saveProductsToStorage([]);
    setAdminTimeSaleProductIds?.([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("admin_products", JSON.stringify([]));
        localStorage.removeItem("admin_custom_products");
        localStorage.removeItem("secret_timesale_product_ids");
      } catch {}
    }

    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: allIds }),
      });
    } catch {}

    window.dispatchEvent(new CustomEvent("admin_products_updated"));
    window.dispatchEvent(new CustomEvent("products_updated"));
    triggerToast(`🗑️ 상품관리에 등록된 전체 상품 ${totalCount}개가 모두 성공적으로 삭제되었습니다.`);
  }, [actualProductsCount, productsList, saveProductsToStorage, triggerToast, setAdminTimeSaleProductIds]);

  const handleRestoreDefaultProducts = useCallback(async () => {
    const isConfirmed = window.confirm(
      "정말로 모든 상품 데이터를 '초이콤마 정식 카탈로그 (50개)'로 초기화하시겠습니까?\n임시 등록/수정 내역이 정리되고 원본 상품 50개로 복원됩니다."
    );
    if (!isConfirmed) return;

    // Clear client-side deleted blacklist on explicit restore
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("admin_deleted_product_ids");
      } catch {}
    }

    try {
      const res = await fetch("/api/products?action=restore", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setProductsList(data.products);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("admin_products", JSON.stringify(data.products));
              window.dispatchEvent(new CustomEvent("admin_products_updated"));
              window.dispatchEvent(new CustomEvent("storage"));
            } catch {}
          }
          triggerToast(`✨ 전체 상품 리스트가 정식 카탈로그(${data.products.length}개)로 완벽하게 초기화되었습니다!`);
          return;
        }
      }
    } catch (e) {
      console.warn("Direct restore endpoint failed, falling back to local seed:", e);
    }

    const freshCatalog = JSON.parse(JSON.stringify(INITIAL_CHOICOMMA_PRODUCTS));
    setProductsList(freshCatalog);
    saveProductsToStorage(freshCatalog);
    triggerToast("✨ 전체 상품 리스트가 정식 카탈로그(50개)로 완벽하게 초기화되었습니다!");
  }, [saveProductsToStorage, triggerToast]);

  const handleBulkAddProducts = useCallback((newProducts: any[]) => {
    if (!newProducts || newProducts.length === 0) return;
    const idsToUnblacklist: string[] = [];
    newProducts.forEach((p) => {
      if (p.id) idsToUnblacklist.push(String(p.id));
      if (p.productCode) idsToUnblacklist.push(String(p.productCode));
      if (p.handle) idsToUnblacklist.push(String(p.handle));
    });
    removeDeletedProductIdsFromStorage(idsToUnblacklist);

    const updatedList = [...newProducts, ...productsList];
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(`📊 엑셀 일괄 업로드 완료! ${newProducts.length}개의 신규 상품이 성공적으로 등록되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleMoveProduct = useCallback((id: string, direction: "up" | "down") => {
    setProductSortOrder("custom");
    const baseList = getSortedBaseList(productsList, productSortOrder);
    const currentFiltered = filteredProducts;
    const filteredIdx = currentFiltered.findIndex((p) => String(p.id) === String(id));

    if (filteredIdx !== -1) {
      const targetFilteredIdx = direction === "up" ? filteredIdx - 1 : filteredIdx + 1;
      if (targetFilteredIdx >= 0 && targetFilteredIdx < currentFiltered.length) {
        const neighbor = currentFiltered[targetFilteredIdx];
        const fromIdx = baseList.findIndex((p) => String(p.id) === String(id));
        const toIdx = baseList.findIndex((p) => String(p.id) === String(neighbor.id));
        if (fromIdx !== -1 && toIdx !== -1) {
          const updated = [...baseList];
          const [movedItem] = updated.splice(fromIdx, 1);
          updated.splice(toIdx, 0, movedItem);
          setProductsList(updated);
          saveProductsToStorage(updated);
          triggerToast(`'${movedItem.title}' 상품 순서가 이동되었습니다.`);
          return;
        }
      }
    }

    const idx = baseList.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= baseList.length) return;

    const newList = [...baseList];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;

    setProductsList(newList);
    saveProductsToStorage(newList);
    triggerToast(`'${temp.title}' 상품 순서가 이동되었습니다.`);
  }, [filteredProducts, getSortedBaseList, productSortOrder, productsList, saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleMoveProductToTop = useCallback((id: string) => {
    setProductSortOrder("custom");
    const baseList = getSortedBaseList(productsList, productSortOrder);
    const idx = baseList.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return;
    if (idx === 0) {
      triggerToast(`'${baseList[0].title}' 상품은 이미 최상단에 위치해 있습니다.`);
      return;
    }
    const updated = [...baseList];
    const [movedItem] = updated.splice(idx, 1);
    updated.unshift(movedItem);
    setProductsList(updated);
    saveProductsToStorage(updated);
    triggerToast(`⬆️ '${movedItem.title}' 상품이 목록 최상단으로 이동되었습니다.`);
  }, [getSortedBaseList, productSortOrder, productsList, saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleBulkMoveToTop = useCallback((targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    setProductSortOrder("custom");
    const baseList = getSortedBaseList(productsList, productSortOrder);
    const idSet = new Set(targetIds.map(String));
    const selected = baseList.filter((p) => idSet.has(String(p.id)));
    const unselected = baseList.filter((p) => !idSet.has(String(p.id)));
    if (selected.length === 0) return;
    const updated = [...selected, ...unselected];
    setProductsList(updated);
    saveProductsToStorage(updated);
    triggerToast(`⬆️ 선택한 ${selected.length}개 상품이 목록 최상단으로 일괄 이동되었습니다.`);
  }, [getSortedBaseList, productSortOrder, productsList, saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleSortOrderChange = useCallback((
    newOrder: "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom"
  ) => {
    setProductSortOrder(newOrder);
    triggerToast(
      newOrder === "custom"
        ? "✅ 사용자 지정 순서(드래그 앤 드롭) 모드로 변경되었습니다."
        : newOrder === "productNoDesc"
        ? "✅ 상품 목록이 '최신 등록순'으로 정렬되었습니다."
        : newOrder === "productNoAsc"
        ? "✅ 상품 목록이 '등록번호 순'으로 정렬되었습니다."
        : newOrder === "nameAsc"
        ? "✅ 상품 목록이 '상품명 순'으로 정렬되었습니다."
        : newOrder === "priceDesc"
        ? "✅ 상품 목록이 '높은 가격순'으로 정렬되었습니다."
        : "✅ 상품 목록이 '낮은 가격순'으로 정렬되었습니다."
    );
  }, [setProductSortOrder, triggerToast]);

  const handleQuickUpdateReleaseSchedule = useCallback(
    (id: string, availableForSale: boolean, releaseDate?: string) => {
      const targetProduct = productsList.find((p) => String(p.id) === String(id));
      if (!targetProduct) return;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          const updatedItem: any = {
            ...p,
            availableForSale,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => ({ ...v, availableForSale }))
              : p.variants,
          };
          if (releaseDate && releaseDate.trim()) {
            updatedItem.releaseDate = releaseDate.trim();
          } else {
            delete updatedItem.releaseDate;
          }
          return updatedItem;
        }
        return p;
      });

      setProductsList(updatedList);
      saveProductsToStorage(updatedList);

      if (releaseDate && new Date(releaseDate).getTime() > Date.now()) {
        triggerToast(
          `⏰ '${targetProduct.title}' 상품 오픈이 ${new Date(releaseDate).toLocaleString("ko-KR", {
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}으로 예약되었습니다.`
        );
      } else if (!availableForSale) {
        triggerToast(`🚫 '${targetProduct.title}' 상품이 [구매 불가(OFF)]로 설정되었습니다.`);
      } else {
        triggerToast(`✓ '${targetProduct.title}' 상품이 [구매 가능(ON / 상시판매)]으로 설정되었습니다.`);
      }
    },
    [productsList, saveProductsToStorage, triggerToast]
  );

  const handleQuickUpdateCategory = useCallback(
    (id: string, newCategory: string) => {
      const targetProd = productsList.find((p) => String(p.id) === String(id));
      if (!targetProd) return;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          const existingTags = Array.isArray(p.tags) ? p.tags : [];
          let newTags = [...existingTags];
          if (newCategory === "timesale") {
            if (!newTags.includes("TIMESALE")) newTags.push("TIMESALE");
          } else {
            newTags = newTags.filter((t: string) => t !== "TIMESALE");
          }
          return {
            ...p,
            categoryId: newCategory,
            categoryIds: [newCategory],
            isTimeSale: newCategory === "timesale",
            tags: newTags,
          };
        }
        return p;
      });

      if (newCategory === "timesale") {
        if (!adminTimeSaleProductIds.includes(String(id))) {
          const updatedIds = [...adminTimeSaleProductIds, String(id)];
          setAdminTimeSaleProductIds?.(updatedIds);
          if (typeof window !== "undefined") {
            localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
          }
        }
        const h = parseInt(adminTimeSaleHours) || 24;
        const m = parseInt(adminTimeSaleMinutes) || 0;
        const rateNum = parseInt(adminTimeSaleDiscount) || 35;
        handleUpdateProductTimeSetting?.(String(id), h, m, undefined, rateNum);
      } else {
        if (adminTimeSaleProductIds.includes(String(id))) {
          const filteredIds = adminTimeSaleProductIds.filter((pId) => pId !== String(id));
          setAdminTimeSaleProductIds?.(filteredIds);
          if (typeof window !== "undefined") {
            localStorage.setItem("secret_timesale_product_ids", JSON.stringify(filteredIds));
          }
        }
      }

      setProductsList(updatedList);
      saveProductsToStorage(updatedList);
      triggerToast(`카테고리가 [${newCategory.toUpperCase()}] (으)로 즉시 변경되었습니다.`);
    },
    [
      productsList,
      adminTimeSaleProductIds,
      adminTimeSaleHours,
      adminTimeSaleMinutes,
      adminTimeSaleDiscount,
      setAdminTimeSaleProductIds,
      handleUpdateProductTimeSetting,
      saveProductsToStorage,
      triggerToast,
    ]
  );

  const handleQuickUpdatePrice = useCallback(
    (id: string, newPrice: number | string): boolean => {
      const priceNum = String(newPrice).replace(/[^0-9]/g, "");
      const targetProduct = productsList.find((p) => String(p.id) === String(id));
      const currentPrice =
        targetProduct?.priceRange?.minVariantPrice?.amount || targetProduct?.price?.amount || "0";
      if (!priceNum || priceNum === String(currentPrice)) return false;

      const origFormatted = Number(currentPrice).toLocaleString();
      const newFormatted = Number(priceNum).toLocaleString();
      const isConfirmed = window.confirm(
        `[${targetProduct?.title || "상품"}]\n판매가를 ${origFormatted}원 ➡️ ${newFormatted}원으로 변경하시겠습니까?`
      );
      if (!isConfirmed) return false;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          return {
            ...p,
            price: { amount: priceNum, currencyCode: "KRW" },
            priceRange: {
              maxVariantPrice: { amount: priceNum, currencyCode: "KRW" },
              minVariantPrice: { amount: priceNum, currencyCode: "KRW" },
            },
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => ({
                  ...v,
                  price: { amount: priceNum, currencyCode: "KRW" },
                }))
              : p.variants,
          };
        }
        return p;
      });
      setProductsList(updatedList);
      saveProductsToStorage(updatedList);
      triggerToast(`판매가가 ${newFormatted}원으로 변경되었습니다.`);
      return true;
    },
    [productsList, saveProductsToStorage, triggerToast]
  );

  const handleQuickUpdateStock = useCallback(
    (id: string, newTotalStock: number, newSizeStock?: Record<string, number>) => {
      const targetProduct = productsList.find((p) => String(p.id) === String(id));
      if (!targetProduct) return;

      // If stock becomes 0, it is out of stock (availableForSale: false).
      // If stock > 0, PRESERVE the product's explicit availableForSale state so 구매불가 is never unlocked by stock changes!
      const isAvailable = newTotalStock > 0 ? (targetProduct.availableForSale !== false) : false;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          return {
            ...p,
            stock: newTotalStock,
            sizeStock: newSizeStock !== undefined ? newSizeStock : p.sizeStock,
            stockMap: newSizeStock !== undefined ? newSizeStock : p.stockMap,
            availableForSale: isAvailable,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => {
                  let variantAvailable = isAvailable;
                  if (newSizeStock && v.selectedOptions) {
                    const colOpt = v.selectedOptions.find((o: any) => o.name === "Color")?.value;
                    const szOpt = v.selectedOptions.find((o: any) => o.name === "Size")?.value;
                    if (colOpt && szOpt && newSizeStock[`${colOpt}-${szOpt}`] !== undefined) {
                      variantAvailable = isAvailable && Number(newSizeStock[`${colOpt}-${szOpt}`]) > 0;
                    } else if (szOpt && newSizeStock[szOpt] !== undefined) {
                      variantAvailable = isAvailable && Number(newSizeStock[szOpt]) > 0;
                    }
                  }
                  return {
                    ...v,
                    availableForSale: variantAvailable,
                  };
                })
              : p.variants,
          };
        }
        return p;
      });

      setProductsList(updatedList);
      saveProductsToStorage(updatedList);
      if (newTotalStock === 0) {
        triggerToast(`[${targetProduct.title}] 상품이 품절 처리되었습니다.`);
      } else {
        triggerToast(`[${targetProduct.title}] 재고가 ${newTotalStock}개로 업데이트되었습니다.`);
      }
    },
    [productsList, saveProductsToStorage, triggerToast]
  );

  return {
    productsList,
    setProductsList,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedCategoryForProducts,
    setSelectedCategoryForProducts,
    productSortOrder,
    setProductSortOrder,
    saveProductsToStorage,
    saveSingleProduct,
    getProductNoNum,
    getProductNo,
    filteredProducts,
    categoryProducts,
    actualProductsCount,
    getProductStock,
    toggleStock,
    toggleProductPurchasable,
    toggleMainFeatured,
    handleDeleteProduct,
    handleBulkUpdateMainFeatured,
    handleBulkUpdateStock,
    handleBulkDeleteProducts,
    handleReorderProducts,
    handleClearAllProducts,
    handleRestoreDefaultProducts,
    handleBulkAddProducts,
    handleReplaceAllProducts,
    handleMoveProduct,
    handleMoveProductToTop,
    handleBulkMoveToTop,
    handleSortOrderChange,
    handleQuickUpdateReleaseSchedule,
    handleQuickUpdateCategory,
    handleQuickUpdatePrice,
    handleQuickUpdateStock,
  };
}
