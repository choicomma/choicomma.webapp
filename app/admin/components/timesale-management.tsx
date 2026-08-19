"use client";

import React from "react";
import { Gift, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";

interface TimesaleManagementProps {
  setSalesList: any[];
  productsList: any[];
  setIsSetModalOpen: (val: boolean) => void;
  handleToggleSetStatus: (id: string) => void;
  handleDeleteSetBundle: (id: string) => void;
}

export function TimesaleManagement({
  setSalesList,
  productsList,
  setIsSetModalOpen,
  handleToggleSetStatus,
  handleDeleteSetBundle,
}: TimesaleManagementProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-amber-500 text-neutral-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            PROMOTION & SALES MANAGEMENT
          </span>
        </div>
        <h1 className="text-2xl font-black text-neutral-950">세트아이템</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          프로모션 기획전 및 세트 아이템 할인 행사를 관리합니다.
        </p>
      </div>

      {/* SET ITEM SALE MANAGEMENT SECTION */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-amber-100/40 border border-amber-300/80 rounded-3xl p-7 md:p-9 shadow-sm space-y-7 text-neutral-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-amber-200/80">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 rounded-2xl text-neutral-950 shadow-md border border-amber-300/60 shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-neutral-950 font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wide border border-amber-300/60 shadow-2xs">
                  {setSalesList.filter((s: any) => s.status === "active").length}개 세트 세일 진행중
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-neutral-950">세트아이템 할인 기획전 설정</h2>
              <p className="text-xs text-neutral-600 mt-1">
                2개 이상의 상품을 패키지 세트로 묶고 세트 단독 할인가를 설정할 수 있습니다.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSetModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-black px-5 py-3 rounded-2xl transition-all shadow-md text-xs border border-amber-400/50 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            새 세트 할인 설정
          </button>
        </div>

        {/* Active Set Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
          {setSalesList.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-neutral-500 text-sm bg-white/80 rounded-3xl border border-amber-200/60">
              등록된 세트 아이템 할인이 없습니다. 오른쪽 상단의 '새 세트 할인 설정' 버튼을 눌러 추가하세요.
            </div>
          ) : (
            setSalesList.map((set: any) => {
              const setItemEntries: { prod: any; qty: number }[] = set.items
                ? set.items
                    .map((item: any) => {
                      const prod = productsList.find((p) => p.id === item.productId);
                      return prod ? { prod, qty: item.quantity || 1 } : null;
                    })
                    .filter(Boolean)
                : (set.productIds || [])
                    .map((id: string) => {
                      const prod = productsList.find((p) => p.id === id);
                      return prod ? { prod, qty: 1 } : null;
                    })
                    .filter(Boolean);

              const originalTotal = setItemEntries.reduce(
                (sum, entry) =>
                  sum + (parseFloat(entry.prod.priceRange.minVariantPrice.amount) || 0) * entry.qty,
                0
              );
              const discountedTotal = Math.round(originalTotal * (1 - set.discountRate / 100));

              return (
                <div
                  key={set.id}
                  className="bg-white border border-amber-200/90 hover:border-amber-400 p-6 md:p-7 rounded-3xl flex flex-col justify-between gap-6 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
                      <h4 className="font-extrabold text-base md:text-lg text-neutral-950 leading-snug line-clamp-2">
                        {set.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-black px-2.5 py-1 rounded-lg">
                          {set.discountRate}% OFF
                        </span>
                        <button
                          onClick={() => handleToggleSetStatus(set.id)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                            set.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                              : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                          }`}
                        >
                          {set.status === "active" ? "진행중" : "일시정지"}
                        </button>
                      </div>
                    </div>

                    <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-200/60 my-3 flex items-center gap-2.5 overflow-x-auto">
                      {setItemEntries.map((entry, idx) => (
                        <React.Fragment key={entry.prod.id}>
                          {idx > 0 && <span className="text-amber-600 font-black text-sm px-1">+</span>}
                          <div className="flex items-center gap-2.5 bg-white p-2 pr-3.5 rounded-xl border border-neutral-200/80 shrink-0 shadow-2xs">
                            <div className="w-10 h-12 relative rounded-lg overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
                              <img
                                src={entry.prod.featuredImage?.url || "/product_1.webp"}
                                alt={entry.prod.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-xs leading-tight max-w-[130px] truncate">
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="font-bold text-neutral-900 truncate">{entry.prod.title}</p>
                                {entry.qty > 1 && (
                                  <span className="bg-neutral-900 text-white text-[10px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                                    x{entry.qty}
                                  </span>
                                )}
                              </div>
                              <p className="text-neutral-500 text-[11px] font-mono">
                                {formatPrice(entry.prod.priceRange.minVariantPrice.amount)}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-4 mt-2">
                    <div>
                      <span className="text-xs text-neutral-400 line-through font-mono font-medium block mb-0.5">
                        개별 정가 {formatPrice(originalTotal.toString())}
                      </span>
                      <span className="text-base md:text-lg font-black text-amber-950 font-mono tracking-tight block">
                        세트가 {formatPrice(discountedTotal.toString())}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSetBundle(set.id)}
                      className="text-xs text-neutral-500 hover:text-rose-600 font-bold bg-neutral-100 hover:bg-rose-50 border border-neutral-200 hover:border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
