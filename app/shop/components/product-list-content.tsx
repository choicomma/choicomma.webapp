"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Product, Collection } from "@/lib/sfcc/types";
import { useProducts } from "../providers/products-provider";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { SetBundleSection } from "@/components/products/set-bundle-section";
import { getRegisteredSetProducts } from "@/lib/sfcc/set-products-helper";

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
  const [displayProducts, setDisplayProducts] = useState<Product[]>(products);
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";

  useEffect(() => {
    const loadAdminChoiceProducts = async () => {
      let activeSourceProducts: Product[] = products || [];

      // Fetch live authoritative products from Central Server API
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (res.ok) {
          const serverData: any[] = await res.json();
          if (Array.isArray(serverData) && serverData.length > 0) {
            const nonBanner = serverData.filter(
              (p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")
            );
            if (nonBanner.length > 0) {
              activeSourceProducts = nonBanner;
              if (typeof window !== "undefined") {
                localStorage.setItem("admin_products", JSON.stringify(serverData));
              }
            }
          }
        }
      } catch (e) {
        if (typeof window !== "undefined") {
          const savedAdmin = localStorage.getItem("admin_products");
          if (savedAdmin) {
            try {
              const parsedAdmin: any[] = JSON.parse(savedAdmin);
              if (Array.isArray(parsedAdmin) && parsedAdmin.length > 0) {
                const nonBannerAdmin = parsedAdmin.filter(
                  (p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")
                );
                if (nonBannerAdmin.length > 0) {
                  activeSourceProducts = nonBannerAdmin;
                }
              }
            } catch (err) {}
          }
        }
      }

      // Filter active products by category if specific category is selected
      let categoryFilteredProducts = activeSourceProducts;
      if (
        collectionHandle &&
        collectionHandle !== "all" &&
        collectionHandle !== "choice" &&
        collectionHandle !== "timesale" &&
        collectionHandle !== "new" &&
        collectionHandle !== "special"
      ) {
        categoryFilteredProducts = activeSourceProducts.filter((p: any) => {
          if (!p.categoryId) return true;
          return (
            p.categoryId.toLowerCase() === collectionHandle.toLowerCase() ||
            p.tags?.some((t: string) => t.toLowerCase() === collectionHandle.toLowerCase())
          );
        });
      }

      const registeredSetProducts = getRegisteredSetProducts(categoryFilteredProducts);

      let itemSettings: Record<string, { hours?: number; minutes?: number; discountRate?: number }> = {};
      let savedSelectedIds: string[] = [];
      let savedDiscountNum = 35;

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("secret_timesale_product_ids");
        if (saved) {
          try {
            savedSelectedIds = JSON.parse(saved);
          } catch (e) {}
        }
        const savedDisc = localStorage.getItem("secret_timesale_discount");
        if (savedDisc && !isNaN(parseInt(savedDisc))) {
          savedDiscountNum = parseInt(savedDisc);
        }
        const savedSettings = localStorage.getItem("secret_timesale_item_settings");
        if (savedSettings) {
          try {
            itemSettings = JSON.parse(savedSettings);
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

      if (collectionHandle === "choice" || collectionHandle === "timesale" || collectionHandle === "new" || collectionHandle === "special") {
        // TIMESALE displays directly specified items along with registered set products
        const choiceOnlyProducts = [...directTimeSaleProducts, ...registeredSetProducts];
        const unique = choiceOnlyProducts.filter(
          (p, idx, self) => idx === self.findIndex((t) => t.id === p.id)
        );
        const finalProducts = unique.length > 0 ? unique : registeredSetProducts;
        setDisplayProducts(finalProducts);
        setProducts(finalProducts);
      } else {
        const updatedProducts = categoryFilteredProducts.map((p: any) => {
          if (savedSelectedIds.includes(p.id)) {
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

    loadAdminChoiceProducts();
    window.addEventListener("storage", loadAdminChoiceProducts);
    window.addEventListener("admin_products_updated", loadAdminChoiceProducts);
    return () => {
      window.removeEventListener("storage", loadAdminChoiceProducts);
      window.removeEventListener("admin_products_updated", loadAdminChoiceProducts);
    };
  }, [collectionHandle, products, setProducts]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const totalPages = Math.ceil(uniqueProducts.length / PAGE_SIZE);
  const paginatedProducts = uniqueProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <Suspense>
        <ResultsControls
          className="max-md:hidden"
          collections={collections}
          products={uniqueProducts}
        />
      </Suspense>
      {uniqueProducts.length > 0 ? (
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 border-t md:border-t-0 border-neutral-200 bg-white pb-6 w-full">
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
          <p className="text-sm font-bold text-neutral-800">
            &quot;{query}&quot; 검색 결과와 일치하는 상품이 없습니다.
          </p>
          <p className="text-xs text-neutral-500 mt-1">다른 검색어로 다시 시도해 주세요.</p>
        </div>
      )}
    </>
  );
}
