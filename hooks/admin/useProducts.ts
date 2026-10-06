"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import excelParsedProducts from "@/lib/sfcc/mock/parsed-products.json";
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

export function useProducts({
  triggerToast,
  adminTimeSaleProductIds = [],
  setAdminTimeSaleProductIds,
  adminTimeSaleHours = "24",
  adminTimeSaleMinutes = "0",
  adminTimeSaleDiscount = "35",
  handleUpdateProductTimeSetting,
}: UseProductsOptions) {
  const INITIAL_CHOICOMMA_PRODUCTS: any[] = excelParsedProducts as any[];

  const isProductsLoadedRef = useRef(false);
  const [productsList, setProductsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("admin_products");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
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

  // Sync sort order and local storage on client mount
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
      const cached = localStorage.getItem("admin_products");
      if (cached && !isProductsLoadedRef.current) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProductsList(parsed);
        }
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

  // Helper: Prune huge base64 strings so catalog safely fits inside browser's 5MB localStorage
  const pruneForLocalStorage = (items: any[]) => {
    return items.map((p) => {
      let detailDesc = p.detailDescription;
      if (typeof detailDesc === "string" && (detailDesc.length > 5000 || detailDesc.includes("data:image/"))) {
        detailDesc = detailDesc.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, "/product_1.webp");
      }

      // Truncate huge images array for localStorage fallback
      let imgs = Array.isArray(p.images) ? p.images : [];
      let cleanedImgs = imgs.map((img: any) => {
        const urlStr = typeof img === "string" ? img : img?.url || "";
        if (typeof urlStr === "string" && urlStr.startsWith("data:image/")) {
          return typeof img === "string" ? "/product_1.webp" : { ...img, url: "/product_1.webp" };
        }
        return img;
      });

      // Clean huge colorImages base64
      let cleanedColorImgs: Record<string, string> = {};
      if (p.colorImages && typeof p.colorImages === "object") {
        Object.entries(p.colorImages).forEach(([k, v]) => {
          if (typeof v === "string" && (v as string).startsWith("data:image/")) {
            cleanedColorImgs[k] = "/product_1.webp";
          } else {
            cleanedColorImgs[k] = v as string;
          }
        });
      }

      return {
        ...p,
        detailDescription: detailDesc,
        images: cleanedImgs,
        featuredImage: (p.featuredImage?.url && p.featuredImage.url.startsWith("data:image/"))
          ? { ...p.featuredImage, url: "/product_1.webp" }
          : p.featuredImage,
        colorImages: cleanedColorImgs,
      };
    });
  };

  // Helper: Safely save custom products backup in localStorage
  const saveCustomProductsBackup = (items: any[]) => {
    if (typeof window === "undefined") return;
    try {
      const customItems = items.filter(
        (p: any) => String(p.id).startsWith("custom-prod-") || String(p.id).startsWith("prod-custom-")
      );
      if (customItems.length > 0) {
        localStorage.setItem("admin_custom_products", JSON.stringify(customItems));
      }
    } catch (e) {}
  };

  // Client-side hydration sync for productsList (Source of Truth: Central Server API /api/products)
  useEffect(() => {
    const fetchServerProducts = async () => {
      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            let merged = [...data];

            // Ensure locally cached custom products are not dropped if server sync had a delay
            if (typeof window !== "undefined") {
              try {
                const savedCustomRaw = localStorage.getItem("admin_custom_products");
                if (savedCustomRaw) {
                  const savedCustom = JSON.parse(savedCustomRaw);
                  if (Array.isArray(savedCustom)) {
                    const serverIdSet = new Set(merged.map((p: any) => String(p.id)));
                    const missing = savedCustom.filter((cp: any) => cp?.id && !serverIdSet.has(String(cp.id)));
                    if (missing.length > 0) {
                      merged = [...missing, ...merged];
                    }
                  }
                }
              } catch (e) {}
            }

            const hasHero = merged.some((p: any) => p.isHeroFeatured === true);
            if (!hasHero) {
              const defaultHeroes = INITIAL_CHOICOMMA_PRODUCTS.filter((p: any) => p.isHeroFeatured === true);
              defaultHeroes.forEach((dh: any) => {
                const existingIdx = merged.findIndex((p: any) => String(p.id) === String(dh.id));
                if (existingIdx !== -1) {
                  merged[existingIdx] = {
                    ...merged[existingIdx],
                    isHeroFeatured: true,
                    heroCustomImage: dh.heroCustomImage || dh.featuredImage?.url,
                  };
                } else {
                  merged.unshift(dh);
                }
              });
            }

            setProductsList(merged);
            if (typeof window !== "undefined") {
              try {
                const lightweight = pruneForLocalStorage(merged);
                localStorage.setItem("admin_products", JSON.stringify(lightweight));
                saveCustomProductsBackup(merged);
              } catch (e) {
                console.warn("Notice: Skipped localStorage write due to size limit");
              }
            }
            isProductsLoadedRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch products from /api/products", err);
      }

      // Fallback: Read from existing localStorage first rather than resetting to initial mock!
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("admin_products");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProductsList(parsed);
              isProductsLoadedRef.current = true;
              return;
            }
          }
        } catch (e) {}
        setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
        isProductsLoadedRef.current = true;
      }
    };

    fetchServerProducts();
  }, []);

  // Fast single product save helper (High performance 0.1s save to Server DB)
  const saveSingleProduct = useCallback(async (product: any, isNew: boolean = false) => {
    if (typeof window === "undefined") return;

    // 1. Immediately persist single product to Central Server API (Supabase + Disk)
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, isNew }),
      });
    } catch (err) {
      console.error("Failed to persist single product:", err);
    }

    // 2. Backup to localStorage custom products immediately
    try {
      const savedCustomRaw = localStorage.getItem("admin_custom_products");
      let customList: any[] = savedCustomRaw ? JSON.parse(savedCustomRaw) : [];
      if (!Array.isArray(customList)) customList = [];
      const existIdx = customList.findIndex((p: any) => String(p.id) === String(product.id));
      if (existIdx !== -1) {
        customList[existIdx] = product;
      } else {
        customList.unshift(product);
      }
      localStorage.setItem("admin_custom_products", JSON.stringify(customList));
    } catch (e) {}
  }, []);

  // Helper: Safely save to Central Server API (/api/products) and mirror to localStorage
  const saveProductsToStorage = useCallback((list: any[]) => {
    if (typeof window === "undefined") return;

    // 1. Persist to Central Server API first so all devices see changes immediately
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    }).catch((err) => console.error("Failed to persist products to /api/products:", err));

    // 2. Backup custom products immediately
    saveCustomProductsBackup(list);

    // 3. Mirror to localStorage safely (pruned to fit inside 5MB limit)
    try {
      const lightweight = pruneForLocalStorage(list);
      localStorage.setItem("admin_products", JSON.stringify(lightweight));
    } catch (e) {
      console.warn("Notice: localStorage quota exceeded, saving top 80 products mirror...");
      try {
        const minimal = pruneForLocalStorage(list.slice(0, 80));
        localStorage.setItem("admin_products", JSON.stringify(minimal));
      } catch (err2) {
        console.warn("Skipping localStorage cache for products. Central Server API is authoritative.");
      }
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("admin_products_updated"));
    }, 0);
  }, []);



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

  const filteredProducts = useMemo(() => {
    const filtered = productsList.filter((p) => {
      // Ignore main banner slides from product catalog
      if (p.categoryId === "main_banner" || String(p.id).startsWith("hero-slide-")) {
        return false;
      }

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (p.productCode || "").toLowerCase();
        const no = String(p.productNo || "");
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        if (!code.includes(q) && !no.includes(q) && !title.includes(q) && !desc.includes(q)) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategoryFilter !== "all") {
        if (selectedCategoryFilter === "timesale") {
          const isTimeSale =
            p.categoryId === "timesale" ||
            (Array.isArray(p.categoryIds) && p.categoryIds.includes("timesale")) ||
            p.isTimeSale === true ||
            adminTimeSaleProductIds.includes(String(p.id)) ||
            (p.timeSaleDiscountRate !== undefined && Number(p.timeSaleDiscountRate) > 0);
          if (!isTimeSale) return false;
        } else {
          const hasCategory =
            p.categoryId === selectedCategoryFilter ||
            (Array.isArray(p.categoryIds) && p.categoryIds.includes(selectedCategoryFilter));
          if (!hasCategory) return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (productSortOrder === "custom") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;

        const numA = getProductNoNum(a);
        const numB = getProductNoNum(b);
        if (numB !== numA) return numB - numA;

        return 0;
      }
      if (productSortOrder === "productNoDesc") {
        return getProductNoNum(b) - getProductNoNum(a);
      }
      if (productSortOrder === "productNoAsc") {
        return getProductNoNum(a) - getProductNoNum(b);
      }
      if (productSortOrder === "nameAsc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (productSortOrder === "priceDesc") {
        const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
        const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
        return pB - pA;
      }
      if (productSortOrder === "priceAsc") {
        const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
        const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
        return pA - pB;
      }
      return 0;
    });
  }, [productsList, searchQuery, selectedCategoryFilter, productSortOrder, adminTimeSaleProductIds, getProductNoNum]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryForProducts) return [];
    if (selectedCategoryForProducts === "timesale") {
      return getRegisteredSetProducts(productsList);
    }
    return productsList.filter((p) => p.categoryId === selectedCategoryForProducts);
  }, [selectedCategoryForProducts, productsList]);

  const actualProductsCount = useMemo(() => {
    return productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")).length;
  }, [productsList]);

  const getProductStock = useCallback((product: any) => {
    if (product.availableForSale === false) return 0;
    if (product.stock !== undefined) return Number(product.stock);
    const hash = String(product.id || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 75) + 15;
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
      ? `'${targetProduct.title}' 상품을 메인 화면에 진열하시겠습니까?`
      : `'${targetProduct.title}' 상품을 메인 화면에서 미진열 처리하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const updated = productsList.map((p) => {
      if (p.id === id) {
        triggerToast(
          nextFeatured
            ? `'${p.title}' 상품이 쇼핑몰 메인 화면 [전시 중]으로 설정되었습니다.`
            : `'${p.title}' 상품이 메인 화면 [미전시]로 변경되었습니다.`
        );
        return { ...p, isMainFeatured: nextFeatured };
      }
      return p;
    });

    setProductsList(updated);
    saveProductsToStorage(updated);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleDeleteProduct = useCallback((id: string, title: string) => {
    const isConfirmed = window.confirm(
      `정말로 '${title}' 상품을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const updatedList = productsList.filter((p) => String(p.id) !== String(id));
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);

    // Call DELETE API to immediately remove from Supabase DB and server cache
    fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete product on server:", err)
    );

    triggerToast(`'${title}' 상품이 성공적으로 삭제되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleBulkUpdateMainFeatured = useCallback((targetIds: string[], isFeatured: boolean) => {
    if (!targetIds || targetIds.length === 0) return;
    const actionLabel = isFeatured ? "메인화면 진열" : "메인화면 미진열";
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
        ? `✨ 선택한 ${targetIds.length}개 상품이 쇼핑몰 메인 화면 [진열]로 일괄 등록되었습니다.`
        : `🚫 선택한 ${targetIds.length}개 상품이 메인 화면 [미진열]로 일괄 해제되었습니다.`
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

        return {
          ...p,
          stock: stockQty,
          availableForSale: !isSoldOut,
          sizeStock: updatedSizeStock,
          stockMap: updatedStockMap,
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

  const handleBulkDeleteProducts = useCallback((targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const isConfirmed = window.confirm(
      `정말로 선택한 ${targetIds.length}개의 상품을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const idSet = new Set(targetIds.map(String));
    const updatedList = productsList.filter((p) => !idSet.has(String(p.id)));
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);

    // Call DELETE API to immediately remove bulk items from Supabase DB and server cache
    fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: targetIds }),
    }).catch((err) => console.error("Failed to bulk delete products on server:", err));

    triggerToast(`🗑️ 선택한 ${targetIds.length}개 상품이 성공적으로 삭제되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast]);

  const handleReorderProducts = useCallback((fromId: string, toId: string, showToast: boolean = true) => {
    setProductSortOrder("custom");
    setProductsList((prev) => {
      const fromIdx = prev.findIndex((p) => String(p.id) === String(fromId));
      const toIdx = prev.findIndex((p) => String(p.id) === String(toId));
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, movedItem);
      saveProductsToStorage(updated);
      if (showToast) {
        triggerToast(`'${movedItem.title}' 상품 순서가 이동되었습니다.`);
      }
      return updated;
    });
  }, [saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleClearAllProducts = useCallback(() => {
    const totalCount = actualProductsCount;
    const isConfirmed = window.confirm(
      `정말로 상품관리에 등록된 전체 상품 (${totalCount}개)을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    setProductsList([]);
    saveProductsToStorage([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_products", "[]");
      localStorage.removeItem("secret_timesale_product_ids");
    }
    triggerToast(`🗑️ 상품관리에 등록된 전체 상품 ${totalCount}개가 모두 성공적으로 삭제되었습니다.`);
  }, [actualProductsCount, saveProductsToStorage, triggerToast]);

  const handleRestoreDefaultProducts = useCallback(() => {
    setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
    saveProductsToStorage(INITIAL_CHOICOMMA_PRODUCTS);
    triggerToast("✨ 초이콤마 대표 시그니처 상품 10종이 모두 성공적으로 복원되었습니다!");
  }, [INITIAL_CHOICOMMA_PRODUCTS, saveProductsToStorage, triggerToast]);

  const handleBulkAddProducts = useCallback((newProducts: any[]) => {
    if (!newProducts || newProducts.length === 0) return;
    setProductsList((prev) => {
      const updatedList = [...newProducts, ...prev];
      saveProductsToStorage(updatedList);
      return updatedList;
    });
    triggerToast(`📊 엑셀 일괄 업로드 완료! ${newProducts.length}개의 신규 상품이 성공적으로 등록되었습니다.`);
  }, [saveProductsToStorage, triggerToast]);

  const handleMoveProduct = useCallback((id: string, direction: "up" | "down") => {
    setProductSortOrder("custom");
    setProductsList((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(id));
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const newList = [...prev];
      const temp = newList[idx];
      newList[idx] = newList[targetIdx];
      newList[targetIdx] = temp;

      saveProductsToStorage(newList);
      triggerToast(`'${temp.title}' 상품 순서가 이동되었습니다.`);
      return newList;
    });
  }, [saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleMoveProductToTop = useCallback((id: string) => {
    setProductSortOrder("custom");
    setProductsList((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(id));
      if (idx === -1) return prev;
      if (idx === 0) {
        triggerToast(`'${prev[0].title}' 상품은 이미 최상단에 위치해 있습니다.`);
        return prev;
      }
      const updated = [...prev];
      const [movedItem] = updated.splice(idx, 1);
      updated.unshift(movedItem);
      saveProductsToStorage(updated);
      triggerToast(`⬆️ '${movedItem.title}' 상품이 목록 최상단으로 이동되었습니다.`);
      return updated;
    });
  }, [saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleBulkMoveToTop = useCallback((targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    setProductSortOrder("custom");
    setProductsList((prev) => {
      const idSet = new Set(targetIds.map(String));
      const selected = prev.filter((p) => idSet.has(String(p.id)));
      const unselected = prev.filter((p) => !idSet.has(String(p.id)));
      if (selected.length === 0) return prev;
      const updated = [...selected, ...unselected];
      saveProductsToStorage(updated);
      triggerToast(`⬆️ 선택한 ${selected.length}개 상품이 목록 최상단으로 일괄 이동되었습니다.`);
      return updated;
    });
  }, [saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleSortOrderChange = useCallback((
    newOrder: "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom"
  ) => {
    setProductSortOrder(newOrder);

    setProductsList((prev) => {
      const sorted = [...prev].sort((a, b) => {
        if (newOrder === "custom") {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;

          const numA = getProductNoNum(a);
          const numB = getProductNoNum(b);
          if (numB !== numA) return numB - numA;

          return 0;
        }
        if (newOrder === "productNoDesc") {
          return getProductNoNum(b) - getProductNoNum(a);
        }
        if (newOrder === "productNoAsc") {
          return getProductNoNum(a) - getProductNoNum(b);
        }
        if (newOrder === "nameAsc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        if (newOrder === "priceDesc") {
          const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
          const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
          return pB - pA;
        }
        if (newOrder === "priceAsc") {
          const pA = parseFloat(a.priceRange?.minVariantPrice?.amount || a.price?.amount || "0");
          const pB = parseFloat(b.priceRange?.minVariantPrice?.amount || b.price?.amount || "0");
          return pA - pB;
        }
        return 0;
      });
      saveProductsToStorage(sorted);
      triggerToast(
        newOrder === "custom"
          ? "✅ 상품 목록이 '최신 등록순'으로 정렬되었습니다."
          : newOrder === "productNoDesc"
          ? "✅ 상품 목록이 '등록번호 역순'으로 정렬되었습니다."
          : newOrder === "productNoAsc"
          ? "✅ 상품 목록이 '등록번호 순'으로 정렬되었습니다."
          : newOrder === "nameAsc"
          ? "✅ 상품 목록이 '상품명 순'으로 정렬되었습니다."
          : newOrder === "priceDesc"
          ? "✅ 상품 목록이 '높은 가격순'으로 정렬되었습니다."
          : "✅ 상품 목록이 '낮은 가격순'으로 정렬되었습니다."
      );
      return sorted;
    });
  }, [getProductNoNum, saveProductsToStorage, setProductSortOrder, triggerToast]);

  const handleQuickUpdateReleaseSchedule = useCallback(
    (id: string, availableForSale: boolean, releaseDate?: string) => {
      const targetProduct = productsList.find((p) => String(p.id) === String(id));
      if (!targetProduct) return;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          return {
            ...p,
            availableForSale,
            releaseDate: releaseDate || undefined,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => ({ ...v, availableForSale }))
              : p.variants,
          };
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
          return {
            ...p,
            categoryId: newCategory,
            categoryIds: [newCategory],
            isTimeSale: newCategory === "timesale" ? true : p.isTimeSale,
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

      const isAvailable = newTotalStock > 0;

      const updatedList = productsList.map((p) => {
        if (String(p.id) === String(id)) {
          return {
            ...p,
            stock: newTotalStock,
            sizeStock: newSizeStock !== undefined ? newSizeStock : p.sizeStock,
            availableForSale: isAvailable,
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => {
                  let variantAvailable = isAvailable;
                  if (newSizeStock && v.selectedOptions) {
                    const colOpt = v.selectedOptions.find((o: any) => o.name === "Color")?.value;
                    const szOpt = v.selectedOptions.find((o: any) => o.name === "Size")?.value;
                    if (colOpt && szOpt && newSizeStock[`${colOpt}-${szOpt}`] !== undefined) {
                      variantAvailable = Number(newSizeStock[`${colOpt}-${szOpt}`]) > 0;
                    } else if (szOpt && newSizeStock[szOpt] !== undefined) {
                      variantAvailable = Number(newSizeStock[szOpt]) > 0;
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
