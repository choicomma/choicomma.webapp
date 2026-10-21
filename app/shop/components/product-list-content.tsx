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
import { ProductFormModal } from "@/app/admin/components/product-form-modal";
import { reorderProduct } from "@/lib/products/reorder-helper";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const categoriesList = [
  { id: "timesale", name: "TIMESALE", count: 8, description: "신상품 & 타임세일 컬렉션" },
  { id: "outer", name: "OUTER", count: 12, description: "아우터 & 재킷" },
  { id: "top", name: "TOP", count: 24, description: "상의 & 니트웨어" },
  { id: "bottom", name: "BOTTOM", count: 16, description: "팬츠 & 스커트" },
  { id: "bag", name: "BAG", count: 6, description: "가방 & 래더 굿즈" },
  { id: "shoes", name: "SHOES", count: 9, description: "슈즈 & 슈케어" },
  { id: "accessory", name: "ACCESSORY", count: 15, description: "액세서리 & 잡화" },
];

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
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminOverlayProductId, setAdminOverlayProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

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
    window.addEventListener("focus", checkAdmin);
    return () => {
      window.removeEventListener("storage", checkAdmin);
      window.removeEventListener("focus", checkAdmin);
    };
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
          list = displayProducts;
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

      // 3. 화면 실시간 반영
      setDisplayProducts((prev) =>
        prev.map((p) =>
          String(p.id) === String(finalProduct.id) || String((p as any).productCode || "") === String(finalProduct.productCode || "")
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
        const userGrade = (localStorage.getItem("user_grade") || localStorage.getItem("membership_user_grade") || userRole || "").toUpperCase().trim();
        const isAdmin =
          userRole === "admin" ||
          userRole === "staff" ||
          userGrade === "STAFF" ||
          sessionStorage.getItem("choicomma_admin_authenticated") === "true";

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
                userGrade &&
                  (sale.targetGrades || []).length > 0 &&
                  (sale.targetGrades.includes("ALL") ||
                    sale.targetGrades.includes(userGrade) ||
                    sale.targetGrades.includes(userRole?.toUpperCase()) ||
                    (userGrade.includes("VIP") && sale.targetGrades.includes("VIP")) ||
                    (userGrade.includes("VVIP") && (sale.targetGrades.includes("VVIP") || sale.targetGrades.includes("VIP"))))
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
          const tagRate = Array.isArray(p.tags)
            ? p.tags.find((t: any) => typeof t === "string" && t.startsWith("tsrate:"))?.replace("tsrate:", "")
            : null;
          const parsedTagRate = tagRate && !isNaN(Number(tagRate)) ? Number(tagRate) : null;
          const itemRate = p.timeSaleDiscountRate || parsedTagRate || itemSettings[p.id]?.discountRate || savedDiscountNum || 25;
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
          const tagRate = Array.isArray(p.tags)
            ? p.tags.find((t: any) => typeof t === "string" && t.startsWith("tsrate:"))?.replace("tsrate:", "")
            : null;
          const parsedTagRate = tagRate && !isNaN(Number(tagRate)) ? Number(tagRate) : null;
          const itemRate = p.timeSaleDiscountRate || parsedTagRate || itemSettings[p.id]?.discountRate || savedDiscountNum || 25;
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
        const hasSaved = savedSelectedIds.length > 0;
        const updatedProducts = categoryFilteredProducts.map((p: any) => {
          const isSelected = hasSaved
            ? savedSelectedIds.includes(p.id)
            : (p.isTimeSale === true || (Array.isArray(p.tags) && p.tags.includes("TIMESALE")));
          if (isSelected) {
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
        const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : null;
        const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : null;
        if (orderA !== null && orderB !== null) return orderA - orderB;
        if (orderA !== null) return -1;
        if (orderB !== null) return 1;
        return getProductNoNum(b) - getProductNoNum(a);
      }
      // Default: preserve fixed array order (latest products first / admin-saved order)
      const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : null;
      const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : null;
      if (orderA !== null && orderB !== null) return orderA - orderB;
      if (orderA !== null) return -1;
      if (orderB !== null) return 1;
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
          {/* 투명 배경 클릭 시 활성화된 상품의 관리자 오버레이 닫기 */}
          {adminOverlayProductId && (
            <div
              className="fixed inset-0 z-20 bg-black/10 cursor-default"
              onClick={() => setAdminOverlayProductId(null)}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 border-t md:border-t-0 border-neutral-200 bg-white pb-6 w-full relative">
            {paginatedProducts.map((product, idx) => {
              const globalIndex = (currentPage - 1) * PAGE_SIZE + idx;
              const isFirst = globalIndex === 0;
              const isLast = globalIndex === sortedProducts.length - 1;
              return (
                <ProductCard
                  key={`${product.id}-${idx}-${(product as any).updated_at || ""}-${product.availableForSale}-${product.releaseDate || ""}-${(product as any).stock ?? ""}`}
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
                    const res = await reorderProduct(String(p.id), direction, displayProducts);
                    if (res.success) {
                      toast.success(
                        direction === "prev"
                          ? `'${p.title}' 상품이 앞으로 이동되었습니다.`
                          : `'${p.title}' 상품이 뒤로 이동되었습니다.`
                      );
                      if (res.updatedList) {
                        const updatedIds = new Set(displayProducts.map((it) => String(it.id)));
                        const nextVisible = res.updatedList.filter((it) => updatedIds.has(String(it.id)));
                        setDisplayProducts(nextVisible);
                        setProducts(nextVisible);
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
          {uniqueProducts.length > PAGE_SIZE && (() => {
            const pageNumbers = getPageNumbers(currentPage, totalPages);
            return (
              <div className="flex flex-col sm:flex-row justify-center items-center py-10 sm:py-12 gap-3 sm:gap-4 border-t border-neutral-200/80 mt-4 mb-16 select-none">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
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
                          onClick={() => {
                            setCurrentPage(p);
                            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
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
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
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

      {/* Unified Product Form Modal (전체보기 상품 수정 모달) */}
      {editingProduct && (
        <ProductFormModal
          isOpen={Boolean(editingProduct)}
          mode="edit"
          initialProduct={editingProduct}
          categoriesList={categoriesList}
          productsList={displayProducts}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          triggerToast={(msg) => toast.success(msg)}
        />
      )}
    </>
  );
}
