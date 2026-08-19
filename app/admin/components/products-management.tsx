"use client";

import React from "react";
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
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";

interface ProductsManagementProps {
  productsList: any[];
  filteredProducts: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (val: string) => void;
  productSortOrder: "productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc";
  setProductSortOrder: (val: any) => void;
  categoriesList: any[];
  getProductStock: (product: any) => number;
  getProductNo: (product: any) => number;
  handleClearAllProducts: () => void;
  handleOpenEditModal: (product: any) => void;
  handleDeleteProduct: (id: string, title: string) => void;
  toggleStock: (id: string) => void;
  toggleMainFeatured: (id: string) => void;
  setIsAddModalOpen: (val: boolean) => void;
  setNewTitle: (val: string) => void;
  setNewPrice: (val: string) => void;
  setNewDescription: (val: string) => void;
  setNewImageUrl: (val: string) => void;
  setNewImages: (val: string[]) => void;
  setNewUrlInput: (val: string) => void;
  setNewFabricImage: (val: string) => void;
  setNewColors: (val: string[]) => void;
  setNewIsTimeSale: (val: boolean) => void;
  setNewTimeSaleHours: (val: string) => void;
  setNewTimeSaleMinutes: (val: string) => void;
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
  handleOpenEditModal,
  handleDeleteProduct,
  toggleStock,
  toggleMainFeatured,
  setIsAddModalOpen,
  setNewTitle,
  setNewPrice,
  setNewDescription,
  setNewImageUrl,
  setNewImages,
  setNewUrlInput,
  setNewFabricImage,
  setNewColors,
  setNewIsTimeSale,
  setNewTimeSaleHours,
  setNewTimeSaleMinutes,
}: ProductsManagementProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">상품 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            등록된 상품 목록을 조회하고 수정, 추가, 재고 상태를 관리합니다. (메인 화면 진열은 '메인화면 관리' 탭에서 관리)
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleClearAllProducts}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            전체 상품 삭제
          </button>
          <button
            onClick={() => {
              setNewTitle("");
              setNewPrice("");
              setNewDescription("");
              setNewImageUrl("");
              setNewImages([]);
              setNewUrlInput("");
              setNewFabricImage("");
              setNewColors([]);
              setNewIsTimeSale(false);
              setNewTimeSaleHours("24");
              setNewTimeSaleMinutes("0");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Product Stock Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>전체 상품 수</span>
            <Package className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-extrabold text-neutral-950 mt-2">{productsList.length.toLocaleString()} 개</p>
          <p className="text-xs text-neutral-500 mt-1">스토어 전체 등록 아이템</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>정상 판매 중 (재고 여유)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            {productsList.filter((p) => getProductStock(p) > 10).length.toLocaleString()} 개
          </p>
          <p className="text-xs text-emerald-700 font-bold mt-1">재고 10개 초과 보유 중</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>재고 소진 임박</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            {productsList.filter((p) => getProductStock(p) > 0 && getProductStock(p) <= 10).length.toLocaleString()} 개
          </p>
          <p className="text-xs text-amber-700 font-bold mt-1">재고 1~10개 남음 (보충 필요)</p>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>품절 (Out of Stock)</span>
            <X className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 mt-2">
            {productsList.filter((p) => getProductStock(p) === 0).length.toLocaleString()} 개
          </p>
          <p className="text-xs text-rose-700 font-bold mt-1">재고 0개 (입고 수량 추가 필요)</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="상품번호(#437), 상품명 또는 설명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 focus:outline-none focus:border-neutral-950 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950"
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
            <span className="text-xs font-bold text-neutral-500 shrink-0">정렬:</span>
            <select
              value={productSortOrder}
              onChange={(e: any) => setProductSortOrder(e.target.value)}
              className="bg-amber-50/60 border border-amber-300 rounded-xl px-3 py-2 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950 shadow-2xs"
            >
              <option value="productNoDesc">🔢 상품번호 높은순 (최신순)</option>
              <option value="productNoAsc">🔢 상품번호 낮은순 (등록순)</option>
              <option value="nameAsc">🔤 상품명 가나다순</option>
              <option value="priceDesc">💰 판매가 높은순</option>
              <option value="priceAsc">💰 판매가 낮은순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4 font-mono font-black text-neutral-950">상품번호</th>
                <th className="py-3.5 px-4">상품 대표 이미지</th>
                <th className="py-3.5 px-4">상품명</th>
                <th className="py-3.5 px-4">카테고리</th>
                <th className="py-3.5 px-4">판매가</th>
                <th className="py-3.5 px-4">남은 재고 수량 / 상태</th>
                <th className="py-3.5 px-4 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 text-sm">
                    검색 조건에 해당 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const prodNo = getProductNo(p);
                  return (
                    <tr
                      key={`${p.id}-${index}`}
                      onClick={() => handleOpenEditModal(p)}
                      className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-extrabold text-neutral-900 text-xs shrink-0">
                        <span className="bg-neutral-100 text-neutral-900 px-2.5 py-1 rounded-md border border-neutral-300 shadow-2xs font-mono font-bold">
                          #{prodNo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 group-hover:scale-105 transition-transform">
                          <img
                            src={p.featuredImage?.url || "/product_1.webp"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-neutral-950 group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                          {p.title}
                          <span className="text-[10px] text-amber-700 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                            [클릭하여 정보/재고 수정]
                          </span>
                        </p>
                        <p className="text-xs text-neutral-500 truncate max-w-xs">{p.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-100 text-neutral-900 border border-neutral-200 uppercase">
                          {p.categoryId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-950 font-mono">
                        {formatPrice(p.priceRange?.minVariantPrice?.amount || 0)}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStock(p.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 ${
                              p.availableForSale !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            }`}
                            title="클릭 시 재고 있음 ↔ 품절 상태 원클릭 전환"
                          >
                            {p.availableForSale !== false ? (
                              <span>● 재고 있음</span>
                            ) : (
                              <span>○ 품절</span>
                            )}
                          </button>

                          <button
                            onClick={() => toggleMainFeatured(p.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 border select-none ${
                              p.isMainFeatured
                                ? "bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-400"
                                : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200 hover:text-neutral-700"
                            }`}
                            title="클릭 시 메인 진열 ↔ 미진열 원클릭 전환"
                          >
                            {p.isMainFeatured ? (
                              <span>🌟 메인 진열</span>
                            ) : (
                              <span>⚙️ 메인 미진열</span>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="상품 정보 수정"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/product/${p.handle}`}
                            target="_blank"
                            className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="상품 페이지 바로가기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="상품 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
}
