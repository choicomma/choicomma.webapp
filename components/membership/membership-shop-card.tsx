"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, ShoppingBag, Sparkles } from "lucide-react";

const SLIDE_IMAGES = [
  {
    url: "/main_slider/1.webp",
    subtitle: "2026 SPRING / SUMMER SIGNATURE",
    title: "CHOICOMMA OFFICIAL STORE",
    desc: "절제된 실루엣과 고급스러운 텍스처, 초이콤마의 시그니처 컬렉션을 쇼핑홈에서 만나보세요.",
  },
  {
    url: "/main_slider/2.webp",
    subtitle: "HIGH-END LUXURY SILHOUETTE",
    title: "NEW ARRIVALS & EXCLUSIVES",
    desc: "지금 가장 주목받는 신상품과 회원 전용 혜택이 적용되는 컬렉션을 둘러보세요.",
  },
  {
    url: "/main_slider/3.webp",
    subtitle: "TIMELESS ELEGANCE",
    title: "PREMIUM TAILORED LOOK",
    desc: "독보적인 감각으로 완성된 프리미엄 라인업을 지금 확인하세요.",
  },
  {
    url: "/main_slider/0906_초이콤마_모델20751.webp",
    subtitle: "EXCLUSIVE MEMBERSHIP BENEFIT",
    title: "CURATED SEASONAL DROPS",
    desc: "회원 등급별 추가 할인 및 시크릿 타임세일 혜택을 쇼핑홈에서 누려보세요.",
  },
];

export function MembershipShopCard() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const activeSlide = SLIDE_IMAGES[currentIdx] || SLIDE_IMAGES[0];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full overflow-hidden rounded-3xl border border-neutral-200/80 shadow-md hover:shadow-xl transition-all duration-500 bg-neutral-950 group"
    >
      {/* Background Slides with Smooth Fade */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {SLIDE_IMAGES.map((slide, idx) => (
          <div
            key={slide.url}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              idx === currentIdx ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            <Image
              src={slide.url}
              alt={slide.title}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              priority={idx === 0}
              className="object-cover object-[center_25%] transition-transform duration-1000 ease-out group-hover:scale-105"
            />
          </div>
        ))}

        {/* Sophisticated Multi-stop Gradient Overlay for Crystal Clear Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/30 md:from-black/85 md:via-black/55 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 md:hidden" />
      </div>

      {/* Card Content */}
      <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col justify-between min-h-[220px] sm:min-h-[260px] md:min-h-[280px]">
        {/* Top Bar: Store Badge & Slide Indicators */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-[11px] font-black tracking-widest uppercase shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
            <span>{activeSlide.subtitle}</span>
          </div>

          {/* Interactive Slide Dots */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {SLIDE_IMAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIdx(i);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === currentIdx
                    ? "w-5 sm:w-6 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`슬라이드 ${i + 1}번으로 이동`}
              />
            ))}
          </div>
        </div>

        {/* Middle: Editorial Title & Description */}
        <div className="my-4 sm:my-5 max-w-xl">
          <Link href="/" prefetch className="block group/link">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-serif font-black tracking-tight text-white leading-tight drop-shadow-sm group-hover/link:text-amber-200 transition-colors">
              {activeSlide.title}
            </h2>
            <p className="mt-2 text-xs sm:text-[13px] text-neutral-200/90 leading-relaxed font-medium line-clamp-2 drop-shadow-2xs">
              {activeSlide.desc}
            </p>
          </Link>
        </div>

        {/* Bottom Bar: Action Buttons (쇼핑홈 바로가기 & 전체 컬렉션) */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/"
            prefetch
            className="inline-flex items-center gap-2 bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer group/btn"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-950" />
            <span>쇼핑홈 바로가기</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-950 group-hover/btn:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/shop"
            prefetch
            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-full backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 cursor-pointer"
          >
            <span>전체 상품 보기</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
          </Link>
        </div>
      </div>
    </div>
  );
}
