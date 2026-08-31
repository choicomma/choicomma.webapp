"use client";

import React, { useState } from "react";
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
  RotateCcw,
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
  { name: "SHOULDER", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
  { name: "CHEST", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
  { name: "SLEEVE", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
  { name: "LENGTH", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
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
  handleBulkAddProducts?: (newProducts: any[]) => void;
  handleMoveProduct?: (id: string, direction: "up" | "down") => void;
  handleBulkDeleteProducts?: (targetIds: string[]) => void;
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
  handleBulkAddProducts,
  handleMoveProduct,
  handleBulkDeleteProducts,
}: ProductsManagementProps) {
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewItems, setExcelPreviewItems] = useState<any[]>([]);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const isAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.includes(String(p.id)));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = filteredProducts.map((p) => String(p.id));
      setSelectedProductIds(allIds);
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
      selectedProductIds.forEach((id) => handleDeleteProduct(id, ""));
      setSelectedProductIds([]);
    }
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

          const fabricComposition = String(getVal(["소재 성분", "소재", "fabricComposition"])).trim() || "COTTON 100% (프리미엄 콤마 코튼)";
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">상품 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            등록된 상품 목록을 조회하고 순서 변경, 정보 수정, 엑셀 대량 업로드, 재고 상태를 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="flex items-center gap-2 bg-white hover:bg-neutral-50 text-neutral-800 font-bold px-3.5 py-2.5 rounded-xl border border-neutral-300 transition-all shadow-2xs text-xs cursor-pointer"
            title="엑셀 대량 업로드 샘플 양식 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>양식 다운로드</span>
          </button>

          <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>엑셀 상품 등록</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelFileChange}
              className="hidden"
            />
          </label>

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
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            개별 상품 등록
          </button>
        </div>
      </div>

      {/* Product Stock Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <span>전체 등록 상품</span>
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

      {/* Filters & Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-sm">
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
              <option value="productNoDesc">최신 등록순 (기본)</option>
              <option value="custom">✋ 사용자 직접 지정 순서</option>
              <option value="productNoAsc">등록순 (오래된 순)</option>
              <option value="nameAsc">상품명순 (가나다)</option>
              <option value="priceDesc">높은 가격순</option>
              <option value="priceAsc">낮은 가격순</option>
            </select>
          </div>

          {selectedProductIds.length > 0 && (
            <button
              type="button"
              onClick={handleExecuteBulkDelete}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer animate-in fade-in"
              title="선택한 상품들을 일괄 삭제합니다"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택 상품 일괄 삭제 ({selectedProductIds.length}개)</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 cursor-pointer rounded border-neutral-300 accent-neutral-950 focus:ring-0"
                    title="전체 선택 / 해제"
                  />
                </th>
                <th className="py-3 px-4 font-sans font-black text-neutral-950">상품번호</th>
                <th className="py-3 px-4">상품 대표 이미지</th>
                <th className="py-3 px-4">상품명</th>
                <th className="py-3 px-4">카테고리</th>
                <th className="py-3 px-4">판매가</th>
                <th className="py-3 px-4">남은 재고 수량 / 상태</th>
                <th className="py-3 px-4 text-right">작업 / 순서 이동</th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning className="divide-y divide-neutral-200/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 text-xs">
                    검색 조건에 해당 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const prodNo = getProductNo(p);
                  const isSelected = selectedProductIds.includes(String(p.id));

                  return (
                    <tr
                      key={`${p.id}-${index}`}
                      onClick={() => handleOpenEditModal(p)}
                      className={`hover:bg-amber-50/60 transition-colors cursor-pointer group ${
                        isSelected ? "bg-amber-50/80" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(String(p.id), e)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-neutral-300 accent-neutral-950 focus:ring-0"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-sans font-extrabold text-neutral-950 text-xs shrink-0">
                        {prodNo}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden border border-neutral-200 group-hover:scale-105 transition-transform">
                          <img
                            src={p.featuredImage?.url || "/product_1.webp"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-neutral-950 text-xs group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                          {p.title?.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL)\]?/gi, "").trim()}
                          <span className="text-[10px] text-amber-700 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                            [클릭하여 정보/재고 수정]
                          </span>
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate max-w-xs">{p.description}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-200 uppercase">
                          {p.categoryId}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-neutral-950 font-mono text-xs">
                        {formatPrice(p.priceRange?.minVariantPrice?.amount || 0)}
                      </td>
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStock(p.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 ${
                              p.availableForSale !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            }`}
                            title="클릭 시 재고 있음 ↔ 품절 상태 원클릭 전환"
                          >
                            {p.availableForSale !== false ? (
                              <span>● 재고 있음 ({getProductStock(p)}개)</span>
                            ) : (
                              <span>○ 품절</span>
                            )}
                          </button>

                          <button
                            onClick={() => toggleMainFeatured(p.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 border select-none ${
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
                          {/* Order Up/Down Movement Buttons */}
                          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200 mr-1.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveProduct && handleMoveProduct(p.id, "up");
                              }}
                              disabled={index === 0}
                              className="p-1 text-neutral-600 hover:text-neutral-950 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded transition-colors cursor-pointer"
                              title="순서 위로 이동 (▲)"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveProduct && handleMoveProduct(p.id, "down");
                              }}
                              disabled={index === filteredProducts.length - 1}
                              className="p-1 text-neutral-600 hover:text-neutral-950 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded transition-colors cursor-pointer"
                              title="순서 아래로 이동 (▼)"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

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
                            <p className="text-[10px] text-neutral-400 truncate">{item.description}</p>
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
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${item.isMainFeatured ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-neutral-100 text-neutral-500"}`}>
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
                      handleBulkAddProducts(excelPreviewItems);
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
