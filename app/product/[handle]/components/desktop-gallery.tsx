"use client";

import {
  useProductImages,
  useSelectedVariant,
} from "@/components/products/variant-selector";
import { Product } from "@/lib/sfcc/types";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);
  const [activeIndex, setActiveIndex] = useState(0);

  // 돋보기 호버 상태 및 마우스 좌표 (0 ~ 100%)
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // If activeIndex is out of bounds due to variant change, reset to 0
  if (activeIndex >= images.length && images.length > 0) {
    setActiveIndex(0);
  }

  // 제품 이미지가 2개 이상일 때 자동으로 슬라이드 (단, 마우스 호버로 돋보기 사용 중일 때는 일시정지)
  useEffect(() => {
    if (images.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [images.length, activeIndex, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  if (!images.length) return null;

  return (
    <div className="flex gap-4 md:gap-6 w-full items-start justify-center mx-auto">
      {/* Thumbnails (Left Column) */}
      {images.length > 1 && (
        <div className="w-16 sm:w-20 shrink-0 flex flex-col gap-2.5 overflow-y-auto no-scrollbar max-h-[500px]">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative w-full aspect-square overflow-hidden transition-all duration-300 bg-transparent rounded-sm focus:outline-none focus:ring-0 cursor-pointer ${
                activeIndex === index ? "opacity-100 ring-2 ring-neutral-900" : "opacity-40 hover:opacity-80"
              }`}
            >
              <img
                src={image.url}
                alt={image.altText || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image with Hover Magnifier Effect (마우스 호버 시에만 돋보기 확대 작동, 클릭 차단 및 뱃지 삭제) */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        className="w-full max-w-[500px] aspect-square relative bg-transparent overflow-hidden mx-auto sm:mx-0 cursor-crosshair select-none"
      >

        {images.map((image, index) => {
          const isActive = activeIndex === index;
          return (
            <img
              key={`${image.url}-${index}`}
              src={image.url}
              alt={image.altText || product.title}
              style={
                isActive && isHovered
                  ? {
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      transform: "scale(2.35)",
                      transition: "transform 0.08s ease-out",
                    }
                  : {
                      transform: "scale(1)",
                      transition: "transform 0.3s ease-out, opacity 0.5s ease-in-out",
                    }
              }
              className={cn(
                "w-full h-full object-cover object-center absolute inset-0 block will-change-transform",
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
