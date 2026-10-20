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

  const add = (url: any) => {
    if (!url || typeof url !== "string") return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return;
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

  // 3. images array
  if (Array.isArray(product.images)) {
    const detailHtml = product.detailDescription || product.descriptionHtml || "";
    product.images.forEach((img: any, idx: number) => {
      const u = typeof img === "string" ? img : img?.url;
      // Skip if it's explicitly only part of detail description and not the primary image
      if (idx > 0 && detailHtml && typeof u === "string" && detailHtml.includes(u)) {
        return;
      }
      add(u);
    });
  }

  // 4. colorImages if present
  if (product.colorImages && typeof product.colorImages === "object") {
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
}

/**
 * Pure element-free product image slider:
 * - Auto-slides smoothly when multiple images are registered
 * - ZERO UI elements: No arrows, no dots, no badges, no counter numbers
 * - True infinite seamless forward sliding
 * - Mobile touch swipe supported without blocking card click/navigation
 */
export function ProductCardImageSlider({
  images,
  alt,
  paddingClass = "p-3 sm:p-5 md:p-7",
  imageClassName = "object-contain transition-transform duration-700 group-hover:scale-105",
  intervalMs = 3200,
  priority = false,
}: ProductCardImageSliderProps) {
  // Deduplicate and sanitize
  const cleanImages = useMemo(() => {
    const list: string[] = [];
    (images || []).forEach((img) => {
      const u = typeof img === "string" ? img.trim() : (img as any)?.url?.trim();
      if (u && !list.includes(u)) {
        list.push(u);
      }
    });
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
  intervalMs,
  priority,
}: {
  images: string[];
  alt: string;
  paddingClass: string;
  imageClassName: string;
  intervalMs: number;
  priority: boolean;
}) {
  // Append first image at the end to form a true infinite loop [0, 1, ..., N-1, 0]
  const slides = useMemo(() => [...images, images[0]], [images]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);

  // Auto slide interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setEnableTransition(true);
      setCurrentIndex((prev) => {
        if (prev >= images.length) return prev;
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

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
        "relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden select-none",
        paddingClass
      )}
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
