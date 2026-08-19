"use client";
// Force HMR refresh for Product Page Client Wrapper

import React, { useEffect, useState, Suspense } from "react";
import { Product } from "@/lib/sfcc/types";
import { MobileGallerySlider } from "./mobile-gallery-slider";
import { DesktopGallery } from "./desktop-gallery";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDetailAccordions } from "./product-detail-accordions";

export function ProductPageClientWrapper({ initialProduct }: { initialProduct: Product }) {
  const [product, setProduct] = useState<Product>(initialProduct);

  useEffect(() => {
    const syncProductFromStorage = () => {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("admin_products");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const found = parsed.find(
            (p: any) => p.id === initialProduct.id || p.handle === initialProduct.handle
          );
          if (found) {
            setProduct(found);
          }
        } catch (e) {}
      }
    };

    syncProductFromStorage();

    window.addEventListener("storage", syncProductFromStorage);
    window.addEventListener("admin_products_updated", syncProductFromStorage);
    return () => {
      window.removeEventListener("storage", syncProductFromStorage);
      window.removeEventListener("admin_products_updated", syncProductFromStorage);
    };
  }, [initialProduct]);

  const hasVariants = (product.variants && product.variants.length > 1) || false;

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-16 px-4 md:px-12 py-8 md:py-12 bg-white max-w-[1600px] mx-auto">
      {/* Mobile Gallery Slider */}
      <div className="md:hidden h-[70vh] min-h-[480px]">
        <Suspense fallback={null}>
          <MobileGallerySlider product={product} />
        </Suspense>
      </div>

      {/* Desktop Gallery */}
      <div className="hidden md:block w-full h-[90vh]">
        <Suspense fallback={null}>
          <DesktopGallery product={product} />
        </Suspense>
      </div>

      {/* Product Details */}
      <div className="flex flex-col md:pl-8 md:pt-8 w-full max-w-xl">
        <ProductDetailHeader product={product} hasVariants={hasVariants} />
        <ProductDetailAccordions product={product} />
      </div>
    </div>
  );
}
