"use client";
import React, { useEffect, useState, useRef } from "react";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { MobileGallerySlider } from "./mobile-gallery-slider";
import { DesktopGallery } from "./desktop-gallery";
import { ProductDetailHeader } from "./product-detail-header";
import { ProductDetailAccordions } from "./product-detail-accordions";
import { RelatedProducts } from "./related-products";
import { mockProducts } from "@/lib/sfcc/mock/products";

import { ProductReviews } from "./product-reviews";
import { FloatingPurchaseBar } from "./floating-purchase-bar";

export function ClientProductFallback({ handle }: { handle: string }) {
  const [product, setProduct] = useState<any | null>(null);
  const [sharedPrices, setSharedPrices] = useState<{ originalPrice: number; discountedPrice: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftTopRef = useRef<HTMLDivElement>(null);
  const rightTopRef = useRef<HTMLDivElement>(null);
  const [topSpacing, setTopSpacing] = useState<{ leftMargin?: number; rightMargin?: number }>({});

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
      <div
        ref={containerRef}
        id="product-detail-container"
        className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-16 px-4 md:px-12 pt-24 sm:pt-28 md:pt-36 pb-12 md:pb-24 bg-white max-w-[1600px] mx-auto items-start"
      >
        {/* Left Column: Product Images + Desktop Detail Menu (Horizontal Sliding Menu) */}
        <div className="flex flex-col w-full md:self-stretch min-w-0 overflow-visible">
          <div className="md:hidden h-[60vh] min-h-[380px]">
            <MobileGallerySlider product={product} />
          </div>
          <div ref={leftTopRef} className="hidden md:flex justify-center w-full">
            <DesktopGallery product={product} />
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
              product={product}
              hasVariants={hasVariants}
              onPriceChange={setSharedPrices}
            />
          </div>
          
          {/* Mobile Detail Menu: Placed under Add to Cart button (Customer reviews is tab #0 on mobile) */}
          <div className="md:hidden w-full mt-8">
            <ProductDetailAccordions product={product} isMobile={true} />
          </div>

          {/* Desktop Reviews Section: Sticky on scroll with synced top line height */}
          <div
            style={topSpacing.rightMargin !== undefined ? { marginTop: `${topSpacing.rightMargin}px` } : undefined}
            className="hidden md:block w-full sticky top-28 self-start z-10 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar overscroll-contain bg-white min-w-0"
          >
            <ProductReviews productId={product.id} productTitle={product.title} />
          </div>
        </div>
      </div>
      <FloatingPurchaseBar product={product} sharedPrices={sharedPrices} />
      <RelatedProducts />
    </PageLayout>
  );
}
