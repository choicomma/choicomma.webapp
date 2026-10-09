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

export function useProducts({
  triggerToast,
  adminTimeSaleProductIds = [],
  setAdminTimeSaleProductIds,
  adminTimeSaleHours = "24",
  adminTimeSaleMinutes = "0",
  adminTimeSaleDiscount = "35",
  handleUpdateProductTimeSetting,
}: UseProductsOptions) {
  const INITIAL_CHOICOMMA_PRODUCTS: any[] = productsCache as any[];

  const isProductsLoadedRef = useRef(false);
  const [productsList, setProductsList] = useState<any[]>(() => INITIAL_CHOICOMMA_PRODUCTS);
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

  // Sync sort order and purge stale localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("admin_products");
      localStorage.removeItem("admin_custom_products");
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

  // Client-side hydration sync for productsList (Source of Truth: Central Server File /api/products)
  useEffect(() => {
    const fetchServerProducts = async () => {
      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setProductsList(data);
            isProductsLoadedRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch products from /api/products", err);
      }

      setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
      isProductsLoadedRef.current = true;
    };

    fetchServerProducts();
  }, [INITIAL_CHOICOMMA_PRODUCTS]);

  // Fast single product save helper (High performance save to Server file)
  const saveSingleProduct = useCallback(async (product: any, isNew: boolean = false) => {
    if (typeof window === "undefined") return;

    try {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, isNew }),
      });
    } catch (err) {
      console.error("Failed to persist single product:", err);
    }

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("admin_products_updated"));
    }, 0);
  }, []);

  // Helper: Safely save to Central Server file (/api/products)
  const saveProductsToStorage = useCallback((list: any[]) => {
    if (typeof window === "undefined") return;

    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    }).catch((err) => console.error("Failed to persist products to /api/products:", err));

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("admin_products_updated"));
    }, 0);
  }, []);

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

      // 1. Search Query Filter (Checks DB code, dynamically formatted CC-code, product number, title, and description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (p.productCode || "").toLowerCase();
        const dynamicCode = getProductNo(p).toLowerCase();
        const no = String(p.productNo || "");
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        if (!code.includes(q) && !dynamicCode.includes(q) && !no.includes(q) && !title.includes(q) && !desc.includes(q)) {
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

    return getSortedBaseList(filtered, productSortOrder);
  }, [productsList, searchQuery, selectedCategoryFilter, productSortOrder, adminTimeSaleProductIds, getProductNo, getSortedBaseList]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategoryForProducts) return [];
    if (selectedCategoryForProducts === "timesale") {
      return productsList.filter(
        (p) =>
          p.categoryId === "timesale" ||
          (Array.isArray(p.categoryIds) && p.categoryIds.includes("timesale")) ||
          p.isTimeSale === true ||
          adminTimeSaleProductIds.includes(String(p.id)) ||
          (p.timeSaleDiscountRate !== undefined && Number(p.timeSaleDiscountRate) > 0)
      );
    }
    return productsList.filter((p) => p.categoryId === selectedCategoryForProducts);
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
          availableForSale: isSoldOut ? false : (p.availableForSale !== false),
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

    triggerToast(`🗑️ 선택한 ${targetIds.length}개 상품이 성공적으로 삭제되었습니다.`);
  }, [productsList, saveProductsToStorage, triggerToast]);

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

  const handleClearAllProducts = useCallback(() => {
    const totalCount = actualProductsCount;
    const isConfirmed = window.confirm(
      `정말로 상품관리에 등록된 전체 상품 (${totalCount}개)을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    setProductsList([]);
    saveProductsToStorage([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_products");
      localStorage.removeItem("secret_timesale_product_ids");
    }
    triggerToast(`🗑️ 상품관리에 등록된 전체 상품 ${totalCount}개가 모두 성공적으로 삭제되었습니다.`);
  }, [actualProductsCount, saveProductsToStorage, triggerToast]);

  const handleRestoreDefaultProducts = useCallback(() => {
    const isConfirmed = window.confirm(
      "정말로 모든 상품 데이터를 '초이콤마 정식 카탈로그 (50개)'로 초기화하시겠습니까?\n임시 등록/수정 내역이 정리되고 원본 상품 50개로 복원됩니다."
    );
    if (!isConfirmed) return;

    setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
    saveProductsToStorage(INITIAL_CHOICOMMA_PRODUCTS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_products");
      localStorage.removeItem("admin_custom_products");
    }
    triggerToast("✨ 전체 상품 리스트가 정식 카탈로그(50개)로 완벽하게 초기화되었습니다!");
  }, [INITIAL_CHOICOMMA_PRODUCTS, saveProductsToStorage, triggerToast]);

  const handleBulkAddProducts = useCallback((newProducts: any[]) => {
    if (!newProducts || newProducts.length === 0) return;
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
            isTimeSale: newCategory === "timesale",
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
