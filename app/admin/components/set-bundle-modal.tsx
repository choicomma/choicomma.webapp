"use client";

import React, { useState } from "react";
import { Gift, X, Search, Check } from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { CATEGORIES_LIST } from "@/lib/admin/constants";

interface SetBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsList: any[];
  setSalesList?: any[];
  setSetSalesList?: React.Dispatch<React.SetStateAction<any[]>>;
  setAdminTimeSaleProductIds?: React.Dispatch<React.SetStateAction<string[]>>;
  triggerToast?: (msg: string) => void;
}

export function SetBundleModal({
  isOpen,
  onClose,
  productsList,
  setSalesList = [],
  setSetSalesList,
  setAdminTimeSaleProductIds,
  triggerToast = () => {},
}: SetBundleModalProps) {
  const [setBundleTitle, setSetBundleTitle] = useState("");
  const [selectedSetProductIds, setSelectedSetProductIds] = useState<string[]>([]);
  const [setProductQuantities, setSetProductQuantities] = useState<Record<string, number>>({
    "outer-product-1": 1,
    "outer-product-27": 1,
  });
  const [setModalCategoryFilter, setSetModalCategoryFilter] = useState("all");
  const [setDiscountRate, setSetDiscountRate] = useState<number>(20);
  const [setBundleStatus, setSetBundleStatus] = useState<"active" | "paused">("active");
  const [setProductSearchQuery, setSetProductSearchQuery] = useState("");

  if (!isOpen) return null;

  const handleToggleProductInSet = (productId: string) => {
    setSelectedSetProductIds((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        const next = prev.filter((id) => id !== productId);
        setSetProductQuantities((qPrev) => {
          const qNext = { ...qPrev };
          delete qNext[productId];
          return qNext;
        });
        return next;
      } else {
        setSetProductQuantities((qPrev) => ({ ...qPrev, [productId]: 1 }));
        return [...prev, productId];
      }
    });
  };

  const handleUpdateProductQuantityInSet = (productId: string, delta: number) => {
    setSetProductQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleSaveSetBundle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setBundleTitle.trim()) {
      triggerToast("세트 아이템 기획전 제목을 입력해 주세요.");
      return;
    }
    if (selectedSetProductIds.length < 1) {
      triggerToast("세트 할인을 위해 최소 1개 이상의 상품을 선택해 주세요.");
      return;
    }

    const items = selectedSetProductIds.map((id) => ({
      productId: id,
      quantity: setProductQuantities[id] || 1,
    }));

    const newSet = {
      id: `SET-${Date.now()}`,
      title: setBundleTitle,
      items,
      discountRate: setDiscountRate,
      status: setBundleStatus,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newSet, ...setSalesList];
    setSetSalesList?.(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_set_sales", JSON.stringify(updated));

      // Auto-register to secret_timesale_product_ids for SPECIAL category exposure
      const setProdId = `set-product-${newSet.id}`;
      let savedIds: string[] = [];
      const saved = localStorage.getItem("secret_timesale_product_ids");
      if (saved) {
        try {
          savedIds = JSON.parse(saved);
        } catch (e) {}
      }
      if (!savedIds.includes(setProdId)) {
        const updatedIds = [setProdId, ...savedIds];
        setAdminTimeSaleProductIds?.(updatedIds);
        localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
      }

      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("admin_set_sales_updated"));
    }

    onClose();
    setSetBundleTitle("");
    setSelectedSetProductIds([]);
    setSetProductQuantities({});
    setSetDiscountRate(20);
    triggerToast(`새 세트 할인 상품 '${setBundleTitle}'이(가) SPECIAL 카테고리에 즉시 노출되도록 등록되었습니다!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white text-neutral-950 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-neutral-950 rounded-xl font-bold">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">세트 아이템 할인 기획전 등록</h3>
              <p className="text-xs text-neutral-400">조합할 상품 2개 이상을 선택하고 할인율을 설정해 주세요.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSaveSetBundle} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Set Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700">세트 기획전 명칭</label>
            <input
              type="text"
              required
              placeholder="예: [초이콤마 룩북 세트] 코트 + 블레이저 패키지 25% OFF"
              value={setBundleTitle}
              onChange={(e) => setSetBundleTitle(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:border-black"
            />
          </div>

          {/* Discount Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-700">세트 할인율 설정</span>
              <span className="text-amber-600 font-extrabold text-sm">{setDiscountRate}% 할인 적용</span>
            </div>
            <div className="flex gap-2">
              {[15, 20, 25, 30, 35, 40, 50].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSetDiscountRate(rate)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    setDiscountRate === rate
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                      : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Product Selection List with Category Filter & Quantity Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-700">세트 구성 상품 & 수량 선택</span>
              <span className="text-neutral-500 font-mono">
                {selectedSetProductIds.length}개 상품 선택됨 (총 {Object.values(setProductQuantities).reduce((a, b) => a + b, 0)}개)
              </span>
            </div>

            {/* Category Filter & Search Header */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="상품명 검색..."
                  value={setProductSearchQuery}
                  onChange={(e) => setSetProductSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
              <select
                value={setModalCategoryFilter}
                onChange={(e) => setSetModalCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
              >
                <option value="all">전체 카테고리</option>
                {CATEGORIES_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtered Products List */}
            <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-2xl divide-y divide-neutral-100 p-2 bg-neutral-50">
              {productsList
                .filter((p) => {
                  const matchCategory =
                    setModalCategoryFilter === "all" || p.categoryId === setModalCategoryFilter;
                  const matchQuery =
                    !setProductSearchQuery ||
                    p.title.toLowerCase().includes(setProductSearchQuery.toLowerCase());
                  return matchCategory && matchQuery;
                })
                .map((p) => {
                  const isChecked = selectedSetProductIds.includes(p.id);
                  const qty = setProductQuantities[p.id] || 1;
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                        isChecked ? "bg-amber-50/90 border border-amber-300 shadow-2xs" : "hover:bg-neutral-100"
                      }`}
                    >
                      <div
                        onClick={() => handleToggleProductInSet(p.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isChecked ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="w-9 h-11 relative rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                          <img
                            src={p.featuredImage?.url || "/product_1.webp"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-neutral-900 truncate">{p.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase">
                              {p.categoryId}
                            </span>
                            <span className="text-[11px] font-extrabold text-neutral-900">
                              {formatPrice(p.priceRange?.minVariantPrice?.amount || p.price?.amount || "0")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Selector Counter */}
                      {isChecked && (
                        <div
                          className="flex items-center gap-1.5 bg-white border border-amber-300 p-1 rounded-xl shadow-2xs shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQuantityInSet(p.id, -1)}
                            className="size-6 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 flex items-center justify-center font-black text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQuantityInSet(p.id, 1)}
                            className="size-6 rounded-lg bg-neutral-950 hover:bg-black text-white flex items-center justify-center font-black text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Real-time Calculation Summary with Quantities */}
          {selectedSetProductIds.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-600">
                <span>선택 상품 (수량 포함) 개별 정가 합계</span>
                <span className="line-through font-mono font-bold">
                  {formatPrice(
                    selectedSetProductIds
                      .reduce((sum, id) => {
                        const p = productsList.find((item) => item.id === id);
                        const qty = setProductQuantities[id] || 1;
                        return sum + parseFloat(p?.priceRange?.minVariantPrice?.amount || p?.price?.amount || "0") * qty;
                      }, 0)
                      .toString()
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-amber-950 pt-1.5 border-t border-amber-200/60">
                <span>세트 최종 할인가 ({setDiscountRate}% 적용)</span>
                <span className="text-base text-amber-700">
                  {formatPrice(
                    Math.round(
                      selectedSetProductIds.reduce((sum, id) => {
                        const p = productsList.find((item) => item.id === id);
                        const qty = setProductQuantities[id] || 1;
                        return sum + parseFloat(p?.priceRange?.minVariantPrice?.amount || p?.price?.amount || "0") * qty;
                      }, 0) *
                        (1 - setDiscountRate / 100)
                    ).toString()
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Modal Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-sm text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
            >
              세트 할인 등록 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
