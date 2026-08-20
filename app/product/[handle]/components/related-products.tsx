"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/sfcc/utils";
import { mockProducts } from "@/lib/sfcc/mock/products";

import { translateProductTitle, getCurrentLanguage } from "@/lib/i18n/translation";

export function RelatedProducts() {
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  useEffect(() => {
    const loadRelatedProducts = () => {
      if (typeof window === "undefined") return;
      try {
        let allProds: any[] = [];
        const saved = localStorage.getItem("admin_products");
        if (saved) {
          allProds = JSON.parse(saved);
        } else {
          allProds = mockProducts;
        }

        // STRICT FILTER: Only products where isMainFeatured === true (메인 화면 전시 체크된 상품)
        const featured = allProds.filter((p: any) => p.isMainFeatured === true);

        // Randomly shuffle array
        const shuffled = [...featured].sort(() => Math.random() - 0.5);

        // Take 4 items
        setRelatedProducts(shuffled.slice(0, 4));
      } catch (e) {
        console.error(e);
      }
    };

    loadRelatedProducts();

    window.addEventListener("storage", loadRelatedProducts);
    window.addEventListener("admin_products_updated", loadRelatedProducts);
    return () => {
      window.removeEventListener("storage", loadRelatedProducts);
      window.removeEventListener("admin_products_updated", loadRelatedProducts);
    };
  }, []);

  if (!relatedProducts.length) return null;

  return (
    <div className="w-full mt-16 px-4 md:px-12 pb-16 bg-white border-t border-neutral-100 pt-12">
      {/* Product Grid (No Header Text) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {relatedProducts.map((product, idx) => {
          const price = product.priceRange?.minVariantPrice?.amount
            ? formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode || "KRW")
            : "KRW 0";

          return (
            <Link key={product.id || idx} href={`/product/${product.handle || product.id}`} className="flex flex-col group cursor-pointer">
              <div className="relative w-full aspect-[3/4] mb-3 overflow-hidden bg-white border border-neutral-100/80 rounded-sm">
                <Image
                  src={product.featuredImage?.url || product.images?.[0]?.url || `/product_${(idx % 4) + 1}.webp`}
                  alt={product.title || "Related Product"}
                  fill
                  className="object-contain p-2 transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs font-medium text-neutral-900 uppercase tracking-wider truncate w-full">
                  {translateProductTitle(product.title, currentLang)}
                </span>
                <span className="text-xs text-neutral-600 font-bold">{price}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
