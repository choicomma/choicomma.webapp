"use client";
// Force HMR refresh for Product Page Client Wrapper

import React, { useEffect, useState, useRef, Suspense } from "react";
import { Product } from "@/lib/sfcc/types";
import { MobileGallerySlider } from "./mobile-gallery-slider";
import { DesktopGallery } from "./desktop-gallery";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDetailAccordions } from "./product-detail-accordions";
import { ProductReviews } from "./product-reviews";
import { FloatingPurchaseBar } from "./floating-purchase-bar";

export function ProductPageClientWrapper({ initialProduct }: { initialProduct: Product }) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [sharedPrices, setSharedPrices] = useState<{ originalPrice: number; discountedPrice: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftTopRef = useRef<HTMLDivElement>(null);
  const rightTopRef = useRef<HTMLDivElement>(null);
  const [topSpacing, setTopSpacing] = useState<{ leftMargin?: number; rightMargin?: number }>({});

  useEffect(() => {
    const syncProductFromStorage = async () => {
      // 1. Try Central Server API first
      try {
        const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
        if (res.ok) {
          const serverData = await res.json();
          if (Array.isArray(serverData)) {
            const found = serverData.find(
              (p: any) => p.id === initialProduct.id || p.handle === initialProduct.handle
            );
            if (found) {
              const detail = found.detailDescription || found.descriptionHtml || "";
              if (found.images && found.images.length > 1 && detail) {
                const extras = found.images.slice(1);
                if (extras.every((img: any) => detail.includes(img.url || img))) {
                  const rep = found.featuredImage || found.images[0];
                  found.images = [rep];
                }
              }
              setProduct(found);
              return;
            }
          }
        }
      } catch (e) {}

      // 2. Fallback to localStorage
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("admin_products");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const found = parsed.find(
            (p: any) => p.id === initialProduct.id || p.handle === initialProduct.handle
          );
          if (found) {
            const detail = found.detailDescription || found.descriptionHtml || "";
            if (found.images && found.images.length > 1 && detail) {
              const extras = found.images.slice(1);
              if (extras.every((img: any) => detail.includes(img.url || img))) {
                const rep = found.featuredImage || found.images[0];
                found.images = [rep];
              }
            }
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

  // 고객후기 상단 선과 드롭다운(아코디언) 상단 선 높이(Y 위치)를 완벽하게 동기화
  useEffect(() => {
    const updateAlign = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 768) {
        setTopSpacing({});
        return;
      }

      if (!containerRef.current || !leftTopRef.current || !rightTopRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const leftRect = leftTopRef.current.getBoundingClientRect();
      const rightRect = rightTopRef.current.getBoundingClientRect();

      // 컨테이너 최상단 기준 각 상단 요소(이미지 갤러리 / 상품 헤더)의 하단 Y 거리
      const leftBottom = leftRect.bottom - containerRect.top;
      const rightBottom = rightRect.bottom - containerRect.top;

      // 두 영역 중 더 긴 영역 아래에 32px 기본 간격을 두고 동일한 가로 라인(선) 생성
      const baseGap = 32;
      const targetY = Math.max(leftBottom, rightBottom) + baseGap;

      const leftMargin = Math.max(baseGap, Math.round(targetY - leftBottom));
      const rightMargin = Math.max(baseGap, Math.round(targetY - rightBottom));

      setTopSpacing({ leftMargin, rightMargin });
    };

    const animId = requestAnimationFrame(updateAlign);

    const resizeObserver = new ResizeObserver(() => {
      updateAlign();
    });

    if (leftTopRef.current) resizeObserver.observe(leftTopRef.current);
    if (rightTopRef.current) resizeObserver.observe(rightTopRef.current);
    window.addEventListener("resize", updateAlign);
    window.addEventListener("product_color_selected", updateAlign);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateAlign);
      window.removeEventListener("product_color_selected", updateAlign);
    };
  }, [product]);

  const hasVariants = (product.variants && product.variants.length > 1) || false;

  return (
    <div
      ref={containerRef}
      id="product-detail-container"
      className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-16 px-4 md:px-12 pt-24 sm:pt-28 md:pt-36 pb-12 md:pb-24 bg-white max-w-[1600px] mx-auto items-start"
    >
      {/* Left Column: Product Images + Desktop Detail Menu (Horizontal Sliding Menu) */}
      <div className="flex flex-col w-full md:self-stretch min-w-0 overflow-visible">
        {/* Mobile Gallery Slider */}
        <div className="md:hidden h-[60vh] min-h-[380px]">
          <Suspense fallback={null}>
            <MobileGallerySlider key={product.handle || product.id} product={product} />
          </Suspense>
        </div>

        {/* Desktop Gallery */}
        <div ref={leftTopRef} className="hidden md:flex justify-center w-full">
          <Suspense fallback={null}>
            <DesktopGallery key={product.handle || product.id} product={product} />
          </Suspense>
        </div>

        {/* Desktop Detail Menu: Synced top line height with reviews */}
        <div
          style={topSpacing.leftMargin !== undefined ? { marginTop: `${topSpacing.leftMargin}px` } : undefined}
          className="hidden md:block w-full min-w-0 overflow-visible"
        >
          <ProductDetailAccordions product={product} isMobile={false} />
        </div>
      </div>

      {/* Right Column: Product Details + Mobile Detail Menu + Customer Reviews */}
      <div className="flex flex-col md:pl-8 md:pt-8 w-full max-w-xl min-w-0 md:self-stretch">
        <div ref={rightTopRef} className="w-full">
          <ProductDetailHeader
            key={product.handle || product.id}
            product={product}
            hasVariants={hasVariants}
            onPriceChange={setSharedPrices}
          />
        </div>
        
        {/* Mobile Detail Menu: Placed under Add to Cart button (Customer reviews is tab #0 on mobile) */}
        <div className="md:hidden w-full mt-8">
          <ProductDetailAccordions key={product.handle || product.id} product={product} isMobile={true} />
        </div>

        {/* Desktop Reviews Section: Sticky on scroll with synced top line height */}
        <div
          style={topSpacing.rightMargin !== undefined ? { marginTop: `${topSpacing.rightMargin}px` } : undefined}
          className="hidden md:block w-full sticky top-28 self-start z-10 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar overscroll-contain bg-white min-w-0"
        >
          <ProductReviews productId={product.id} productTitle={product.title} />
        </div>
      </div>

      {/* Floating Bottom Sticky Purchase Bar */}
      <FloatingPurchaseBar key={product.handle || product.id} product={product} sharedPrices={sharedPrices} />
    </div>
  );
}
