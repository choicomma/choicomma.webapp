"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Lock,
  Flame,
  Clock,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Tag,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";

export interface PromotionItem {
  id: string;
  productId: string;
  product: any;
  title: string;
  imageUrl: string;
  productHandle?: string;
  originalPrice: number;
  salePrice: number;
  discountRate: number;
  savings: number;
  type: "secret" | "public";
  badgeText: string;
  targetGrade?: string;
  endDate?: string;
  expiryMs?: number;
}

interface MembershipPromotionCardProps {
  userGrade?: string;
  userEmail?: string;
  isAdmin?: boolean;
  applicableSecretSales?: any[];
  allProducts?: any[];
  onAddToCart?: (product: any, discountedPrice?: number) => void;
}

export function MembershipPromotionCard({
  userGrade = "VVIP",
  userEmail = "",
  isAdmin = false,
  applicableSecretSales = [],
  allProducts = [],
  onAddToCart,
}: MembershipPromotionCardProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "secret" | "public">("all");
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Gather Secret Time Sale items applicable to this member (active & unexpired only)
  const secretItems: PromotionItem[] = useMemo(() => {
    const items: PromotionItem[] = [];

    applicableSecretSales.forEach((sale) => {
      if (!sale || (sale.status && sale.status !== "active")) return;
      if (sale.id === "SECRET-TS-1792479678673") return;

      const rate = Number(sale.discountRate) || 30;
      const productIds: string[] = Array.isArray(sale.productIds) ? sale.productIds : [];
      if (productIds.length === 0) return;

      // Expiry calculation from createdAt + durationHours/minutes
      let expiryMs = 0;
      if (sale.createdAt && (sale.durationHours || sale.durationMinutes)) {
        const start = new Date(sale.createdAt).getTime();
        const durMs = ((Number(sale.durationHours) || 24) * 3600 + (Number(sale.durationMinutes) || 0) * 60) * 1000;
        expiryMs = start + durMs;
      }

      // Check if secret sale has already expired
      if (expiryMs > 0 && expiryMs <= nowTick) return;

      productIds.forEach((pId) => {
        const product = allProducts.find(
          (p) => String(p.id) === String(pId) || (p.handle && String(p.handle) === String(pId))
        );
        if (!product || product.availableForSale === false) return;

        const minP = Number(product.priceRange?.minVariantPrice?.amount || product.price?.amount || product.price || 0);
        const maxP = Number(product.priceRange?.maxVariantPrice?.amount || 0);
        const origPrice = maxP > minP ? maxP : (minP > 0 ? minP : 0);
        const salePrice = Math.round(origPrice * (1 - rate / 100));
        const savings = Math.max(0, origPrice - salePrice);

        const targetGrade =
          Array.isArray(sale.targetGrades) && sale.targetGrades.length > 0
            ? sale.targetGrades.join(", ")
            : `${userGrade} 전용`;

        items.push({
          id: `secret-${sale.id}-${product.id}`,
          productId: String(product.id),
          product,
          title: product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || product.title,
          imageUrl: product.featuredImage?.url || (Array.isArray(product.images) && product.images[0]?.url) || "/product_1.webp",
          productHandle: product.handle,
          originalPrice: origPrice,
          salePrice,
          discountRate: rate,
          savings,
          type: "secret",
          badgeText: `🔒 VIP SECRET ${rate}% OFF`,
          targetGrade,
          expiryMs: expiryMs > 0 ? expiryMs : undefined,
        });
      });
    });

    return items;
  }, [applicableSecretSales, allProducts, userGrade, nowTick]);

  // 2. Gather Public Time Sale items (live & currently ongoing only)
  const publicItems: PromotionItem[] = useMemo(() => {
    const items: PromotionItem[] = [];

    allProducts.forEach((product) => {
      // Must be explicitly enabled as a public time sale
      if (product.isTimeSale !== true) return;

      // Must have a real discount configured
      const rate = Number(product.timeSaleDiscountRate || 0);
      const discountPrice = Number(product.timeSaleDiscountPrice || 0);
      if (rate <= 0 && discountPrice <= 0) return;

      // Start date check (must not be in the future)
      if (product.timeSaleStartDate) {
        const startMs = new Date(product.timeSaleStartDate).getTime();
        if (!isNaN(startMs) && startMs > nowTick) return;
      }

      // End date check: Must have an end date that has not passed yet
      if (!product.timeSaleEndDate) return;
      const endMs = new Date(product.timeSaleEndDate).getTime();
      if (isNaN(endMs) || endMs <= nowTick) return; // Expired or invalid

      // Must be available for sale
      if (product.availableForSale === false) return;

      const minP = Number(product.priceRange?.minVariantPrice?.amount || product.price?.amount || product.price || 0);
      const maxP = Number(product.priceRange?.maxVariantPrice?.amount || 0);
      const origPrice = maxP > minP ? maxP : (minP > 0 ? minP : 0);

      let salePrice = origPrice;
      if (discountPrice > 0) {
        salePrice = discountPrice;
      } else if (rate > 0) {
        salePrice = Math.round(origPrice * (1 - rate / 100));
      }
      const savings = Math.max(0, origPrice - salePrice);
      const computedRate = origPrice > 0 && savings > 0 ? Math.round((savings / origPrice) * 100) : rate;
      if ((computedRate || rate) <= 0) return;

      items.push({
        id: `public-${product.id}`,
        productId: String(product.id),
        product,
        title: product.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim() || product.title,
        imageUrl: product.featuredImage?.url || (Array.isArray(product.images) && product.images[0]?.url) || "/product_1.webp",
        productHandle: product.handle,
        originalPrice: origPrice,
        salePrice,
        discountRate: computedRate || rate,
        savings,
        type: "public",
        badgeText: `🔥 TIME SALE ${computedRate || rate}% OFF`,
        endDate: product.timeSaleEndDate,
        expiryMs: endMs,
      });
    });

    return items;
  }, [allProducts, nowTick]);

  // Total unique benefits count
  const totalBenefitCount = useMemo(() => {
    const ids = new Set<string>();
    secretItems.forEach((i) => ids.add(i.productId));
    publicItems.forEach((i) => ids.add(i.productId));
    return ids.size;
  }, [secretItems, publicItems]);

  // Combine or filter by selected tab with productId deduplication
  const displayedItems = useMemo(() => {
    if (activeFilter === "secret") return secretItems;
    if (activeFilter === "public") return publicItems;
    // 'all': secret items first (VIP exclusive priority), then public items without duplicates
    const seen = new Set<string>();
    const res: PromotionItem[] = [];
    secretItems.forEach((it) => {
      seen.add(it.productId);
      res.push(it);
    });
    publicItems.forEach((it) => {
      if (!seen.has(it.productId)) {
        seen.add(it.productId);
        res.push(it);
      }
    });
    return res;
  }, [activeFilter, secretItems, publicItems]);

  // Helper to format remaining time badge
  const formatRemainingCountdown = (expiryMs?: number) => {
    if (!expiryMs || expiryMs <= 0) return "상시 진행 특가";
    const diffMs = expiryMs - nowTick;
    if (diffMs <= 0) return "종료 마감";
    const totalSec = Math.floor(diffMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (d > 0) {
      return `D-${d} ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1A17] via-[#24211D] to-[#151311] border border-[#C5A880]/35 shadow-xl text-white p-6 sm:p-8 space-y-6">
      {/* Decorative ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>MEMBERSHIP EXCLUSIVE PROMOTIONS</span>
            </span>
            <span className="bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {userGrade} 등급 전용
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-white flex items-center gap-2">
            <span>회원 전용 프로모션 & 실시간 타임세일</span>
          </h2>
          <p className="text-xs sm:text-[13px] text-neutral-300 font-medium">
            회원님께만 특별히 제공되는 시크릿 할인 및 실시간 라이브 특가 상품 컬렉션입니다.
          </p>
        </div>

        {/* Tab Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-white text-neutral-950 shadow-md"
                : "text-neutral-300 hover:text-white"
            }`}
          >
            전체 혜택 ({totalBenefitCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("secret")}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeFilter === "secret"
                ? "bg-amber-400 text-neutral-950 shadow-md"
                : "text-amber-300/80 hover:text-amber-300"
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>시크릿 세일 ({secretItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("public")}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeFilter === "public"
                ? "bg-rose-500 text-white shadow-md"
                : "text-rose-300/80 hover:text-rose-300"
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>타임세일 특가 ({publicItems.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content: Products Grid or Empty State */}
      <div className="relative z-10">
        {displayedItems.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white">
              {activeFilter === "secret"
                ? `현재 진행 중인 ${userGrade} 회원 전용 시크릿 세일이 없습니다.`
                : activeFilter === "public"
                ? "현재 진행 중인 일반 타임세일 상품이 없습니다."
                : "회원 전용 프로모션 상품이 준비 중입니다."}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              {activeFilter === "secret"
                ? "VIP/VVIP 회원 전용 프라이빗 세일이 오픈되면 여기에 가장 먼저 노출됩니다."
                : "초이콤마의 다양한 신상품과 베스트 컬렉션을 쇼핑홈에서 둘러보세요."}
            </p>
            {activeFilter === "secret" && publicItems.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter("public")}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-colors cursor-pointer"
                >
                  🔥 실시간 타임세일 특가 보기 ({publicItems.length})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {displayedItems.map((item) => {
              const countdown = formatRemainingCountdown(item.expiryMs);

              return (
                <div
                  key={item.id}
                  className="group relative bg-[#2A2622]/90 hover:bg-[#322D28] rounded-2xl border border-white/10 hover:border-amber-400/60 p-3.5 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-900 mb-3 border border-white/5">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Top Badges Overlay */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 ${
                          item.type === "secret"
                            ? "bg-amber-500 text-neutral-950 border border-amber-300"
                            : "bg-rose-600 text-white border border-rose-400"
                        }`}
                      >
                        {item.type === "secret" ? <Lock className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                        <span>{item.discountRate}% OFF</span>
                      </span>

                      {item.type === "secret" && item.targetGrade && (
                        <span className="text-[9px] font-bold bg-black/75 backdrop-blur-md text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
                          {item.targetGrade}
                        </span>
                      )}
                    </div>

                    {/* Bottom Countdown Timer Bar */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2.5 pt-4 text-center z-10 pointer-events-none">
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-black text-amber-300 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-400/30 backdrop-blur-xs shadow-xs">
                        <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span>{countdown}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Info & Pricing */}
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-amber-400/90 tracking-wider uppercase">
                          {item.type === "secret" ? "VIP SECRET SELECTION" : "LIVE TIME SALE"}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-200 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-400 line-through">
                          {item.originalPrice.toLocaleString()}원
                        </span>
                        {item.savings > 0 && (
                          <span className="text-[11px] font-bold text-rose-300 font-sans">
                            -{item.savings.toLocaleString()}원 절약
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-bold text-amber-400">특가 판매가</span>
                        <span className="text-lg font-black font-mono text-amber-300">
                          {item.salePrice.toLocaleString()}
                          <span className="text-xs font-bold font-sans ml-0.5">원</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Add to Cart & View Detail */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onAddToCart) {
                            onAddToCart(item.product, item.salePrice);
                          }
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>장바구니 담기</span>
                      </button>

                      <Link
                        href={`/product/${item.productHandle || item.productId}`}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer flex items-center justify-center"
                        title="상품 상세페이지 보기"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-300" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer Info Note */}
      <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>시크릿 타임세일은 회원 등급 권한이 있는 고객에게만 결제 시 특가 할인율이 자동 적용됩니다.</span>
        </span>
        <Link
          href="/shop/timesale"
          className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          <span>타임세일 전체 매장 바로가기</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
