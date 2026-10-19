"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Product } from "@/lib/sfcc/types";
import {
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DetailImageItem {
  url: string;
  alt: string;
  source: "gallery" | "detail" | "fabric";
}

export function extractAllProductAndDetailImages(product: Product): DetailImageItem[] {
  const result: DetailImageItem[] = [];
  const seenUrls = new Set<string>();

  const addImg = (url: string, alt: string, source: "gallery" | "detail" | "fabric") => {
    if (!url) return;
    const cleanUrl = url.trim();
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    result.push({ url: cleanUrl, alt: alt || product.title, source });
  };

  // 1. 상세페이지 본문 이미지 (detailDescription / HTML 이미지)
  const rawHtml =
    (product as any).detailDescription ||
    (product as any).descriptionHtml ||
    product.description ||
    "";
  if (typeof rawHtml === "string" && rawHtml.includes("<img")) {
    const srcRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    let idx = 1;
    while ((match = srcRegex.exec(rawHtml)) !== null) {
      if (match[1]) {
        addImg(match[1], `상세페이지 디테일 컷 ${idx++}`, "detail");
      }
    }
  }

  // 2. 원단 텍스처 이미지
  const fabricImg = (product as any).fabricImage || (product as any).fabricTextureImage;
  if (fabricImg && typeof fabricImg === "string") {
    addImg(fabricImg, "원단 텍스처 디테일", "fabric");
  }

  // 3. 사이즈 가이드 이미지
  const sizeImg = (product as any).sizeGuideImage || (product as any).sizeChartImage;
  if (sizeImg && typeof sizeImg === "string") {
    addImg(sizeImg, "사이즈 수치 가이드", "detail");
  }

  // 상세페이지 이미지가 전혀 없을 때만 기본 대표 상품 이미지 1장 폴백
  if (result.length === 0) {
    if (product.featuredImage?.url) {
      addImg(product.featuredImage.url, product.featuredImage.altText || product.title, "gallery");
    } else if (Array.isArray(product.images) && product.images[0]) {
      const first = product.images[0];
      const u = typeof first === "string" ? first : first.url;
      if (u) addImg(u, product.title, "gallery");
    }
  }

  return result;
}

interface ImageMagnifierModalProps {
  product: Product;
}

export function ImageMagnifierModal({ product }: ImageMagnifierModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [useLoupe, setUseLoupe] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPan = useRef({ x: 0, y: 0 });

  // Loupe state (Magnifying lens position)
  const [isMouseOverImg, setIsMouseOverImg] = useState(false);
  const [loupePos, setLoupePos] = useState({ x: 0, y: 0, percentX: 50, percentY: 50 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const images = extractAllProductAndDetailImages(product);
  const currentImg = images[currentIndex] || images[0];

  // Listen to open event from floating 돋보기 button or detail cuts
  useEffect(() => {
    const handleOpen = (e: any) => {
      const detail = e.detail || {};
      if (detail.url) {
        const foundIdx = images.findIndex((img) => img.url === detail.url);
        if (foundIdx >= 0) setCurrentIndex(foundIdx);
      } else if (typeof detail.index === "number" && detail.index >= 0) {
        setCurrentIndex(Math.min(detail.index, images.length - 1));
      }
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setIsOpen(true);
    };

    window.addEventListener("choicomma_open_magnifier", handleOpen);
    return () => window.removeEventListener("choicomma_open_magnifier", handleOpen);
  }, [images]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, images.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [images.length]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3, Math.round((prev + 0.5) * 10) / 10));
    setUseLoupe(false);
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse move for 돋보기 loupe & pan
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
      setIsMouseOverImg(true);
      const percentX = (mouseX / rect.width) * 100;
      const percentY = (mouseY / rect.height) * 100;
      setLoupePos({
        x: e.clientX,
        y: e.clientY,
        percentX,
        percentY,
      });
    } else {
      setIsMouseOverImg(false);
    }

    // Drag to pan when zoomed in
    if (isDragging && zoomLevel > 1) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      setPanOffset({
        x: initialPan.current.x + deltaX,
        y: initialPan.current.y + deltaY,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      initialPan.current = { ...panOffset };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !currentImg) return null;

  const sourceLabels = {
    gallery: "대표 갤러리 컷",
    detail: "상세 디테일 컷",
    fabric: "원단 텍스처 확대",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="상세이미지 돋보기 확대 뷰어"
      className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. Top Control Bar */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/40 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-bold shrink-0">
            <ZoomIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>상세 돋보기 뷰어</span>
          </div>
          <span className="hidden sm:inline text-white/40 text-xs">|</span>
          <span className="text-white text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
            {product.title}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono font-bold bg-amber-400/20 text-amber-300 shrink-0">
            {sourceLabels[currentImg.source]}
          </span>
        </div>

        {/* Zoom & Loupe Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Loupe Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setUseLoupe((prev) => !prev);
              if (!useLoupe) {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
              useLoupe && zoomLevel === 1
                ? "bg-amber-400 text-neutral-950 border-amber-300 shadow-md shadow-amber-400/20"
                : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20 hover:text-white"
            )}
            title="마우스 위치 돋보기 렌즈 모드 전환"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">돋보기 렌즈</span>
            <span className="text-[10px] opacity-80">{useLoupe && zoomLevel === 1 ? "ON" : "OFF"}</span>
          </button>

          {/* Zoom Buttons Group */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10">
            <button
              type="button"
              disabled={zoomLevel <= 1}
              onClick={handleZoomOut}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="축소 (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-white min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              disabled={zoomLevel >= 3}
              onClick={handleZoomIn}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="확대 (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="기본 크기로 초기화 (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/15 hover:border-white/30"
            title="돋보기 닫기 (Esc)"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main High-Res Viewer Area */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 w-full flex items-center justify-center overflow-hidden p-4 sm:p-8",
          zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : useLoupe ? "cursor-crosshair" : "cursor-default"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Navigation Left Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:border-white/50 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-2xl hover:scale-105 active:scale-95"
            title="이전 이미지 (←)"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
        )}

        {/* Central Display Image */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={currentImg.url}
            alt={currentImg.alt}
            style={{
              transform: zoomLevel > 1 ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` : undefined,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="max-w-[88vw] max-h-[72vh] object-contain rounded-lg shadow-2xl select-none"
            draggable={false}
          />

          {/* Circular Magnifying Loupe Lens (돋보기 렌즈 효과) */}
          {useLoupe && zoomLevel === 1 && isMouseOverImg && (
            <div
              className="fixed pointer-events-none z-50 w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-white/90 shadow-[0_15px_50px_rgba(0,0,0,0.7)] overflow-hidden bg-neutral-900"
              style={{
                left: `${loupePos.x - 120}px`,
                top: `${loupePos.y - 120}px`,
              }}
            >
              {/* Magnified Image inside the Loupe Lens (2.8x Zoom) */}
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${currentImg.url})`,
                  backgroundPosition: `${loupePos.percentX}% ${loupePos.percentY}%`,
                  backgroundSize: "280%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              {/* Glass Lens Glare & Crosshair Reticle */}
              <div className="absolute inset-0 rounded-full border border-black/30 pointer-events-none shadow-inner" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
                <div className="w-full h-0.5 bg-amber-400 absolute top-1/2 -translate-y-1/2" />
                <div className="h-full w-0.5 bg-amber-400 absolute left-1/2 -translate-x-1/2" />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/75 rounded text-[10px] font-mono font-bold text-amber-300">
                2.8x 돋보기
              </div>
            </div>
          )}
        </div>

        {/* Navigation Right Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:border-white/50 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-2xl hover:scale-105 active:scale-95"
            title="다음 이미지 (→)"
            aria-label="다음 이미지"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
          </button>
        )}

        {/* Quick Helper Floating Tip */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 text-[11px] font-medium hidden sm:flex items-center gap-2 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>마우스를 올리면 원단과 디테일이 2.8배 확대됩니다. 상단 버튼으로 전체 확대/축소 가능합니다.</span>
        </div>
      </div>

      {/* 3. Bottom Thumbnail Carousel & Counter */}
      <footer className="w-full px-4 sm:px-8 py-3.5 border-t border-white/10 bg-black/40 shrink-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Counter & Image Name */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/70 text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
          <span className="text-white/80 text-xs font-medium truncate max-w-[200px]">
            {currentImg.alt}
          </span>
        </div>

        {/* Thumbnail Filmstrip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full sm:max-w-xl">
          {images.map((img, idx) => (
            <button
              key={`${img.url}-${idx}`}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className={cn(
                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer",
                currentIndex === idx
                  ? "border-amber-400 ring-2 ring-amber-400/40 scale-105 opacity-100"
                  : "border-white/20 opacity-50 hover:opacity-90 hover:border-white/50"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
