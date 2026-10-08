"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  X,
  Search,
  Filter,
  Pencil,
  ExternalLink,
  FileSpreadsheet,
  Download,
  AlertCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  GripVertical,
  Box,
  Sparkles,
  Star,
  EyeOff,
  Layers,
  Clock,
  Check,
  ArrowUpToLine,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import * as XLSX from "xlsx";

const DEFAULT_COLOR_HEX_MAP: Record<string, string> = {
  BLACK: "#000000",
  CREAM: "#FDFBF7",
  CHARCOAL: "#36454F",
  NAVY: "#000080",
  BEIGE: "#F5F5DC",
  WHITE: "#FFFFFF",
  BROWN: "#8B4513",
  RED: "#DC2626",
  BLUE: "#2563EB",
  GREEN: "#16A34A",
  KHAKI: "#708090",
  PINK: "#EC4899",
};

const DEFAULT_SIZE_MEASUREMENTS = [
  { name: "어깨단면", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
  { name: "가슴단면", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
  { name: "팔길이", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
  { name: "총장", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
];

interface ProductsManagementProps {
  productsList: any[];
  filteredProducts: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (val: string) => void;
  productSortOrder: "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom";
  setProductSortOrder: (val: any) => void;
  categoriesList: any[];
  getProductStock: (product: any) => number;
  getProductNo: (product: any) => string | number;
  handleClearAllProducts: () => void;
  handleRestoreDefaultProducts?: () => void;
  handleOpenEditModal: (product: any) => void;
  handleDeleteProduct: (id: string, title: string) => void;
  toggleStock: (id: string) => void;
  toggleMainFeatured: (id: string) => void;
  setIsAddModalOpen: (val: boolean) => void;
  setNewTitle?: (val: string) => void;
  setNewPrice?: (val: string) => void;
  setNewDescription?: (val: string) => void;
  setNewDetailDescription?: (val: string) => void;
  setNewImageUrl?: (val: string) => void;
  setNewImages?: (val: string[]) => void;
  setNewUrlInput?: (val: string) => void;
  setNewFabricImage?: (val: string) => void;
  setNewColors?: (val: string[]) => void;
  setNewIsTimeSale?: (val: boolean) => void;
  setNewTimeSaleHours?: (val: string) => void;
  setNewTimeSaleMinutes?: (val: string) => void;
  handleBulkAddProducts?: (newProducts: any[]) => void;
  handleMoveProduct?: (id: string, direction: "up" | "down") => void;
  handleBulkDeleteProducts?: (targetIds: string[]) => void;
  handleBulkUpdateMainFeatured?: (targetIds: string[], isFeatured: boolean) => void;
  handleBulkUpdateStock?: (targetIds: string[], stockQty: number) => void;
  toggleProductPurchasable?: (id: string) => void;
  handleReorderProducts?: (fromId: string, toId: string, showToast?: boolean) => void;
  handleMoveProductToTop?: (id: string) => void;
  handleBulkMoveToTop?: (targetIds: string[]) => void;
  handleQuickUpdateCategory?: (id: string, newCategory: string) => void;
  handleQuickUpdatePrice?: (id: string, newPrice: number | string) => boolean | void;
  handleQuickUpdateStock?: (id: string, newTotalStock: number, newSizeStock?: Record<string, number>) => boolean | void;
  handleQuickUpdateReleaseSchedule?: (id: string, availableForSale: boolean, releaseDate?: string) => void;
}

function StockPopover({
  product,
  currentStock,
  onSaveStock,
  onClose,
}: {
  product: any;
  currentStock: number;
  onSaveStock: (newTotal: number, newSizeStock?: Record<string, number>) => void;
  onClose: () => void;
}) {
  const colors: string[] = Array.isArray(product.colors) ? product.colors : [];
  const sizes: string[] = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ["FREE"];
  const colorHexMap = product.colorHexMap || DEFAULT_COLOR_HEX_MAP;

  // Track raw string values for inputs so user can easily backspace/type
  const [sizeStock, setSizeStock] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (colors.length > 0) {
      const totalCombos = colors.length * sizes.length;
      const baseShare = Math.max(0, Math.floor((currentStock || 0) / Math.max(1, totalCombos)));
      let remainder = Math.max(0, (currentStock || 0) - baseShare * totalCombos);

      colors.forEach((c) => {
        sizes.forEach((s) => {
          const key = `${c}-${s}`;
          if (product.sizeStock?.[key] !== undefined) {
            initial[key] = String(product.sizeStock[key]);
          } else {
            const alloc = baseShare + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder -= 1;
            initial[key] = String(alloc);
          }
        });
      });
    } else if (sizes.length > 0) {
      const totalSizes = sizes.length;
      const baseShare = Math.max(0, Math.floor((currentStock || 0) / totalSizes));
      let remainder = Math.max(0, (currentStock || 0) - baseShare * totalSizes);

      sizes.forEach((s) => {
        if (product.sizeStock?.[s] !== undefined) {
          initial[s] = String(product.sizeStock[s]);
        } else {
          const alloc = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          initial[s] = String(alloc);
        }
      });
    }
    return initial;
  });

  const [singleStock, setSingleStock] = useState<string>(String(currentStock || 0));

  const hasOptions = colors.length > 0 || (sizes.length > 0 && !(sizes.length === 1 && sizes[0] === "FREE" && colors.length === 0));

  // Compute total numeric sum
  const calculatedTotal = hasOptions
    ? Object.values(sizeStock).reduce((sum, val) => sum + (parseInt(String(val).replace(/[^0-9]/g, ""), 10) || 0), 0)
    : (parseInt(String(singleStock).replace(/[^0-9]/g, ""), 10) || 0);

  const handleCommit = () => {
    if (calculatedTotal === 0) {
      const isConfirmed = window.confirm(
        `[${product.title}]\n재고 수량이 0개입니다. 해당 상품을 [품절] 처리하시겠습니까?`
      );
      if (!isConfirmed) return;
    }

    const numericSizeStock: Record<string, number> = {};
    if (hasOptions) {
      Object.entries(sizeStock).forEach(([k, v]) => {
        numericSizeStock[k] = parseInt(String(v).replace(/[^0-9]/g, ""), 10) || 0;
      });
    }

    onSaveStock(calculatedTotal, hasOptions ? numericSizeStock : undefined);
    onClose();
  };

  return (
    <div
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute top-full right-0 mt-2 z-50 bg-white border border-neutral-300 rounded-2xl shadow-2xl p-4 w-80 text-left animate-in fade-in zoom-in-95 duration-150 select-text cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-xs font-black text-neutral-900 truncate">
            {product.productCode || "CC-000"} 재고 설정
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Case 1: Colors & Sizes */}
      {colors.length > 0 ? (
        <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 text-xs">
          {colors.map((color) => {
            const hex = colorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
            return (
              <div key={color} className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-[11px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-neutral-300 inline-block shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span>{color}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {sizes.map((size) => {
                    const key = `${color}-${size}`;
                    const qtyStr = sizeStock[key] ?? "0";
                    return (
                      <div key={key} className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-neutral-600">{size}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          draggable={false}
                          onDragStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onFocus={(e) => e.target.select()}
                          value={qtyStr}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setSizeStock((prev) => ({ ...prev, [key]: raw }));
                          }}
                          className="w-14 text-right font-mono font-bold text-xs bg-neutral-50 border border-neutral-300 rounded px-1.5 py-0.5 focus:outline-none focus:bg-white focus:border-neutral-950 text-neutral-950 select-text cursor-text"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : sizes.length > 0 ? (
        /* Body: Case 2: Sizes Only (Including FREE size) */
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            {sizes.map((size) => {
              const qtyStr = sizeStock[size] ?? singleStock ?? "0";
              return (
                <div key={size} className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] font-extrabold text-neutral-800 bg-white px-1.5 py-0.5 rounded border border-neutral-200">{size}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    draggable={false}
                    onDragStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.target.select()}
                    value={qtyStr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setSizeStock((prev) => ({ ...prev, [size]: raw }));
                      if (sizes.length === 1) setSingleStock(raw);
                    }}
                    className="w-14 text-right font-mono font-bold text-xs bg-white border border-neutral-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-neutral-950 text-neutral-950 select-text cursor-text"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Body: Case 3: Single Item (Default to FREE size display) */
        <div className="space-y-1.5 py-1 text-xs">
          <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
            <span className="text-[11px] font-extrabold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">FREE</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                draggable={false}
                onDragStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.target.select()}
                value={singleStock}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setSingleStock(raw);
                  setSizeStock({ FREE: raw });
                }}
                className="w-16 text-right font-mono font-bold text-xs bg-white border border-neutral-300 rounded-lg px-2 py-1 focus:outline-none focus:border-neutral-950 text-neutral-950 select-text cursor-text"
              />
              <span className="text-xs font-bold text-neutral-500">개</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Total & Actions */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
        <div className="text-xs">
          <span className="text-neutral-500 text-[10px] block font-bold">합계 재고</span>
          <span className={`font-mono font-black text-sm ${calculatedTotal > 0 ? "text-blue-700" : "text-rose-600"}`}>
            {calculatedTotal}개 {calculatedTotal === 0 && "(품절)"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCommit}
          className="px-4 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
        >
          저장
        </button>
      </div>
    </div>
  );
}

function TimeSettingPopover({
  product,
  onSaveSchedule,
  onClose,
}: {
  product: any;
  onSaveSchedule: (availableForSale: boolean, releaseDate?: string) => void;
  onClose: () => void;
}) {
  const [available, setAvailable] = useState<boolean>(product.availableForSale !== false);
  const [isScheduled, setIsScheduled] = useState<boolean>(Boolean(product.releaseDate));
  const [releaseDate, setReleaseDate] = useState<string>(product.releaseDate || "");

  useEffect(() => {
    setAvailable(product.availableForSale !== false);
    setIsScheduled(Boolean(product.releaseDate));
    setReleaseDate(product.releaseDate || "");
  }, [product.availableForSale, product.releaseDate]);

  const handleApplyPreset = (preset: "tomorrow10" | "today18" | "day3_10" | "day7_10") => {
    setIsScheduled(true);
    const d = new Date();
    if (preset === "tomorrow10") {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    } else if (preset === "today18") {
      d.setHours(18, 0, 0, 0);
    } else if (preset === "day3_10") {
      d.setDate(d.getDate() + 3);
      d.setHours(10, 0, 0, 0);
    } else if (preset === "day7_10") {
      d.setDate(d.getDate() + 7);
      d.setHours(10, 0, 0, 0);
    }
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setReleaseDate(iso);
  };

  const handleClearSchedule = () => {
    setIsScheduled(false);
    setReleaseDate("");
    onSaveSchedule(available, undefined);
  };

  const handleSave = () => {
    const finalDate = isScheduled && releaseDate ? releaseDate : undefined;
    onSaveSchedule(available, finalDate);
    onClose();
  };

  const isFuture = releaseDate && new Date(releaseDate).getTime() > Date.now();

  return (
    <div
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute top-full right-0 mt-2 z-50 bg-white border border-neutral-300 rounded-2xl shadow-2xl p-4 w-84 text-left animate-in fade-in zoom-in-95 duration-150 select-text cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-black text-neutral-900 truncate">
            {product.productCode || "상품"} 판매 시간 &amp; ON/OFF 설정
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: 1. Purchase ON / OFF Status */}
      <div className="mb-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-neutral-900">상품 구매 가능 상태</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${available ? "bg-blue-100 text-blue-800" : "bg-neutral-200 text-neutral-700"}`}>
            {available ? "ON (구매 가능)" : "OFF (구매 불가)"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAvailable(true);
              const finalDate = isScheduled && releaseDate ? releaseDate : undefined;
              onSaveSchedule(true, finalDate);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
              available
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${available ? "bg-white animate-pulse" : "bg-neutral-400"}`} />
            <span>ON (구매 가능)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAvailable(false);
              const finalDate = isScheduled && releaseDate ? releaseDate : undefined;
              onSaveSchedule(false, finalDate);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
              !available
                ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${!available ? "bg-rose-400" : "bg-neutral-400"}`} />
            <span>OFF (구매 불가)</span>
          </button>
        </div>
        <p className="text-[10px] text-neutral-500 leading-tight">
          * OFF 시 쇼핑몰 화면에서 구매/장바구니 담기가 차단됩니다.
        </p>
      </div>

      {/* Body: 2. Scheduled Release Time */}
      <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 space-y-2.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsScheduled(checked);
              if (checked && !releaseDate) {
                handleApplyPreset("tomorrow10");
              }
            }}
            className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-950 accent-neutral-950 cursor-pointer"
          />
          <span className="text-xs font-black text-neutral-900">판매 시작 시간 지정 (예약 오픈)</span>
        </label>

        {isScheduled && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-150">
            <input
              type="datetime-local"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950 shadow-2xs"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleApplyPreset("today18")}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 hover:border-amber-400 text-neutral-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                오늘 18시
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("tomorrow10")}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 hover:border-amber-400 text-neutral-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                내일 10시
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("day3_10")}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 hover:border-amber-400 text-neutral-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                3일 뒤 10시
              </button>
              <button
                type="button"
                onClick={handleClearSchedule}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 hover:border-rose-400 text-rose-700 transition-colors cursor-pointer ml-auto"
              >
                해제 (즉시 오픈)
              </button>
            </div>

            {/* Status explanation */}
            {releaseDate && (
              <div className="text-[10px] font-bold leading-tight">
                {isFuture ? (
                  <span className="text-amber-800 flex items-center gap-1">
                    ⏰ {new Date(releaseDate).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}에 자동 구매 오픈
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    ✓ 설정된 시간이 이미 지나 현재 즉시 구매 가능 상태입니다.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-3.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-neutral-500 hover:text-neutral-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="text-xs font-black text-white bg-neutral-950 hover:bg-black px-4 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>시간 설정 저장</span>
        </button>
      </div>
    </div>
  );
}

function TablePriceInput({
  initialPrice,
  onSavePrice,
}: {
  initialPrice: number | string;
  onSavePrice: (val: string) => boolean | void;
}) {
  const formatComma = (v: number | string) => {
    const num = String(v).replace(/[^0-9]/g, "");
    return num ? Number(num).toLocaleString() : "0";
  };

  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(formatComma(initialPrice || 0));
  const inputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setVal(formatComma(initialPrice || 0));
  }, [initialPrice]);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    const rawVal = val.replace(/[^0-9]/g, "");
    const rawOrig = String(initialPrice || 0).replace(/[^0-9]/g, "");
    if (rawVal !== rawOrig) {
      const isSuccess = onSavePrice(rawVal);
      if (isSuccess === false) {
        setVal(formatComma(initialPrice || 0));
      }
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="group/price inline-flex items-center justify-start font-sans font-bold text-neutral-900 hover:text-neutral-950 text-xs py-1 px-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer text-left"
        title="클릭하여 판매가 수정"
      >
        <span>{formatComma(initialPrice || 0)}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={val}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setVal(raw ? Number(raw).toLocaleString() : "");
        }}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setVal(formatComma(initialPrice || 0));
            setIsEditing(false);
          }
        }}
        className="w-32 bg-white border border-neutral-300 hover:border-neutral-400 focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 rounded-xl px-3 py-1 font-bold text-neutral-950 font-sans text-xs text-right transition-all shadow-xs cursor-text outline-none"
        title="판매가를 입력 후 Enter 또는 바깥 클릭 시 수정 (ESC: 취소)"
      />
      <span className="text-xs font-bold text-neutral-400 select-none">원</span>
    </div>
  );
}

export function ProductsManagement({
  productsList,
  filteredProducts,
  searchQuery,
  setSearchQuery,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  productSortOrder,
  setProductSortOrder,
  categoriesList,
  getProductStock,
  getProductNo,
  handleClearAllProducts,
  handleRestoreDefaultProducts,
  handleOpenEditModal,
  handleDeleteProduct,
  toggleStock,
  toggleMainFeatured,
  setIsAddModalOpen,
  setNewTitle,
  setNewPrice,
  setNewDescription,
  setNewDetailDescription,
  setNewImageUrl,
  setNewImages,
  setNewUrlInput,
  setNewFabricImage,
  setNewColors,
  setNewIsTimeSale,
  setNewTimeSaleHours,
  setNewTimeSaleMinutes,
  handleBulkAddProducts,
  handleMoveProduct,
  handleBulkDeleteProducts,
  handleBulkUpdateMainFeatured,
  handleBulkUpdateStock,
  toggleProductPurchasable,
  handleReorderProducts,
  handleMoveProductToTop,
  handleBulkMoveToTop,
  handleQuickUpdateCategory,
  handleQuickUpdatePrice,
  handleQuickUpdateStock,
  handleQuickUpdateReleaseSchedule,
}: ProductsManagementProps) {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewItems, setExcelPreviewItems] = useState<any[]>([]);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  // Active Stock Popover Product ID
  const [activeStockPopoverId, setActiveStockPopoverId] = useState<string | null>(null);

  // Active Time Setting Popover Product ID
  const [activeTimePopoverId, setActiveTimePopoverId] = useState<string | null>(null);

  // Drag & Drop Reordering State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Top Metric Cards Filter State ("all" | "active" | "main_featured" | "sold_out")
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<"all" | "active" | "main_featured" | "sold_out">("all");

  const displayedProducts = useMemo(() => {
    let list = filteredProducts;

    if (selectedMetricFilter === "active") {
      list = list.filter((p) => p.availableForSale !== false && getProductStock(p) > 0);
    } else if (selectedMetricFilter === "main_featured") {
      list = list.filter((p) => Boolean(p.isMainFeatured));
    } else if (selectedMetricFilter === "sold_out") {
      list = list.filter((p) => p.availableForSale === false || getProductStock(p) === 0);
    }

    return list;
  }, [filteredProducts, selectedMetricFilter, getProductStock]);

  // Pagination State (Default: 10 per page as requested by user)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalItems = displayedProducts.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset page to 1 when filter/search/metric/pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryFilter, selectedMetricFilter, pageSize]);

  // Keep currentPage inside valid range
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    if (pageSize === -1) return displayedProducts;
    const start = (currentPage - 1) * pageSize;
    return displayedProducts.slice(start, start + pageSize);
  }, [displayedProducts, currentPage, pageSize]);

  // Smart Page Numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const isCurrentPageAllSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProductIds.includes(String(p.id)));

  const handleSelectAllCurrentPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageIds = paginatedProducts.map((p) => String(p.id));
    if (e.target.checked) {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(pageIds);
      setSelectedProductIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Prune deleted IDs from selectedProductIds when productsList changes (Bug 6 fix)
  useEffect(() => {
    if (selectedProductIds.length === 0) return;
    const existingIdSet = new Set(productsList.map((p) => String(p.id)));
    setSelectedProductIds((prev) => {
      const filtered = prev.filter((id) => existingIdSet.has(id));
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [productsList, selectedProductIds.length]);

  const [isBulkActionMenuOpen, setIsBulkActionMenuOpen] = useState(false);

  const handleExecuteBulkDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkDeleteProducts) {
      handleBulkDeleteProducts(selectedProductIds);
      setSelectedProductIds([]);
    } else {
      const isConfirmed = window.confirm(
        `정말로 선택한 ${selectedProductIds.length}개의 상품을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
      );
      if (!isConfirmed) return;
      const idsToDelete = [...selectedProductIds];
      idsToDelete.forEach((id) => handleDeleteProduct(id, ""));
      setSelectedProductIds([]);
    }
    setIsBulkActionMenuOpen(false);
  };

  // Bulk Register Main Featured (Single Batch Update)
  const handleExecuteBulkMainFeatured = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkUpdateMainFeatured) {
      handleBulkUpdateMainFeatured(selectedProductIds, true);
    } else {
      const isConfirmed = window.confirm(
        `선택한 ${selectedProductIds.length}개 상품을 [메인화면 진열]로 일괄 등록하시겠습니까?`
      );
      if (!isConfirmed) return;
      selectedProductIds.forEach((id) => {
        const target = productsList.find((p) => String(p.id) === String(id));
        if (target && !target.isMainFeatured) {
          toggleMainFeatured(target.id);
        }
      });
    }
    setIsBulkActionMenuOpen(false);
    setSelectedProductIds([]);
  };

  // Bulk Unregister Main Featured (Single Batch Update)
  const handleExecuteBulkUnfeatured = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkUpdateMainFeatured) {
      handleBulkUpdateMainFeatured(selectedProductIds, false);
    } else {
      const isConfirmed = window.confirm(
        `선택한 ${selectedProductIds.length}개 상품을 [메인화면 미진열]로 일괄 해제하시겠습니까?`
      );
      if (!isConfirmed) return;
      selectedProductIds.forEach((id) => {
        const target = productsList.find((p) => String(p.id) === String(id));
        if (target && target.isMainFeatured) {
          toggleMainFeatured(target.id);
        }
      });
    }
    setIsBulkActionMenuOpen(false);
    setSelectedProductIds([]);
  };

  // Bulk Mark as Sold Out (Single Batch Update)
  const handleExecuteBulkSoldOut = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkUpdateStock) {
      handleBulkUpdateStock(selectedProductIds, 0);
    } else {
      const isConfirmed = window.confirm(
        `선택한 ${selectedProductIds.length}개 상품을 [품절 (재고 0개)] 처리하시겠습니까?`
      );
      if (!isConfirmed) return;
      selectedProductIds.forEach((id) => {
        if (handleQuickUpdateStock) {
          handleQuickUpdateStock(String(id), 0);
        } else {
          toggleStock(id);
        }
      });
    }
    setIsBulkActionMenuOpen(false);
    setSelectedProductIds([]);
  };

  // Bulk Mark as In Stock (Single Batch Update)
  const handleExecuteBulkInStock = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkUpdateStock) {
      handleBulkUpdateStock(selectedProductIds, 50);
    } else {
      const isConfirmed = window.confirm(
        `선택한 ${selectedProductIds.length}개 상품의 재고를 [정상 판매중 (재고 50개)]으로 일괄 설정하시겠습니까?`
      );
      if (!isConfirmed) return;
      selectedProductIds.forEach((id) => {
        if (handleQuickUpdateStock) {
          handleQuickUpdateStock(String(id), 50);
        }
      });
    }
    setIsBulkActionMenuOpen(false);
    setSelectedProductIds([]);
  };

  // Bulk Move to Top Handler
  const handleExecuteBulkMoveToTop = () => {
    if (selectedProductIds.length === 0) return;
    if (handleBulkMoveToTop) {
      handleBulkMoveToTop(selectedProductIds);
    } else if (handleReorderProducts && displayedProducts[0]) {
      selectedProductIds.forEach((id) => {
        handleReorderProducts(id, String(displayedProducts[0].id), false);
      });
    }
    setCurrentPage(1);
    setIsBulkActionMenuOpen(false);
    setSelectedProductIds([]);
  };

  // Drag & Drop Reordering State & Handlers
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartTimeRef = useRef(0);
  const lastDragEndTimeRef = useRef(0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    isDraggingRef.current = true;
    dragStartTimeRef.current = Date.now();
    setDraggedProductId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedProductId && targetId && draggedProductId !== targetId) {
      if (dropTargetId !== targetId) {
        setDropTargetId(targetId);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    lastDragEndTimeRef.current = Date.now();
    if (draggedProductId && targetId && draggedProductId !== targetId) {
      if (handleReorderProducts) {
        handleReorderProducts(draggedProductId, targetId, true);
      }
    }
    setDraggedProductId(null);
    setDropTargetId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleDragEnd = () => {
    lastDragEndTimeRef.current = Date.now();
    setDraggedProductId(null);
    setDropTargetId(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  // Calculate maximum existing productNo integer
  const getNextBaseProductNo = (): number => {
    let maxNo = 0;
    productsList.forEach((p) => {
      if (p?.productNo !== undefined && !isNaN(Number(p.productNo))) {
        maxNo = Math.max(maxNo, Number(p.productNo));
      } else {
        const code = p?.productCode || p?.id || "";
        const match = String(code).match(/\d+/);
        if (match) maxNo = Math.max(maxNo, parseInt(match[0], 10));
      }
    });
    return maxNo;
  };

  // Download Sample Excel Template matching full manual registration fields
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        "상품명 (필수)": "프리미엄 콤마 테일러드 재킷",
        "카테고리 (outer/top/bottom/bag/shoes/accessory/timesale)": "outer",
        "판매가 (원)": 189000,
        "상품 간단설명": "고급스러운 핏감의 시그니처 셋업 재킷",
        "상품 상세설명": "최상급 콤마 울 블렌드 소재로 제작되어 우수한 드레이프성과 편안한 착용감을 제공합니다.",
        "대표 이미지 URL": "/product_1.webp",
        "추가 이미지 URLs (쉼표 구분)": "/product_1.webp, /product_2.webp",
        "색상 (쉼표 구분)": "BLACK, CREAM, CHARCOAL",
        "사이즈 (쉼표 구분)": "1, 2, 3",
        "초기 재고수량": 50,
        "상품 라벨 (PREMIUM/BLACK_LABEL/ESSENTIAL)": "PREMIUM",
        "소재 성분": "WOOL 70%, COTTON 30%",
        "신축성 (없음/보통/좋음)": "보통",
        "비침 (없음/약간/있음)": "없음",
        "두께감 (얇음/적당함/두꺼움)": "적당함",
        "안감 (없음/전체안감/부분안감)": "전체안감",
        "메인화면 진열여부 (Y/N)": "Y",
        "타임세일 여부 (Y/N)": "N",
        "타임세일 할인가 (원)": "",
        "타임세일 할인율 (%)": "",
      },
      {
        "상품명 (필수)": "미니멀 울 와이드 슬랙스",
        "카테고리 (outer/top/bottom/bag/shoes/accessory/timesale)": "bottom",
        "판매가 (원)": 129000,
        "상품 간단설명": "드레이프성이 우수한 실루엣의 와이드 슬랙스",
        "상품 상세설명": "투 턱 디테일로 자연스럽게 잡히는 불륨감있는 와이드 실루엣 슬랙스입니다.",
        "대표 이미지 URL": "/product_2.webp",
        "추가 이미지 URLs (쉼표 구분)": "/product_2.webp",
        "색상 (쉼표 구분)": "BLACK, NAVY, BEIGE",
        "사이즈 (쉼표 구분)": "1, 2, 3",
        "초기 재고수량": 30,
        "상품 라벨 (PREMIUM/BLACK_LABEL/ESSENTIAL)": "BLACK_LABEL",
        "소재 성분": "COTTON 100%",
        "신축성 (없음/보통/좋음)": "보통",
        "비침 (없음/약간/있음)": "없음",
        "두께감 (얇음/적당함/두꺼움)": "적당함",
        "안감 (없음/전체안감/부분안감)": "없음",
        "메인화면 진열여부 (Y/N)": "Y",
        "타임세일 여부 (Y/N)": "Y",
        "타임세일 할인가 (원)": "89000",
        "타임세일 할인율 (%)": "31",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 45 },
      { wch: 15 },
      { wch: 35 },
      { wch: 45 },
      { wch: 25 },
      { wch: 35 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 35 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상품등록양식");
    XLSX.writeFile(workbook, "choicomma_product_upload_template.xlsx");
  };

  // Read and parse uploaded Excel file
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!json || json.length === 0) {
          alert("엑셀 파일에 등록 가능한 상품 데이터가 없습니다.");
          return;
        }

        let currentNo = getNextBaseProductNo();
        const parsedItems: any[] = [];

        json.forEach((row: any, idx: number) => {
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const foundKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase() || k.includes(key)
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") {
                return row[foundKey];
              }
            }
            return "";
          };

          const title = String(getVal(["상품명", "title", "name", "상품 이름"])).trim();
          if (!title) return;

          const categoryIdRaw = String(getVal(["카테고리", "category", "categoryId"])).trim().toLowerCase() || "outer";
          const categoryId = ["timesale", "outer", "top", "bottom", "bag", "shoes", "accessory"].includes(categoryIdRaw)
            ? categoryIdRaw
            : "outer";

          const priceRaw = getVal(["판매가", "price", "amount", "가격"]);
          const priceNum = typeof priceRaw === "number" ? priceRaw : parseInt(String(priceRaw).replace(/[^0-9]/g, ""), 10) || 0;

          const description = String(getVal(["상품 간단설명", "간단설명", "description", "설명"])).trim();
          const detailDescription = String(getVal(["상품 상세설명", "상세설명", "detailDescription", "detailedInfo"])).trim();

          const imageUrl = String(getVal(["대표 이미지 URL", "image", "imageUrl", "대표이미지"])).trim() || "/product_1.webp";
          const addImagesRaw = String(getVal(["추가 이미지 URLs", "추가 이미지", "images", "additionalImages"])).trim();
          let allImages: string[] = [imageUrl];
          if (addImagesRaw) {
            const addUrls = addImagesRaw.split(/[,|]/).map((u) => u.trim()).filter(Boolean);
            allImages = Array.from(new Set([imageUrl, ...addUrls]));
          }

          const colorsRaw = String(getVal(["색상", "color", "colors"])).trim();
          const colors = colorsRaw
            ? colorsRaw.split(/[,/|]/).map((c) => c.trim().toUpperCase()).filter(Boolean)
            : ["BLACK", "CREAM", "CHARCOAL"];

          const sizesRaw = String(getVal(["사이즈", "size", "sizes"])).trim();
          const sizes = sizesRaw
            ? sizesRaw.split(/[,/|]/).map((s) => s.trim()).filter(Boolean)
            : ["1", "2", "3"];

          const stockRaw = getVal(["초기 재고수량", "재고수량", "재고", "stock", "quantity"]);
          const stockNum = typeof stockRaw === "number" ? stockRaw : parseInt(String(stockRaw).replace(/[^0-9]/g, ""), 10) || 30;

          const labelRaw = String(getVal(["상품 라벨", "label", "productLabel"])).trim().toUpperCase();
          const label = ["BLACK_LABEL", "PREMIUM", "ESSENTIAL"].includes(labelRaw) ? labelRaw : "PREMIUM";

          const rawFabricComp = String(getVal(["소재 성분", "소재", "fabricComposition"])).trim() || "COTTON 100% (프리미엄 코튼)";
          const fabricComposition = rawFabricComp.replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼");
          const elasticity = String(getVal(["신축성", "elasticity"])).trim() || "보통";
          const sheerness = String(getVal(["비침", "sheerness"])).trim() || "없음";
          const thickness = String(getVal(["두께감", "두께", "thickness"])).trim() || "적당함";
          const lining = String(getVal(["안감", "lining"])).trim() || "없음";

          const isMainFeaturedRaw = String(getVal(["메인화면 진열여부", "메인진열", "isMainFeatured"])).trim().toUpperCase();
          const isMainFeatured = isMainFeaturedRaw === "N" || isMainFeaturedRaw === "FALSE" ? false : true;

          const isTimeSaleRaw = String(getVal(["타임세일 여부", "타임세일", "isTimeSale"])).trim().toUpperCase();
          const isTimeSale = isTimeSaleRaw === "Y" || isTimeSaleRaw === "TRUE";

          const timeSalePriceRaw = getVal(["타임세일 할인가", "timeSaleDiscountPrice"]);
          const timeSaleDiscountPrice = timeSalePriceRaw ? String(timeSalePriceRaw).trim() : undefined;

          const timeSaleRateRaw = getVal(["타임세일 할인율", "timeSaleDiscountRate"]);
          const timeSaleDiscountRate = timeSaleRateRaw ? parseInt(String(timeSaleRateRaw).replace(/[^0-9]/g, ""), 10) : undefined;

          currentNo += 1;
          const prodId = `prod-excel-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

          const sizeStockMap: Record<string, number> = {};
          const perCombo = Math.floor(stockNum / Math.max(1, colors.length * sizes.length)) || 1;
          colors.forEach((c) => {
            sizes.forEach((s) => {
              sizeStockMap[`${c}-${s}`] = perCombo;
            });
          });

          parsedItems.push({
            id: prodId,
            productNo: currentNo,
            productCode: `CC-${String(currentNo).padStart(3, "0")}`,
            createdAt: new Date().toISOString(),
            handle: title.toLowerCase().replace(/\s+/g, "-"),
            title,
            categoryId,
            categoryIds: [categoryId],
            description: description || `${title} 신규 등록 상품`,
            detailDescription: detailDescription || description || `${title} 상세설명`,
            descriptionHtml: `<p>${description || title}</p>`,
            priceRange: {
              minVariantPrice: { amount: String(priceNum), currencyCode: "KRW" },
              maxVariantPrice: { amount: String(priceNum), currencyCode: "KRW" },
            },
            featuredImage: { url: imageUrl, altText: title },
            images: allImages.map((url) => ({ url, altText: title })),
            colors,
            colorHexMap: DEFAULT_COLOR_HEX_MAP,
            sizes,
            sizeMeasurements: DEFAULT_SIZE_MEASUREMENTS,
            stock: stockNum,
            sizeStock: sizeStockMap,
            availableForSale: stockNum > 0,
            isMainFeatured,
            productLabel: label,
            options: [
              { id: "color", name: "Color", values: colors },
              { id: "size", name: "Size", values: sizes },
            ],
            variants: colors.flatMap((c) =>
              sizes.map((s) => ({
                id: `${prodId}-${c}-${s}`,
                title: `${title} - ${c} / ${s}`,
                availableForSale: stockNum > 0,
                selectedOptions: [
                  { name: "Color", value: c },
                  { name: "Size", value: s },
                ],
                price: { amount: String(priceNum), currencyCode: "KRW" },
              }))
            ),
            fabricComposition,
            elasticity,
            sheerness,
            thickness,
            lining,
            tags: isMainFeatured ? ["NEW", "top-seller"] : ["NEW"],
            isTimeSale,
            timeSaleDiscountPrice: isTimeSale ? timeSaleDiscountPrice : undefined,
            timeSaleDiscountRate: isTimeSale ? timeSaleDiscountRate || 35 : undefined,
          });
        });

        if (parsedItems.length === 0) {
          alert("유효한 상품 데이터를 읽어오지 못했습니다. 상품명이 채워져 있는지 확인해 주세요.");
          return;
        }

        setExcelPreviewItems(parsedItems);
        setIsExcelModalOpen(true);
      } catch (err) {
        console.error("Excel read error:", err);
        alert("엑셀 파일 파싱 중 오류가 발생했습니다. 올바른 .xlsx/.xls/.csv 파일인지 확인해주세요.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">상품 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            등록된 상품 목록을 조회하고 순서 변경, 정보 수정, 엑셀 대량 업로드, 재고 상태를 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {handleRestoreDefaultProducts && (
            <button
              type="button"
              onClick={handleRestoreDefaultProducts}
              className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-3.5 py-2.5 rounded-xl transition-all border border-neutral-300 text-xs cursor-pointer shadow-2xs hover:text-neutral-950"
              title="임시 등록/수정 내역을 정리하고 원본 엑셀 카탈로그 417개로 완전 초기화합니다."
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
              원본 카탈로그 초기화 (417개)
            </button>
          )}

          {/* 엑셀 파일 선택 Hidden Input */}
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleExcelFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="flex items-center gap-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-bold px-3 py-2.5 rounded-xl transition-all border border-neutral-300 text-xs cursor-pointer shadow-2xs hover:text-neutral-950"
            title="상품 일괄 등록을 위한 엑셀 양식(.xlsx) 템플릿을 다운로드합니다."
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            엑셀 양식 다운로드
          </button>

          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3.5 py-2.5 rounded-xl transition-all border border-emerald-300 text-xs cursor-pointer shadow-2xs hover:border-emerald-400"
            title="엑셀(.xlsx) 파일로 여러 상품을 한 번에 등록합니다."
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            엑셀 대량 등록
          </button>

          <button
            onClick={() => {
              setNewTitle?.("");
              setNewPrice?.("");
              setNewDescription?.("");
              setNewDetailDescription?.("");
              setNewImageUrl?.("");
              setNewImages?.([]);
              setNewUrlInput?.("");
              setNewFabricImage?.("");
              setNewColors?.([]);
              setNewIsTimeSale?.(false);
              setNewTimeSaleHours?.("24");
              setNewTimeSaleMinutes?.("0");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Product Stock Metric Summary Cards (Interactive Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 전체 등록 상품 */}
        <div
          onClick={() => setSelectedMetricFilter("all")}
          className={`border rounded-2xl p-5 transition-all cursor-pointer select-none group relative ${
            selectedMetricFilter === "all"
              ? "bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-950/20"
              : "bg-white border-neutral-200/80 hover:border-neutral-400 hover:shadow-md text-neutral-900 shadow-sm"
          }`}
          title="클릭 시 전체 상품 목록 표시"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={selectedMetricFilter === "all" ? "text-neutral-300" : "text-neutral-500"}>
              전체 등록 상품
            </span>
            <div className={`p-1.5 rounded-lg ${selectedMetricFilter === "all" ? "bg-white/10 text-white" : "bg-neutral-100 text-neutral-900"}`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-2">
            {productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-")).length.toLocaleString()} 개
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${selectedMetricFilter === "all" ? "text-neutral-400" : "text-neutral-500"}`}>
              스토어 전체 등록 아이템
            </p>
            {selectedMetricFilter === "all" && (
              <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">
                ✓ 전체 보는 중
              </span>
            )}
          </div>
        </div>

        {/* 2. 정상 판매 중 (재고 보유) */}
        <div
          onClick={() => setSelectedMetricFilter(selectedMetricFilter === "active" ? "all" : "active")}
          className={`border rounded-2xl p-5 transition-all cursor-pointer select-none group relative ${
            selectedMetricFilter === "active"
              ? "bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-600/30 text-neutral-950"
              : "bg-white border-neutral-200/80 hover:border-emerald-300 hover:shadow-md text-neutral-900 shadow-sm"
          }`}
          title="클릭 시 재고가 있는 정상 판매 중 상품만 필터링"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={selectedMetricFilter === "active" ? "text-emerald-800 font-extrabold" : "text-neutral-500"}>
              정상 판매 중 (재고 여유)
            </span>
            <div className={`p-1.5 rounded-lg ${selectedMetricFilter === "active" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-2 text-neutral-950">
            {productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-") && p.availableForSale !== false && getProductStock(p) > 0).length.toLocaleString()} 개
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-neutral-600 font-bold">재고 보유 중 (판매 가능)</p>
            {selectedMetricFilter === "active" && (
              <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                ✓ 선택됨
              </span>
            )}
          </div>
        </div>

        {/* 3. 메인 진열 제품 (Main Featured) */}
        <div
          onClick={() => setSelectedMetricFilter(selectedMetricFilter === "main_featured" ? "all" : "main_featured")}
          className={`border rounded-2xl p-5 transition-all cursor-pointer select-none group relative ${
            selectedMetricFilter === "main_featured"
              ? "bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/30 text-neutral-950"
              : "bg-white border-neutral-200/80 hover:border-amber-300 hover:shadow-md text-neutral-900 shadow-sm"
          }`}
          title="클릭 시 메인 화면에 진열 처리된 제품만 필터링"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={selectedMetricFilter === "main_featured" ? "text-amber-900 font-extrabold" : "text-neutral-500"}>
              메인 진열 제품
            </span>
            <div className={`p-1.5 rounded-lg ${selectedMetricFilter === "main_featured" ? "bg-amber-500 text-neutral-950" : "bg-amber-50 text-amber-600"}`}>
              <Sparkles className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-2 text-neutral-950">
            {productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-") && Boolean(p.isMainFeatured)).length.toLocaleString()} 개
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-neutral-600 font-bold">메인 홈 화면에 노출 중</p>
            {selectedMetricFilter === "main_featured" && (
              <span className="text-[10px] font-black bg-amber-500 text-neutral-950 px-2 py-0.5 rounded-full shadow-2xs">
                ✓ 선택됨
              </span>
            )}
          </div>
        </div>

        {/* 4. 품절 (Out of Stock) */}
        <div
          onClick={() => setSelectedMetricFilter(selectedMetricFilter === "sold_out" ? "all" : "sold_out")}
          className={`border rounded-2xl p-5 transition-all cursor-pointer select-none group relative ${
            selectedMetricFilter === "sold_out"
              ? "bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-500/30 text-neutral-950"
              : "bg-white border-neutral-200/80 hover:border-rose-300 hover:shadow-md text-neutral-900 shadow-sm"
          }`}
          title="클릭 시 재고가 0개인 품절 상품만 필터링"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={selectedMetricFilter === "sold_out" ? "text-rose-800 font-extrabold" : "text-neutral-500"}>
              품절 (Out of Stock)
            </span>
            <div className={`p-1.5 rounded-lg ${selectedMetricFilter === "sold_out" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-600"}`}>
              <X className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold mt-2 text-neutral-950">
            {productsList.filter((p) => p.categoryId !== "main_banner" && !String(p.id).startsWith("hero-slide-") && (p.availableForSale === false || getProductStock(p) === 0)).length.toLocaleString()} 개
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-neutral-600 font-bold">재고 0개 (입고 수량 추가 필요)</p>
            {selectedMetricFilter === "sold_out" && (
              <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                ✓ 선택됨
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters & Search & Sort */}
      <div className="sticky top-16 z-30 flex flex-col sm:flex-row gap-4 justify-between bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/90 shadow-md transition-all">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="상품번호(CC-001), 상품명 또는 설명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Card Filter Active Badge */}
          {selectedMetricFilter !== "all" && (
            <div className="inline-flex items-center gap-1.5 bg-neutral-950 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs animate-in fade-in">
              <span>
                {selectedMetricFilter === "active" && "🟢 정상 판매 중"}
                {selectedMetricFilter === "main_featured" && "🌟 메인 진열 제품"}
                {selectedMetricFilter === "sold_out" && "🔴 품절 상품"}
              </span>
              <span className="text-neutral-400 font-normal">
                ({displayedProducts.length}개)
              </span>
              <button
                type="button"
                onClick={() => setSelectedMetricFilter("all")}
                className="hover:bg-neutral-800 p-0.5 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="전체 상품 보기로 초기화"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 cursor-pointer"
            >
              <option value="all">전체 카테고리</option>
              {categoriesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-neutral-500" />
            <select
              value={productSortOrder}
              onChange={(e) => setProductSortOrder(e.target.value as any)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 cursor-pointer"
            >
              <option value="custom">사용자 지정 순서 (드래그 앤 드롭)</option>
              <option value="productNoDesc">최신 등록순</option>
              <option value="productNoAsc">등록번호 순 (낮은 번호순)</option>
              <option value="nameAsc">상품명순 (가나다)</option>
              <option value="priceDesc">높은 가격순</option>
              <option value="priceAsc">낮은 가격순</option>
            </select>
          </div>

          {/* 노출 개수 조절 (10개씩 기본 / 50개씩 / 100개씩 / 전체 보기) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400">보기:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 cursor-pointer shadow-2xs"
            >
              <option value={10}>10개씩 보기 (기본)</option>
              <option value={50}>50개씩 보기</option>
              <option value={100}>100개씩 보기</option>
              <option value={-1}>전체 보기</option>
            </select>
          </div>


          {selectedProductIds.length > 0 && (
            <div className="relative inline-block text-left animate-in fade-in">
              <button
                type="button"
                onClick={() => setIsBulkActionMenuOpen(!isBulkActionMenuOpen)}
                className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                title="선택한 상품 일괄 관리 메뉴"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>선택 관리 ({selectedProductIds.length}개)</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {isBulkActionMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsBulkActionMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-neutral-100 text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                      선택 상품 ({selectedProductIds.length}개) 일괄 작업
                    </div>

                    <button
                      type="button"
                      onClick={handleExecuteBulkMainFeatured}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>메인화면 진열 등록</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteBulkUnfeatured}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                      <span>메인화면 진열 해제</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteBulkMoveToTop}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5 text-indigo-600" />
                      <span>선택 상품 최상단으로 올리기</span>
                    </button>

                    <div className="my-1 border-t border-neutral-100" />

                    <button
                      type="button"
                      onClick={handleExecuteBulkSoldOut}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-100 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-neutral-600" />
                      <span>품절 처리 (재고 0개)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteBulkInStock}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>판매 재개 (재고 50개)</span>
                    </button>

                    <div className="my-1 border-t border-neutral-100" />

                    <button
                      type="button"
                      onClick={handleExecuteBulkDelete}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>선택 상품 일괄 삭제</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm">
        <div className="overflow-x-auto pb-16 -mb-16 scrollbar-thin">
          <table className="w-full text-left text-xs text-neutral-700 min-w-[1080px]">
            <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-1.5 w-8 text-center whitespace-nowrap text-neutral-400 font-bold" title="드래그하여 순서 변경">
                  순서
                </th>
                <th className="py-3 px-2 w-8 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isCurrentPageAllSelected}
                    onChange={handleSelectAllCurrentPage}
                    className="w-3.5 h-3.5 cursor-pointer rounded border-neutral-300 accent-neutral-950 focus:ring-0"
                    title="현재 페이지 전체 선택 / 해제"
                  />
                </th>
                <th className="py-3 px-3 font-sans font-black text-neutral-950 whitespace-nowrap">상품번호</th>
                <th className="py-3 px-3 whitespace-nowrap">이미지</th>
                <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">상품명</th>
                <th className="py-3 px-3 whitespace-nowrap">카테고리</th>
                <th className="py-3 px-3 whitespace-nowrap">판매가</th>
                <th className="py-3 px-3 min-w-[180px] whitespace-nowrap">남은 재고 수량 / 상태</th>
                <th className="py-3 px-2.5 text-center whitespace-nowrap min-w-[130px] font-bold text-neutral-800">
                  시간 설정
                </th>
                <th className="py-3 px-4 text-center whitespace-nowrap min-w-[145px]">관리</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-500 text-xs">
                    검색 조건에 해당 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, index) => {
                  const prodNo = getProductNo(p);
                  const isSelected = selectedProductIds.includes(String(p.id));
                  const isDragging = draggedProductId === String(p.id);
                  const isDropTarget = dropTargetId === String(p.id);

                  return (
                    <tr
                      key={String(p.id)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, String(p.id))}
                      onDragOver={(e) => handleDragOver(e, String(p.id))}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, String(p.id))}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (
                          isDraggingRef.current ||
                          Date.now() - dragStartTimeRef.current < 200 ||
                          Date.now() - lastDragEndTimeRef.current < 400
                        ) {
                          return;
                        }
                        handleOpenEditModal(p);
                      }}
                      className={`hover:bg-amber-50/60 transition-all duration-150 cursor-pointer group ${
                        isSelected ? "bg-amber-50/80" : ""
                      } ${
                        isDragging
                          ? "opacity-30 bg-neutral-200 border-2 border-dashed border-amber-400 scale-[0.99]"
                          : isDropTarget
                          ? "bg-amber-100/90 ring-2 ring-amber-500 ring-inset shadow-md"
                          : ""
                      }`}
                    >
                      {/* Drag Handle Column */}
                      <td
                        className="py-2 px-1 text-center whitespace-nowrap cursor-grab active:cursor-grabbing text-neutral-400 hover:text-amber-800 transition-colors select-none"
                        title="마우스로 드래그하여 상품 순서를 위/아래로 이동할 수 있습니다."
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center p-1 rounded hover:bg-neutral-200/50 pointer-events-none">
                          <GripVertical className="w-4 h-4 text-neutral-400 group-hover:text-amber-800 transition-colors pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-2 px-2 w-8 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(String(p.id), e)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-neutral-300 accent-neutral-950 focus:ring-0"
                        />
                      </td>
                      <td className="py-2 px-3 font-sans font-extrabold text-neutral-950 text-xs whitespace-nowrap">
                        {prodNo}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 group-hover:scale-105 transition-transform">
                          <img
                            src={p.featuredImage?.url || "/product_1.webp"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4 min-w-[200px]">
                        <p className="font-bold text-neutral-950 text-xs group-hover:text-amber-800 transition-colors flex items-center gap-1.5 whitespace-normal">
                          <span>{p.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim()}</span>
                          <span className="text-[10px] text-amber-700 font-normal shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            [클릭하여 수정]
                          </span>
                        </p>
                      </td>
                      {/* Category Quick Change Dropdown */}
                      <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <select
                          value={p.categoryId || "outer"}
                          onChange={(e) => {
                            if (handleQuickUpdateCategory) {
                              handleQuickUpdateCategory(String(p.id), e.target.value);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-neutral-100 text-neutral-900 border border-neutral-300 hover:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-950 uppercase cursor-pointer transition-all shadow-2xs"
                          title="클릭하여 상품 카테고리를 즉시 변경"
                        >
                          <option value="outer">OUTER (아우터)</option>
                          <option value="top">TOP (상의)</option>
                          <option value="bottom">BOTTOM (하의)</option>
                          <option value="bag">BAG (가방)</option>
                          <option value="shoes">SHOES (신발)</option>
                          <option value="accessory">ACC (악세사리)</option>
                          <option value="timesale">TIMESALE (타임세일)</option>
                        </select>
                      </td>

                      {/* Price Quick Edit Input */}
                      <td className="py-2 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <TablePriceInput
                          initialPrice={p.priceRange?.minVariantPrice?.amount || p.price?.amount || 0}
                          onSavePrice={(newPrice) => {
                            if (handleQuickUpdatePrice) {
                              handleQuickUpdatePrice(String(p.id), newPrice);
                            }
                          }}
                        />
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 relative">
                          <button
                            onClick={() => {
                              setActiveTimePopoverId(null);
                              setActiveStockPopoverId(activeStockPopoverId === String(p.id) ? null : String(p.id));
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 whitespace-nowrap border ${
                              (p.stock !== undefined ? Number(p.stock) : getProductStock(p)) > 0
                                ? "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-500"
                                : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-500"
                            }`}
                            title="클릭하여 옵션/컬러/사이즈별 재고 수량 수정"
                          >
                            {(p.stock !== undefined ? Number(p.stock) : getProductStock(p)) > 0 ? (
                              <span>● 재고 ({p.stock !== undefined ? Number(p.stock) : getProductStock(p)}개) ▾</span>
                            ) : (
                              <span>○ 품절 (0개) ▾</span>
                            )}
                          </button>

                          {/* Popover attached to this button */}
                          {activeStockPopoverId === String(p.id) && (
                            <StockPopover
                              product={p}
                              currentStock={p.stock !== undefined ? Number(p.stock) : getProductStock(p)}
                              onSaveStock={(newTotal, newSizeStock) => {
                                if (handleQuickUpdateStock) {
                                  handleQuickUpdateStock(String(p.id), newTotal, newSizeStock);
                                }
                              }}
                              onClose={() => setActiveStockPopoverId(null)}
                            />
                          )}

                          <button
                            onClick={() => toggleMainFeatured(p.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 border select-none whitespace-nowrap ${
                              p.isMainFeatured
                                ? "bg-neutral-950 text-white border-neutral-950 hover:bg-neutral-800"
                                : "bg-white text-neutral-500 border-neutral-300 hover:bg-neutral-100 hover:text-neutral-800"
                            }`}
                            title="클릭 시 메인 진열 ↔ 미진열 원클릭 전환"
                          >
                            {p.isMainFeatured ? (
                              <span>🌟 메인진열</span>
                            ) : (
                              <span>⚙️ 미진열</span>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap relative" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center gap-0.5 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStockPopoverId(null);
                              setActiveTimePopoverId(activeTimePopoverId === String(p.id) ? null : String(p.id));
                            }}
                            title="클릭하여 판매 시작 시간 지정 및 ON/OFF 설정"
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 whitespace-nowrap border select-none ${
                              p.availableForSale === false
                                ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-500"
                                : p.releaseDate && new Date(p.releaseDate).getTime() > Date.now()
                                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-500"
                                : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-500"
                            }`}
                          >
                            <Clock className={`w-3 h-3 ${
                              p.availableForSale === false
                                ? "text-rose-600"
                                : p.releaseDate && new Date(p.releaseDate).getTime() > Date.now()
                                ? "text-amber-800 animate-pulse"
                                : "text-blue-600"
                            }`} />
                            <span>
                              {p.availableForSale === false
                                ? "OFF (구매불가) ▾"
                                : p.releaseDate && new Date(p.releaseDate).getTime() > Date.now()
                                ? `${new Date(p.releaseDate).getMonth() + 1}/${new Date(p.releaseDate).getDate()} 오픈 ▾`
                                : "시간 설정 (ON) ▾"}
                            </span>
                          </button>

                          {p.releaseDate && new Date(p.releaseDate).getTime() > Date.now() && (
                            <span
                              className="text-[9px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded tracking-tighter"
                              title={`판매 오픈 일시: ${new Date(p.releaseDate).toLocaleString('ko-KR')}`}
                            >
                              ⏰ 오픈예정
                            </span>
                          )}

                          {/* Time Setting Popover attached to this button */}
                          {activeTimePopoverId === String(p.id) && (
                            <TimeSettingPopover
                              product={p}
                              onSaveSchedule={(avail, date) => {
                                if (handleQuickUpdateReleaseSchedule) {
                                  handleQuickUpdateReleaseSchedule(String(p.id), avail, date);
                                } else if (toggleProductPurchasable) {
                                  toggleProductPurchasable(String(p.id));
                                }
                              }}
                              onClose={() => setActiveTimePopoverId(null)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (handleMoveProductToTop) {
                                handleMoveProductToTop(String(p.id));
                                setCurrentPage(1);
                              } else if (handleReorderProducts && displayedProducts[0]) {
                                handleReorderProducts(String(p.id), String(displayedProducts[0].id), true);
                                setCurrentPage(1);
                              }
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer border border-indigo-200 shadow-2xs group/topbtn"
                            title="이 상품을 최상단으로 올리기 (1순위 배치)"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5 transition-transform group-hover/topbtn:-translate-y-0.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-amber-900 hover:text-amber-950 hover:bg-amber-100 rounded-md transition-colors cursor-pointer border border-amber-200 shadow-2xs"
                            title="상품 정보 및 재고 수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/product/${encodeURIComponent(p.handle || p.id)}`}
                            target="_blank"
                            className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-md transition-colors border border-neutral-200 shadow-2xs"
                            title="쇼핑몰 상품 페이지 미리보기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => {
                              handleDeleteProduct(p.id, p.title);
                              setSelectedProductIds((prev) => prev.filter((id) => id !== String(p.id)));
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer border border-rose-200 shadow-2xs"
                            title="상품 완전 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pageSize !== -1 && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-neutral-50/70 border-t border-neutral-200/80">
            <div className="text-xs text-neutral-500 font-medium">
              총 <span className="font-bold text-neutral-900">{totalItems.toLocaleString()}</span>개 상품 중{" "}
              <span className="font-bold text-neutral-900">
                {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}
              </span>
              ~
              <span className="font-bold text-neutral-900">
                {Math.min(totalItems, currentPage * pageSize)}
              </span>
              번째 표시 (페이지 <span className="font-bold text-neutral-900">{currentPage}</span> / {totalPages})
            </div>

            <div className="flex items-center gap-1">
              {/* First Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                title="첫 페이지로 이동"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                title="이전 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 mx-1">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-1.5 text-neutral-400 text-xs font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p as number)}
                      className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-neutral-950 text-white shadow-xs"
                          : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                title="다음 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors shadow-2xs cursor-pointer"
                title="마지막 페이지로 이동"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click-outside backdrop for Popovers */}
      {(activeTimePopoverId || activeStockPopoverId) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setActiveTimePopoverId(null);
            setActiveStockPopoverId(null);
          }}
        />
      )}

      {/* Excel Upload Preview Modal */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-900 to-neutral-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black flex items-center gap-2">
                    엑셀 상품 일괄 등록 미리보기
                    <span className="text-xs bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full">
                      총 {excelPreviewItems.length}개 상품 감지됨
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    개별 상품 등록 양식과 동일한 전체 옵션(소재, 상세설명, 메인진열, 타임세일 등)이 파싱되었습니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Table Preview */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {excelPreviewItems.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-3">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                  <p className="font-bold">등록할 대상 상품이 없습니다.</p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-600 font-bold border-b border-neutral-200 uppercase">
                      <tr>
                        <th className="py-3 px-3">상품코드</th>
                        <th className="py-3 px-3">이미지</th>
                        <th className="py-3 px-3">상품명 / 간단설명</th>
                        <th className="py-3 px-3">카테고리</th>
                        <th className="py-3 px-3">판매가</th>
                        <th className="py-3 px-3">색상 / 사이즈</th>
                        <th className="py-3 px-3">재고</th>
                        <th className="py-3 px-3">소재 / 성분</th>
                        <th className="py-3 px-3">진열 / 타임세일</th>
                        <th className="py-3 px-3 text-right">제거</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {excelPreviewItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-neutral-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                            {item.productCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <img
                              src={item.featuredImage?.url || "/product_1.webp"}
                              alt={item.title}
                              className="w-9 h-9 object-cover rounded-lg border border-neutral-200"
                            />
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-bold text-neutral-900 truncate">{item.title}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-neutral-100 border border-neutral-200 text-neutral-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                              {item.categoryId}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                            {formatPrice(item.priceRange?.minVariantPrice?.amount || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600">
                            <div>{item.colors?.join(", ")}</div>
                            <div className="text-[10px] text-neutral-400">{item.sizes?.join("/")}</div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-neutral-900">
                            {item.stock} 개
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-neutral-600 max-w-[140px] truncate">
                            <p className="font-bold text-neutral-800 truncate">{item.fabricComposition}</p>
                            <p className="text-neutral-400">신축:{item.elasticity} | 비침:{item.sheerness}</p>
                          </td>
                          <td className="py-2.5 px-3 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${item.isMainFeatured ? "bg-neutral-950 text-white border border-neutral-950" : "bg-neutral-100 text-neutral-500"}`}>
                                {item.isMainFeatured ? "메인진열 Y" : "메인진열 N"}
                              </span>
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                {item.productLabel || "PREMIUM"}
                              </span>
                            </div>
                            {item.isTimeSale && (
                              <div className="text-[10px] font-bold text-rose-600">
                                🔥 타임세일 ({item.timeSaleDiscountRate || 35}% OFF)
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() =>
                                setExcelPreviewItems((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="목록에서 제외"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-neutral-950 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                전체 항목 포함 양식 재다운로드
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  취소
                </button>

                <button
                  type="button"
                  disabled={excelPreviewItems.length === 0}
                  onClick={() => {
                    if (handleBulkAddProducts) {
                      const baseNo = getNextBaseProductNo();
                      const resequencedItems = excelPreviewItems.map((item, idx) => {
                        const pNo = baseNo + idx + 1;
                        return {
                          ...item,
                          productNo: pNo,
                          productCode: `CC-${String(pNo).padStart(3, "0")}`,
                        };
                      });
                      handleBulkAddProducts(resequencedItems);
                    }
                    setIsExcelModalOpen(false);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {excelPreviewItems.length}개 상품 일괄 등록 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
