"use client";

import React from "react";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";

interface MainPageManagementProps {
  productsList: any[];
  openImageUploadModal: (heroProduct?: any) => void;
  handleRemoveHeroSlide: (productId: string) => void;
}

export function MainPageManagement({
  productsList,
  openImageUploadModal,
  handleRemoveHeroSlide,
}: MainPageManagementProps) {
  const heroProducts = productsList.filter((p) => p.isHeroFeatured === true);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500 text-neutral-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              HERO SLIDER IMAGE CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-950">메인 이미지 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            쇼핑몰 최상단 배너 슬라이더에 노출할 배너 이미지를 직접 지정하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openImageUploadModal()}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 border border-amber-400"
          >
            <ImageIcon className="w-4 h-4" />
            🖼️ 슬라이드 이미지 추가
          </button>
        </div>
      </div>

      {/* SECTION 1: SLIDER IMAGE MANAGEMENT */}
      <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-300/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                🖼️ HERO SLIDER IMAGES
              </span>
            </div>
            <h2 className="text-xl font-black text-neutral-950">
              메인 이미지 관리
            </h2>
            <p className="text-xs text-neutral-700 mt-1 font-medium">
              홈페이지 최상단 대형 메인 슬라이더 영역에 노출될 <strong>슬라이드 이미지</strong>를 지정하고 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openImageUploadModal()}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 border border-amber-400"
            >
              <ImageIcon className="w-4 h-4" />
              🖼️ 슬라이드 이미지 등록
            </button>
          </div>
        </div>

        {/* Hero Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heroProducts.map((heroProduct, index) => {
            const displayImg = heroProduct.heroCustomImage || heroProduct.featuredImage?.url || "/product_1.webp";

            return (
              <div
                key={heroProduct.id}
                className="bg-white border-2 border-amber-400 rounded-3xl p-5 shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide bg-amber-500 text-neutral-950 shadow-2xs">
                      슬라이드 #{index + 1}
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                      메인 배너 이미지
                    </span>
                  </div>

                  <div className="relative aspect-[16/9] w-full rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200 shadow-2xs">
                    <img
                      src={displayImg}
                      alt={`슬라이드 ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => openImageUploadModal(heroProduct)}
                    className="bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 font-extrabold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>🖼️ 이미지 변경</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveHeroSlide(heroProduct.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-black text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>✕ 이미지 삭제</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Slide Image Card */}
          <button
            type="button"
            onClick={() => openImageUploadModal()}
            className="bg-white/90 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-3xl p-6 transition-all flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer hover:bg-amber-50/50 hover:scale-[1.01] active:scale-95 shadow-2xs min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center transition-colors shadow-xs group-hover:scale-110">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                🖼️ 슬라이드 이미지 추가
              </span>
              <h4 className="font-black text-sm text-neutral-950 mt-1.5 group-hover:text-amber-700 transition-colors">
                새로운 메인 배너 이미지 등록
              </h4>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
