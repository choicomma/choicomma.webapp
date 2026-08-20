"use client";
import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { MobileGallerySlider } from "./mobile-gallery-slider";
import { DesktopGallery } from "./desktop-gallery";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDetailAccordions } from "./product-detail-accordions";
import { RelatedProducts } from "./related-products";
import { mockProducts } from "@/lib/sfcc/mock/products";

export function ClientProductFallback({ handle }: { handle: string }) {
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let decoded = handle;
    try {
      decoded = decodeURIComponent(handle);
    } catch (e) {}

    const saved = localStorage.getItem("admin_products");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const found = parsed.find((p: any) => {
          if (!p) return false;
          const pHandleDecoded = p.handle ? decodeURIComponent(p.handle) : "";
          const pTitleSlug = p.title ? p.title.toLowerCase().replace(/\s+/g, "-") : "";
          return (
            p.handle === handle ||
            p.handle === decoded ||
            pHandleDecoded === decoded ||
            p.id === handle ||
            p.id === decoded ||
            pTitleSlug === decoded.toLowerCase()
          );
        });

        if (found) {
          setProduct(found);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    const mockFound = mockProducts.find((p: any) => {
      if (!p) return false;
      const pHandleDecoded = p.handle ? decodeURIComponent(p.handle) : "";
      return (
        p.handle === handle ||
        p.handle === decoded ||
        pHandleDecoded === decoded ||
        p.id === handle ||
        p.id === decoded
      );
    });

    if (mockFound) {
      setProduct(mockFound);
    }
    setLoading(false);
  }, [handle]);

  if (loading) return <div className="min-h-screen w-full bg-white animate-pulse" />;
  
  if (!product) {
    if (typeof window !== "undefined") {
      window.location.href = "/404";
    }
    return null;
  }

  const hasVariants = product.variants && product.variants.length > 1;

  return (
    <PageLayout className="bg-white" hideFooter={false}>
      <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-16 px-4 md:px-12 py-8 md:py-12 bg-white max-w-[1600px] mx-auto">
        <div className="md:hidden h-[70vh] min-h-[480px]">
          <MobileGallerySlider product={product} />
        </div>
        <div className="hidden md:block w-full h-[90vh]">
          <DesktopGallery product={product} />
        </div>
        <div className="flex flex-col md:pl-8 md:pt-8 w-full max-w-xl">
          <ProductDetailHeader product={product} hasVariants={hasVariants} />
          <ProductDetailAccordions product={product} />
        </div>
      </div>
      <RelatedProducts />
    </PageLayout>
  );
}
