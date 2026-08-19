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
    const loadAdminChoiceProducts = () => {
      let activeSourceProducts: Product[] = products;

      if (typeof window !== "undefined") {
        const savedAdmin = localStorage.getItem("admin_products");
        if (savedAdmin) {
          try {
            const parsedAdmin: any[] = JSON.parse(savedAdmin);
            const activeAdminIds = new Set(parsedAdmin.map((p) => String(p.id)));

            // Filter out any products from initial props that were deleted in admin
            const remainingInitial = products.filter((p) => activeAdminIds.has(String(p.id)));
            
            // Also merge any custom products created in admin
            const customAdminProducts = parsedAdmin.filter(
              (p) => !products.some((initP) => String(initP.id) === String(p.id))
            );

            activeSourceProducts = [...remainingInitial, ...customAdminProducts];
          } catch (e) {
            console.error("Error loading admin_products in ProductListContent", e);
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
      }

      // Directly specified TimeSale products transformed with active discount rate
      const directTimeSaleProducts = categoryFilteredProducts
        .filter((p) => savedSelectedIds.includes(p.id))
        .map((p) => {
          const origPrice = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
          const discountedPrice = Math.round(origPrice * (1 - savedDiscountNum / 100));
          const currencyCode = p.currencyCode || "KRW";

          return {
            ...p,
            categoryId: "timesale",
            priceRange: {
              minVariantPrice: { amount: discountedPrice.toString(), currencyCode },
              maxVariantPrice: { amount: origPrice.toString(), currencyCode },
            },
            variants: (p.variants || []).map((v) => ({
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
        const updatedProducts = categoryFilteredProducts.map((p) => {
          if (savedSelectedIds.includes(p.id)) {
            const origPrice = parseFloat(p.priceRange?.minVariantPrice?.amount || "0");
            const discountedPrice = Math.round(origPrice * (1 - savedDiscountNum / 100));
            const currencyCode = p.currencyCode || "KRW";

            return {
              ...p,
              priceRange: {
                minVariantPrice: { amount: discountedPrice.toString(), currencyCode },
                maxVariantPrice: { amount: origPrice.toString(), currencyCode },
              },
              variants: (p.variants || []).map((v) => ({
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-16 md:pb-24">
          {uniqueProducts.map((product, idx) => (
            <ProductCard key={`${product.id}-${idx}`} product={product} />
          ))}
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
