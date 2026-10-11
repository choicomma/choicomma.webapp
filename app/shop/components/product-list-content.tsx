"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Product, Collection } from "@/lib/sfcc/types";
import { useProducts } from "../providers/products-provider";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { SetBundleSection } from "@/components/products/set-bundle-section";
import { getRegisteredSetProducts } from "@/lib/sfcc/set-products-helper";
import { getProductNoNum } from "@/lib/sfcc/product-sort";

interface ProductListContentProps {
  products: Product[];
  collections: Pick<Collection, "handle" | "title">[];
  collectionHandle?: string;
}

export function ProductListContent({
  products,
  collections,
  collectionHandle,
}: ProductListContentProps) {
  const { setProducts } = useProducts();
  const initialValidProducts = (products || []).filter(
    (p: any) =>
      p.categoryId !== "main_banner" &&
      !String(p.id).startsWith("hero-slide-") &&
      p.isMainFeatured !== false
  );
  const [displayProducts, setDisplayProducts] = useState<Product[]>(initialValidProducts);
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";
  const sort = searchParams?.get("sort") || "";
  // SSR products prop의 최신 값을 ref로 추적 — 메인 effect를 재실행하지 않고도 authoritativeProducts 초기화에 사용
  const productsRef = useRef<Product[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    let isSubscribed = true;
    // 요청 순번: 이벤트가 연달아 발생해도 "가장 마지막에 시작한 요청"의 응답만 화면에 반영한다.
    let requestSeq = 0;
    let abortController: AbortController | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // 화면에 반영할 "서버 기준" 최신 상품 목록 (최초에는 SSR 목록, 서버 응답 수신 후에는 서버 응답으로 교체)
    let authoritativeProducts: any[] = (products || []) as any[];
    // 서버가 알려준 삭제 상품 ID (서버 응답 수신 후에는 이 목록이 유일한 기준)
    let serverDeletedIds: Set<string> | null = null;

    // 주어진 목록으로 전체보기 화면을 즉시(동기) 계산해서 반영한다.
    // 시간세일 가격/컬렉션 필터까지 한 번에 적용되므로 네트워크 응답 전후로 가격·목록이 바뀌는 깜빡임이 없다.
    const renderProducts = (sourceList: any[]) => {
      if (!isSubscribed) return;

      // 배너/히어로/미진열 상품은 전체보기에서 제외
      let activeSourceProducts: Product[] = (sourceList || []).filter(
        (p: any) =>
          p &&
          p.categoryId !== "main_banner" &&
          !String(p.id).startsWith("hero-slide-") &&
          p.isMainFeatured !== false
      );

      // 삭제된 상품은 어떤 경우에도 다시 나타나지 않도록 제외
      let deletedSet: Set<string> = serverDeletedIds || new Set<string>();
      if (!serverDeletedIds && typeof window !== "undefined") {
        // 서버 응답 전(최초 SSR 렌더 직후)에는 이 기기에 기록된 삭제 목록으로만 임시 필터링
        try {
          const deletedRaw = localStorage.getItem("admin_deleted_product_ids");
          if (deletedRaw) deletedSet = new Set(JSON.parse(deletedRaw).map(String));
        } catch (e) {}
      }
      if (deletedSet.size > 0) {
        activeSourceProducts = activeSourceProducts.filter(
          (p: any) =>
            !deletedSet.has(String(p.id)) &&
            !deletedSet.has(String(p.productCode)) &&
            !deletedSet.has(String(p.handle))
        );
      }

      // Filter active products by category if specific category is selected
      let categoryFilteredProducts = activeSourceProducts;
      if (
        collectionHandle &&
        collectionHandle !== "all" &&
        collectionHandle !== "choice" &&
        collectionHandle !== "timesale"
      ) {
        if (collectionHandle === "new") {
          const newItems = activeSourceProducts.filter((p: any) => {
            const hasNewTag = Array.isArray(p.tags) && p.tags.some((t: string) => t.toUpperCase() === "NEW" || t === "신상품");
            const hasNewCat = (p.categoryId || "").toLowerCase() === "new" || (Array.isArray(p.categoryIds) && p.categoryIds.some((c: any) => String(c).toLowerCase() === "new"));
            return hasNewTag || hasNewCat || p.isNew === true;
          });
          // 신상품 태그/카테고리가 명시된 상품이 있을 경우 해당 상품 표시, 없을 경우 전체 상품 목록 유지
          categoryFilteredProducts = newItems.length > 0 ? newItems : activeSourceProducts;
        } else {
          const target = collectionHandle.toLowerCase();
          categoryFilteredProducts = activeSourceProducts.filter((p: any) => {
            const pCat = (p.categoryId || "").toLowerCase();
            const pCats = Array.isArray(p.categoryIds) ? p.categoryIds.map((c: any) => String(c).toLowerCase()) : [];
            const matchesCat = pCat === target || pCats.includes(target);
            const matchesTag = Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase() === target);
            return matchesCat || matchesTag;
          });
        }
      }

      const registeredSetProducts = getRegisteredSetProducts(categoryFilteredProducts);

      let itemSettings: Record<string, { hours?: number; minutes?: number; discountRate?: number }> = {};
      let savedSelectedIds: string[] = [];
      let savedDiscountNum = 35;

      if (typeof window !== "undefined") {
        const userEmail = (localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
        const userRole = localStorage.getItem("user_role") || "";
        const isAdmin = userRole === "admin" || sessionStorage.getItem("choicomma_admin_authenticated") === "true";

        // Check Secret Time Sales
        const secretSalesRaw = localStorage.getItem("admin_secret_timesales");
        if (secretSalesRaw) {
          try {
            const secretSalesList: any[] = JSON.parse(secretSalesRaw);
            for (const sale of secretSalesList) {
              if (sale.status !== "active") continue;
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
                (sale.productIds || []).forEach((pId: string) => {
                  if (!savedSelectedIds.includes(pId)) savedSelectedIds.push(pId);
                  itemSettings[pId] = {
                    discountRate: Number(sale.discountRate) || 30,
                  };
                });
              }
            }
          } catch (e) {}
        }

        const saved = localStorage.getItem("secret_timesale_product_ids");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach((id: string) => {
                if (!savedSelectedIds.includes(id)) savedSelectedIds.push(id);
              });
            }
          } catch (e) {}
        }
        const savedDisc = localStorage.getItem("secret_timesale_discount");
        if (savedDisc && !isNaN(parseInt(savedDisc))) {
          savedDiscountNum = parseInt(savedDisc);
        }
        const savedSettings = localStorage.getItem("secret_timesale_item_settings");
        if (savedSettings) {
          try {
            const parsedS = JSON.parse(savedSettings);
            itemSettings = { ...parsedS, ...itemSettings };
          } catch (e) {}
        }
      }

      // Directly specified TimeSale products transformed with active discount rate
      const directTimeSaleProducts = categoryFilteredProducts
        .filter((p) => savedSelectedIds.includes(p.id))
        .map((p: any) => {
          const itemRate = p.timeSaleDiscountRate || itemSettings[p.id]?.discountRate || savedDiscountNum || 35;
          const minP = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
          const maxP = parseFloat(p.priceRange?.maxVariantPrice?.amount || "0");
          const origPrice = maxP > minP ? maxP : minP;
          const discountedPrice = Math.round(origPrice * (1 - itemRate / 100));
          const currencyCode = p.currencyCode || "KRW";

          return {
            ...p,
            timeSaleDiscountRate: itemRate,
            categoryId: "timesale",
            priceRange: {
              minVariantPrice: { amount: discountedPrice.toString(), currencyCode },
              maxVariantPrice: { amount: origPrice.toString(), currencyCode },
            },
            variants: (p.variants || []).map((v: any) => ({
              ...v,
              price: { amount: discountedPrice.toString(), currencyCode },
            })),
            tags: Array.from(new Set([...(p.tags || []), "TIMESALE"])),
          };
        });

      if (collectionHandle === "choice" || collectionHandle === "timesale") {
        // Find products that are categorized as timesale or specified in time sale settings
        const timeSaleCategoryItems = categoryFilteredProducts.filter(
          (p: any) =>
            p.categoryId === "timesale" ||
            (Array.isArray(p.categoryIds) && p.categoryIds.includes("timesale")) ||
            p.isTimeSale === true ||
            savedSelectedIds.includes(String(p.id))
        ).map((p: any) => {
          const itemRate = p.timeSaleDiscountRate || itemSettings[p.id]?.discountRate || savedDiscountNum || 35;
          const minP = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
          const maxP = parseFloat(p.priceRange?.maxVariantPrice?.amount || "0");
          const origPrice = maxP > minP ? maxP : (minP > 0 ? minP : 100000);
          const discountedPrice = Math.round(origPrice * (1 - itemRate / 100));
          const currencyCode = p.currencyCode || "KRW";

          return {
            ...p,
            timeSaleDiscountRate: itemRate,
            priceRange: {
              minVariantPrice: { amount: discountedPrice.toString(), currencyCode },
              maxVariantPrice: { amount: origPrice.toString(), currencyCode },
            },
            variants: (p.variants || []).map((v: any) => ({
              ...v,
              price: { amount: discountedPrice.toString(), currencyCode },
            })),
            tags: Array.from(new Set([...(p.tags || []), "TIMESALE"])),
          };
        });

        const choiceOnlyProducts = [...directTimeSaleProducts, ...timeSaleCategoryItems, ...registeredSetProducts];
        const unique = choiceOnlyProducts.filter(
          (p, idx, self) => idx === self.findIndex((t) => String(t.id) === String(p.id))
        );
        const finalProducts = unique;
        setDisplayProducts(finalProducts);
        setProducts(finalProducts);
      } else {
        const updatedProducts = categoryFilteredProducts.map((p: any) => {
          if (savedSelectedIds.includes(p.id) || p.isTimeSale === true || (Array.isArray(p.tags) && p.tags.includes("TIMESALE"))) {
            const itemRate = p.timeSaleDiscountRate || itemSettings[p.id]?.discountRate || savedDiscountNum || 35;
            const minP = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
            const maxP = parseFloat(p.priceRange?.maxVariantPrice?.amount || "0");
            const origPrice = maxP > minP ? maxP : minP;
            const discountedPrice = Math.round(origPrice * (1 - itemRate / 100));
            const currencyCode = p.currencyCode || "KRW";

            return {
              ...p,
              timeSaleDiscountRate: itemRate,
              priceRange: {
                minVariantPrice: { amount: discountedPrice.toString(), currencyCode },
                maxVariantPrice: { amount: origPrice.toString(), currencyCode },
              },
              variants: (p.variants || []).map((v: any) => ({
                ...v,
                price: { amount: discountedPrice.toString(), currencyCode },
              })),
              tags: Array.from(new Set([...(p.tags || []), "TIMESALE"])),
            };
          }
          return p;
        });
        setDisplayProducts(updatedProducts);
        setProducts(updatedProducts);
      }
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
          } catch (e) {}
        }

        const serverData = await res.json();
        // 응답을 기다리는 사이 더 최신 요청이 시작됐거나 화면이 바뀌었다면 이 (오래된) 응답은 버린다
        if (!Array.isArray(serverData) || !isSubscribed || mySeq !== requestSeq) return;

        authoritativeProducts = serverData;
        if (deleted) serverDeletedIds = deleted;
        renderProducts(serverData);
      } catch (e) {
        // 네트워크 오류/요청 중단: 현재 화면을 유지한다 (오래된 로컬 캐시로 되돌리지 않음)
      }
    };

    // 관리자 저장 직후 이벤트가 연달아(저장 전/후) 들어오므로 짧게 모아서 한 번만 서버에서 다시 읽는다
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        syncFromServer();
      }, 250);
    };

    // 로그인/시간세일 설정 변경은 네트워크를 기다리지 않고 마지막으로 받은 서버 목록으로 즉시 다시 계산
    const handleLocalSettingChange = () => {
      renderProducts(authoritativeProducts);
    };

    // 관리자 상품 변경 이벤트: 서버 최신 목록만 재조회
    // (즉시 renderProducts(authoritativeProducts) 실행 시, effect 재실행으로 인해
    // authoritativeProducts가 SSR 데이터로 리셋된 경우 순간적으로 롤백 현상이 발생하므로 제거)
    const handleProductsChanged = () => {
      scheduleSync();
    };

    // 1. SSR로 내려온 서버 목록을 즉시 반영 (시간세일 가격/컬렉션 필터 포함)
    renderProducts(authoritativeProducts);
    // 2. 서버 최신 데이터로 갱신
    syncFromServer();

    window.addEventListener("storage", handleProductsChanged);
    window.addEventListener("auth_changed", handleLocalSettingChange);
    window.addEventListener("secret_timesales_updated", handleLocalSettingChange);
    window.addEventListener("admin_products_updated", handleProductsChanged);
    return () => {
      isSubscribed = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      abortController?.abort();
      window.removeEventListener("storage", handleProductsChanged);
      window.removeEventListener("auth_changed", handleLocalSettingChange);
      window.removeEventListener("secret_timesales_updated", handleLocalSettingChange);
      window.removeEventListener("admin_products_updated", handleProductsChanged);
    };
  }, [collectionHandle, setProducts]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Reset page to 1 if search query or collection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, collectionHandle]);

    // Deduplicate products & filter by search query
    const uniqueProducts = displayProducts
      .filter((p, index, self) => index === self.findIndex((t) => t.id === p.id))
      .filter((p) => {
        if (!query.trim()) return true;
        const qLower = query.trim().toLowerCase();
        const titleMatch = p.title?.toLowerCase().includes(qLower);
        const descMatch = p.description?.toLowerCase().includes(qLower);
        const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(qLower));
        return titleMatch || descMatch || tagMatch;
      });

    // Apply explicit sorting if chosen, otherwise preserve the fixed latest-first order
    const sortedProducts = [...uniqueProducts].sort((a: any, b: any) => {
      if (sort === "price-asc") {
        const pA = Number(a.priceRange?.minVariantPrice?.amount || a.price?.amount || 0);
        const pB = Number(b.priceRange?.minVariantPrice?.amount || b.price?.amount || 0);
        return pA - pB;
      }
      if (sort === "price-desc") {
        const pA = Number(a.priceRange?.minVariantPrice?.amount || a.price?.amount || 0);
        const pB = Number(b.priceRange?.minVariantPrice?.amount || b.price?.amount || 0);
        return pB - pA;
      }
      if (sort === "oldest") {
        return getProductNoNum(a) - getProductNoNum(b);
      }
      if (sort === "newest") {
        return getProductNoNum(b) - getProductNoNum(a);
      }
      // Default: preserve fixed array order (latest products first / admin-saved order)
      return 0;
    });

    const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
    const paginatedProducts = sortedProducts.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

    return (
      <>
        {sortedProducts.length > 0 ? (
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 border-t md:border-t-0 border-neutral-200 bg-white pb-6 w-full">
            {paginatedProducts.map((product, idx) => (
              <ProductCard key={`${product.id}-${idx}`} product={product} />
            ))}
          </div>

          {/* Pagination Controls (Matching Home Layout: < Prev  X / Y  Next >) */}
          {uniqueProducts.length > PAGE_SIZE && (
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
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={currentPage >= totalPages}
                className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next &gt;
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border border-dashed border-neutral-300 rounded-3xl bg-neutral-50/50 my-4">
          {query.trim() ? (
            <>
              <p className="text-sm font-bold text-neutral-800">
                &quot;{query}&quot; 검색 결과와 일치하는 상품이 없습니다.
              </p>
              <p className="text-xs text-neutral-500 mt-1">다른 검색어로 다시 시도해 주세요.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-neutral-800">
                등록된 상품이 없습니다.
              </p>
              <p className="text-xs text-neutral-500 mt-1">새로운 컬렉션 상품이 곧 업데이트될 예정입니다.</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
