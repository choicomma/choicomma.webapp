"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { getLabelPosition } from "@/lib/utils";

import { getCurrentLanguage } from "@/lib/i18n/translation";

interface MainProductDisplayProps {
  initialProducts: any[];
}

export function MainProductDisplay({ initialProducts }: MainProductDisplayProps) {
  const [heroProducts, setHeroProducts] = useState<any[]>([]);
  const [subProducts, setSubProducts] = useState<any[]>([]);
  const [currentLang, setCurrentLang] = useState("ko");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

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

  const syncProductsFromStorage = () => {
    if (typeof window === "undefined") return;
    const savedAdminProducts = localStorage.getItem("admin_products");
    if (savedAdminProducts) {
      try {
        const parsed: any[] = JSON.parse(savedAdminProducts);

        // 1. Top Hero Products (isHeroFeatured === true or has heroCustomImage)
        let explicitHero = parsed.filter(
          (p) => (p.isHeroFeatured === true || Boolean(p.heroCustomImage)) && Boolean(p.heroCustomImage || p.featuredImage?.url)
        );

        // 2. Sub-Products Grid: ONLY products with isMainFeatured === true (preserve admin list order)
        const featuredSubProducts = parsed.filter((p) => p.isMainFeatured === true);

        const resolvedHero = explicitHero.map((p) => {
          if (p.linkedProductId) {
            const linked = parsed.find((item) => item.id === p.linkedProductId);
            if (linked) return { ...p, linkedProduct: linked };
          }
          return p;
        });

        setHeroProducts(resolvedHero);
        setSubProducts(featuredSubProducts);
        return;
      } catch (e) {
        console.error("Error parsing admin_products in Home", e);
      }
    }

    const explicitHeroInitial = initialProducts.filter(
      (p) => (p.isHeroFeatured === true || Boolean((p as any).heroCustomImage)) && Boolean((p as any).heroCustomImage || p.featuredImage?.url)
    );
    setHeroProducts(explicitHeroInitial);
    setSubProducts(initialProducts.filter((p) => p.isMainFeatured === true));
  };

  useEffect(() => {
    syncProductsFromStorage();
    const handleStorageChange = () => {
      syncProductsFromStorage();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("admin_products_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("admin_products_updated", handleStorageChange);
    };
  }, []);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (heroProducts.length === 0 && subProducts.length === 0) {
    return (
      <div className="col-span-8 flex flex-col items-center justify-center p-12 text-center text-neutral-400">
        <p className="text-sm font-bold">현재 메인 화면에 설정된 메인 상품이 없습니다.</p>
        <p className="text-xs mt-1">어드민 페이지(Admin)의 메인 상품 설정에서 메인 대표 상품 및 하단 상품을 선택해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="col-span-8 w-full relative flex flex-col gap-6 md:gap-8">
      {/* Top Main Featured Left/Right Carousel Slider */}
      {heroProducts.length > 0 && (
        <div className="w-full relative group pt-0 md:pt-16">
          {/* Embla Carousel Viewport */}
          <div className="overflow-hidden w-full" ref={emblaRef}>
            <div className="flex">
              {heroProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex-[0_0_100%] md:flex-[0_0_50%] min-w-0 pr-0"
                >
                  <LatestProductCard
                    product={product}
                    principal={true}
                  />
                </div>
              ))}
            </div>
          </div>


        </div>
      )}

      {/* Remaining Products Below (2 Columns on Mobile, 3 Columns on Desktop) */}
      {subProducts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 w-full">
          {subProducts.map((product, index) => (
            <LatestProductCard
              key={product.id}
              product={product}
              labelPosition={getLabelPosition(index + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
