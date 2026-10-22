"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Extract all unique display images for a product:
 * - heroCustomImage
 * - featuredImage
 * - product.images (excluding detail description body images)
 * - colorImages
 */
export function extractProductImages(product: any): string[] {
  if (!product) return ["/product_1.webp"];
  const list: string[] = [];

  const isPlaceholder = (url: string) => {
    if (!url) return true;
    const lower = url.trim().toLowerCase();
    return (
      lower === "/product_1.webp" ||
      lower === "/product_placeholder.webp" ||
      lower.includes("placeholder")
    );
  };

  const add = (url: any) => {
    if (!url || typeof url !== "string") return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return;
    // 대체용 더미 이미지(/product_1.webp 등)는 실제 상품 이미지가 존재할 때 절대 추가하지 않음
    if (isPlaceholder(trimmed)) return;
    if (!list.includes(trimmed)) {
      list.push(trimmed);
    }
  };

  // 1. heroCustomImage if present
  if (product.heroCustomImage) {
    add(product.heroCustomImage);
  }

  // 2. featuredImage
  if (product.featuredImage?.url) {
    add(product.featuredImage.url);
  }

  // 3. images array (사용자가 등록한 상품 이미지 목록)
  if (Array.isArray(product.images)) {
    const detailHtml = product.detailDescription || product.descriptionHtml || "";
    product.images.forEach((img: any, idx: number) => {
      const u = typeof img === "string" ? img : img?.url;
      // 1) 상세페이지 본문(detailDescription)에 등록된 사진이거나
      // 2) 아임웹 본문 컷 URL(cdn.imweb.me/upload/)인 경우,
      // 상품 리스트 카드 슬라이더에서 제외 (0번 대표 이미지가 아닌 2번 이후의 상세 컷 슬라이딩 방지)
      if (idx > 0 && typeof u === "string") {
        if (u.includes("cdn.imweb.me/upload/")) return;
        if (detailHtml && detailHtml.includes(u)) return;
      }
      add(u);
    });
  }

  // 4. colorImages if present: 상품 이미지가 0~1개만 있을 때만 보조적으로 추가
  // (사용자가 4장 이상의 제품 이미지를 등록한 경우 옵션컷이나 더미 플레이스홀더가 5번째 이미지로 끼어들지 않도록 방지)
  if (list.length <= 1 && product.colorImages && typeof product.colorImages === "object") {
    Object.values(product.colorImages).forEach((u: any) => {
      if (typeof u === "string") add(u);
    });
  }

  if (list.length === 0) {
    list.push("/product_1.webp");
  }

  return list;
}

interface ProductCardImageSliderProps {
  images: string[];
  alt: string;
  paddingClass?: string;
  imageClassName?: string;
  intervalMs?: number;
  priority?: boolean;
  fillContainer?: boolean;
}

/**
 * Pure element-free product image slider:
 * - 평상시: 0번 대표 이미지(앞모습)를 기본으로 표시
 * - PC 호버 시: 1번 호버백이미지(뒷모습)로 즉시 전환되고, 3장 이상일 경우 순차 슬라이드 프리뷰
 * - 마우스 벗어날 시: 즉시 0번 대표 이미지로 복귀 (호버백이미지가 기본으로 떠 있는 오류 차단)
 * - 모바일 터치 스와이프 지원 (무차별 자동 타이머 슬라이드로 인한 강제 전환 방지)
 */
export function ProductCardImageSlider({
  images,
  alt,
  paddingClass = "p-3 sm:p-5 md:p-7",
  imageClassName = "object-contain transition-transform duration-700 group-hover:scale-105",
  intervalMs = 2800,
  priority = false,
  fillContainer = false,
}: ProductCardImageSliderProps) {
  // Deduplicate and sanitize (실제 이미지가 1장 이상 등록된 경우 더미 플레이스홀더 /product_1.webp 제거)
  const cleanImages = useMemo(() => {
    const list: string[] = [];
    (images || []).forEach((img) => {
      const u = typeof img === "string" ? img.trim() : (img as any)?.url?.trim();
      if (u && !list.includes(u)) {
        list.push(u);
      }
    });
    const isPlaceholder = (u: string) =>
      u === "/product_1.webp" || u === "/product_placeholder.webp" || u.includes("placeholder");
    const nonPlaceholders = list.filter((u) => !isPlaceholder(u));
    if (nonPlaceholders.length > 0) {
      return nonPlaceholders;
    }
    return list.length > 0 ? list : ["/product_1.webp"];
  }, [images]);

  // Single image: pure static rendering without slider overhead
  if (cleanImages.length <= 1) {
    return (
      <div
        className={cn(
          "relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden",
          paddingClass
        )}
      >
        <Image
          src={cleanImages[0]}
          alt={alt}
          fill
          unoptimized={true}
          priority={priority}
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <PureElementFreeSlider
      images={cleanImages}
      alt={alt}
      paddingClass={paddingClass}
      imageClassName={imageClassName}
      intervalMs={intervalMs}
      priority={priority}
    />
  );
}

function PureElementFreeSlider({
  images,
  alt,
  paddingClass,
  imageClassName,
  intervalMs = 2800,
  priority,
}: {
  images: string[];
  alt: string;
  paddingClass: string;
  imageClassName: string;
  intervalMs?: number;
  priority: boolean;
}) {
  // Append first image at the end to form a true infinite loop [0, 1, ..., N-1, 0]
  const slides = useMemo(() => [...images, images[0]], [images]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-slide interval:
  // - 첫 로드 시 항상 0번 대표 이미지(앞모습)부터 시작
  // - 등록된 4개 이미지를 3초 간격으로 순차적/부드럽게 자동 슬라이드 (1 -> 2 -> 3 -> 4 -> 1...)
  // - PC 마우스 호버 시 일시 정지(pause)하여 고객이 현재 사진을 멈춰서 상세히 감상할 수 있음
  // - 마우스가 벗어나면 자연스럽게 다음 슬라이드로 자동 순환 재개
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setEnableTransition(true);
      setCurrentIndex((prev) => {
        if (prev >= images.length) return prev;
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isHovered, images.length, intervalMs]);

  // When transition to the duplicate last slide finishes, silently jump back to index 0
  const handleTransitionEnd = () => {
    if (currentIndex >= images.length) {
      setEnableTransition(false);
      setCurrentIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
    }
  };

  // Mobile Touch Swipe support (left / right) without blocking normal taps/clicks
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Detect horizontal swipe if deltaX > 35px and horizontal > vertical
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      setEnableTransition(true);
      if (diffX < 0) {
        // Swiped left: go next
        setCurrentIndex((prev) => (prev + 1 > images.length ? 1 : prev + 1));
      } else {
        // Swiped right: go prev
        setCurrentIndex((prev) => (prev <= 0 ? images.length - 1 : prev - 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className={cn(
        "relative w-full bg-white flex items-center justify-center overflow-hidden select-none",
        fillContainer ? "h-full" : "aspect-square",
        paddingClass
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cn(
          "flex w-full h-full",
          enableTransition ? "transition-transform duration-700 ease-out" : "transition-none"
        )}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative w-full h-full flex-[0_0_100%] min-w-full flex items-center justify-center pointer-events-none"
          >
            <Image
              src={url}
              alt={`${alt} ${idx + 1}`}
              fill
              unoptimized={true}
              priority={priority && idx === 0}
              className={imageClassName}
            />
          </div>
        ))}
      </div>
      {/* ANY AND ALL CONTROLS/INDICATORS ARE INTENTIONALLY OMITTED: Zero dots, zero arrows, zero badges, zero counters */}
    </div>
  );
}
