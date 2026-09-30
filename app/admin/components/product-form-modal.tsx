"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  ImageIcon,
  Sparkles,
  Check,
  RotateCcw,
  Clock,
  Sliders,
  Calendar,
  Plus,
  Minus,
  Trash2,
  Tags,
  Ruler,
  Box,
  Percent,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import {
  DEFAULT_COLOR_HEX_MAP,
  MEASUREMENT_KO_MAP,
  DEFAULT_SIZE_MEASUREMENTS,
  SizeMeasurementRow,
} from "@/lib/admin/constants";
import { calculateTotalStock, compressImageDataUrl } from "@/lib/admin/helpers";

function StockInputItem({
  size,
  currentStock,
  onConfirmStock,
}: {
  size: string;
  currentStock: number;
  onConfirmStock: (size: string, val: number) => void;
}) {
  const [valStr, setValStr] = useState(String(currentStock));

  useEffect(() => {
    setValStr(String(currentStock));
  }, [currentStock]);

  const commitValue = () => {
    const parsed = parseInt(valStr, 10);
    const validVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    if (validVal !== currentStock) {
      const isConfirmed = window.confirm(
        `[사이즈: ${size}] 재고 수량을 ${currentStock}개 ➡️ ${validVal}개로 변경하시겠습니까?`
      );
      if (isConfirmed) {
        onConfirmStock(size, validVal);
      } else {
        setValStr(String(currentStock));
      }
    } else {
      setValStr(String(validVal));
    }
  };

  return (
    <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 shadow-2xs">
      <span className="text-xs font-extrabold text-neutral-800 uppercase shrink-0">{size}</span>
      <span className="text-neutral-300 text-xs">:</span>
      <input
        type="number"
        min={0}
        value={valStr}
        onChange={(e) => setValStr(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitValue();
          }
        }}
        className="w-14 bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-neutral-950 focus:outline-none focus:border-neutral-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

function MeasurementInputItem({
  rowName,
  size,
  currentVal,
  onConfirmVal,
}: {
  rowName: string;
  size: string;
  currentVal: string;
  onConfirmVal: (newVal: string) => void;
}) {
  const [val, setVal] = useState(currentVal || "");

  useEffect(() => {
    setVal(currentVal || "");
  }, [currentVal]);

  const commitValue = () => {
    const trimmed = val.trim();
    if (trimmed !== (currentVal || "")) {
      const isConfirmed = window.confirm(
        `[${rowName} / ${size}] 실측 수치를 '${currentVal || "미입력"}' ➡️ '${trimmed || "미입력"}' (으)로 변경하시겠습니까?`
      );
      if (isConfirmed) {
        onConfirmVal(trimmed);
      } else {
        setVal(currentVal || "");
      }
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitValue();
        }
      }}
      placeholder="0"
      className="w-full bg-white border border-neutral-200 rounded-lg px-1.5 py-1 text-xs font-mono font-bold text-center text-neutral-950 focus:outline-none focus:border-sky-600"
    />
  );
}

export interface ProductFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initialProduct?: any | null;
  categoriesList: any[];
  productsList?: any[];
  onClose: () => void;
  onSave: (product: any, isNew: boolean) => void;
  triggerToast: (msg: string) => void;
}

export function ProductFormModal({
  isOpen,
  mode,
  initialProduct,
  categoriesList,
  productsList = [],
  onClose,
  onSave,
  triggerToast,
}: ProductFormModalProps) {
  const isEdit = mode === "edit";

  // Form states
  const [productNoInput, setProductNoInput] = useState("");
  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<string[]>(["new"]);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [stock, setStock] = useState<number>(50);
  const [availableForSale, setAvailableForSale] = useState(true);
  const [isScheduledRelease, setIsScheduledRelease] = useState(false);
  const [releaseDate, setReleaseDate] = useState("");
  const [isMainFeatured, setIsMainFeatured] = useState(true);

  // Label & Fabric
  const [label, setLabel] = useState<"" | "BLACK_LABEL" | "PREMIUM" | "ESSENTIAL">("PREMIUM");
  const [fabricComposition, setFabricComposition] = useState("COTTON 100% (프리미엄 콤마 코튼)");
  const [showFabricBadge, setShowFabricBadge] = useState<boolean>(false);
  const [showFabricInfo, setShowFabricInfo] = useState<boolean>(true);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);
  const [elasticity, setElasticity] = useState("보통");
  const [sheerness, setSheerness] = useState("없음");
  const [thickness, setThickness] = useState("적당함");
  const [lining, setLining] = useState("없음");
  const [fabricImage, setFabricImage] = useState("");

  // Color options
  const [colors, setColors] = useState<string[]>([]);
  const [colorHexMap, setColorHexMap] = useState<Record<string, string>>(DEFAULT_COLOR_HEX_MAP);
  const [colorImages, setColorImages] = useState<Record<string, string>>({});
  const [customColor, setCustomColor] = useState("");
  const [customColorImg, setCustomColorImg] = useState("");

  // Sizes & measurements
  const [sizes, setSizes] = useState<string[]>(["1", "2", "3"]);
  const [sizeMeasurements, setSizeMeasurements] = useState<SizeMeasurementRow[]>(DEFAULT_SIZE_MEASUREMENTS);
  const [newMeasurementName, setNewMeasurementName] = useState("");
  const [sizeStock, setSizeStock] = useState<Record<string, number>>({ "1": 10, "2": 10, "3": 10 });

  // Bulk discount
  const [bulkEnabled, setBulkEnabled] = useState(false);
  const [bulkRules, setBulkRules] = useState<{ qty: number; rate: number }[]>([{ qty: 2, rate: 5 }]);

  // Time sale
  const [isTimeSale, setIsTimeSale] = useState(false);
  const [timeSaleDiscountRate, setTimeSaleDiscountRate] = useState<string>("35");
  const [timeSaleAllowCoupon, setTimeSaleAllowCoupon] = useState<boolean>(true);
  const [timeSaleAllowPoints, setTimeSaleAllowPoints] = useState<boolean>(true);
  const [timeSaleStartMonth, setTimeSaleStartMonth] = useState("8");
  const [timeSaleStartDay, setTimeSaleStartDay] = useState("20");
  const [timeSaleStartAmpm, setTimeSaleStartAmpm] = useState("오전");
  const [timeSaleStartHour, setTimeSaleStartHour] = useState("09");
  const [timeSaleStartMinute, setTimeSaleStartMinute] = useState("00");
  const [timeSaleEndMonth, setTimeSaleEndMonth] = useState("8");
  const [timeSaleEndDay, setTimeSaleEndDay] = useState("27");
  const [timeSaleEndAmpm, setTimeSaleEndAmpm] = useState("오후");
  const [timeSaleEndHour, setTimeSaleEndHour] = useState("11");
  const [timeSaleEndMinute, setTimeSaleEndMinute] = useState("59");

  // Timer tick for preview
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hydrate on open / initialProduct change
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && initialProduct) {
      setProductNoInput(initialProduct.productCode || (initialProduct.productNo ? String(initialProduct.productNo) : ""));
      setTitle(initialProduct.title || "");
      const cats = Array.isArray(initialProduct.categoryIds) && initialProduct.categoryIds.length > 0
        ? initialProduct.categoryIds
        : [initialProduct.categoryId || "outer"];
      setCategories(cats);
      const pr = initialProduct.priceRange?.minVariantPrice?.amount || initialProduct.price?.amount || "0";
      setPrice(String(pr));
      setDescription(initialProduct.description || "");
      setDetailDescription(initialProduct.detailDescription || "");
      const initImgs = Array.isArray(initialProduct.images) && initialProduct.images.length > 0
        ? initialProduct.images.map((img: any) => (typeof img === "string" ? img : img.url))
        : (initialProduct.featuredImage?.url ? [initialProduct.featuredImage.url] : ["/product_1.webp"]);
      setImages(initImgs);
      setImageUrl(initImgs[0] || "");
      setUrlInput("");
      setStock(initialProduct.stock !== undefined ? Number(initialProduct.stock) : 50);
      setAvailableForSale(initialProduct.availableForSale !== false);
      setIsScheduledRelease(Boolean(initialProduct.releaseDate));
      setReleaseDate(initialProduct.releaseDate || "");
      setIsMainFeatured(initialProduct.isMainFeatured !== false);
      setLabel(initialProduct.productLabel || "PREMIUM");

      const initColors = Array.isArray(initialProduct.colors) ? initialProduct.colors : [];
      setColors(initColors);
      setColorHexMap(initialProduct.colorHexMap ? { ...DEFAULT_COLOR_HEX_MAP, ...initialProduct.colorHexMap } : DEFAULT_COLOR_HEX_MAP);
      setColorImages(initialProduct.colorImages || {});
      setCustomColor("");
      setCustomColorImg("");

      const initSizes = initialProduct.sizes?.length ? initialProduct.sizes : ["1", "2", "3"];
      setSizes(initSizes);
      const initMeasurements = initialProduct.sizeMeasurements && initialProduct.sizeMeasurements.length > 0
        ? initialProduct.sizeMeasurements.map((m: any) => ({
            ...m,
            name: MEASUREMENT_KO_MAP[m.name] || m.name,
          }))
        : DEFAULT_SIZE_MEASUREMENTS;
      setSizeMeasurements(initMeasurements);
      setNewMeasurementName("");

      const initSizeStock: Record<string, number> = {};
      if (initialProduct.sizeStock && Object.keys(initialProduct.sizeStock).length > 0) {
        Object.assign(initSizeStock, initialProduct.sizeStock);
      } else {
        initSizes.forEach((sz: string) => {
          if (initColors.length > 0) {
            initColors.forEach((col: string) => {
              initSizeStock[`${col}-${sz}`] = Math.max(1, Math.floor(50 / (initSizes.length * initColors.length)));
            });
          } else {
            initSizeStock[sz] = Math.max(1, Math.floor(50 / initSizes.length));
          }
        });
      }
      setSizeStock(initSizeStock);

      setBulkEnabled(Boolean(initialProduct.bulkDiscount?.enabled));
      setBulkRules(initialProduct.bulkDiscount?.rules || [{ qty: 2, rate: 5 }]);

      setFabricComposition(initialProduct.fabricComposition || "COTTON 100% (프리미엄 콤마 코튼)");
      setShowFabricBadge(Boolean(initialProduct.showFabricBadge));
      setShowFabricInfo(initialProduct.showFabricInfo !== undefined ? Boolean(initialProduct.showFabricInfo) : true);
      setShowSizeGuide(Boolean(initialProduct.showSizeGuide));
      setElasticity(initialProduct.elasticity || "보통");
      setSheerness(initialProduct.sheerness || "없음");
      setThickness(initialProduct.thickness || "적당함");
      setLining(initialProduct.lining || "없음");
      setFabricImage(initialProduct.fabricImage || "");

      setIsTimeSale(Boolean(initialProduct.isTimeSale));
      setTimeSaleDiscountRate(String(initialProduct.timeSaleDiscountRate || 35));
      setTimeSaleAllowCoupon(initialProduct.timeSaleAllowCoupon !== false);
      setTimeSaleAllowPoints(initialProduct.timeSaleAllowPoints !== false);
      if (initialProduct.timeSaleStartDate) {
        const d = new Date(initialProduct.timeSaleStartDate);
        setTimeSaleStartMonth(String(d.getMonth() + 1));
        setTimeSaleStartDay(String(d.getDate()));
        setTimeSaleStartAmpm(d.getHours() >= 12 ? "오후" : "오전");
        const h = d.getHours() % 12 || 12;
        setTimeSaleStartHour(String(h).padStart(2, "0"));
        setTimeSaleStartMinute(String(d.getMinutes()).padStart(2, "0"));
      }
      if (initialProduct.timeSaleEndDate) {
        const d = new Date(initialProduct.timeSaleEndDate);
        setTimeSaleEndMonth(String(d.getMonth() + 1));
        setTimeSaleEndDay(String(d.getDate()));
        setTimeSaleEndAmpm(d.getHours() >= 12 ? "오후" : "오전");
        const h = d.getHours() % 12 || 12;
        setTimeSaleEndHour(String(h).padStart(2, "0"));
        setTimeSaleEndMinute(String(d.getMinutes()).padStart(2, "0"));
      }
    } else {
      // Add mode defaults
      setProductNoInput("");
      setTitle("");
      setCategories(["new"]);
      setPrice("");
      setDescription("");
      setDetailDescription("");
      setImageUrl("");
      setImages([]);
      setUrlInput("");
      setStock(50);
      setAvailableForSale(true);
      setIsScheduledRelease(false);
      setReleaseDate("");
      setIsMainFeatured(true);
      setTimeSaleAllowCoupon(true);
      setTimeSaleAllowPoints(true);
      setLabel("PREMIUM");
      setFabricComposition("COTTON 100% (프리미엄 콤마 코튼)");
      setShowFabricBadge(false);
      setShowFabricInfo(true);
      setShowSizeGuide(false);
      setElasticity("보통");
      setSheerness("없음");
      setThickness("적당함");
      setLining("없음");
      setFabricImage("");
      setColors([]);
      setColorHexMap(DEFAULT_COLOR_HEX_MAP);
      setColorImages({});
      setCustomColor("");
      setCustomColorImg("");
      setSizes(["1", "2", "3"]);
      setSizeMeasurements(DEFAULT_SIZE_MEASUREMENTS);
      setNewMeasurementName("");
      setSizeStock({ "1": 10, "2": 10, "3": 10 });
      setBulkEnabled(false);
      setBulkRules([{ qty: 2, rate: 5 }]);
      setIsTimeSale(false);
      setTimeSaleDiscountRate("35");
      setTimeSaleStartMonth("8");
      setTimeSaleStartDay("20");
      setTimeSaleStartAmpm("오전");
      setTimeSaleStartHour("09");
      setTimeSaleStartMinute("00");
      setTimeSaleEndMonth("8");
      setTimeSaleEndDay("27");
      setTimeSaleEndAmpm("오후");
      setTimeSaleEndHour("11");
      setTimeSaleEndMinute("59");
    }
  }, [isOpen, isEdit, initialProduct]);

  if (!isOpen) return null;

  // Image upload handlers
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const rawResult = evt.target?.result as string;
        const compressed = await compressImageDataUrl(rawResult, 1600, 0.8);
        setImageUrl(compressed);
        if (!images.includes(compressed)) {
          setImages([compressed, ...images]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const availableSlots = 10 - images.length;
    if (availableSlots <= 0) {
      triggerToast("이미지는 최대 10개까지 등록 가능합니다.");
      return;
    }
    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const newUrls: string[] = [];

    for (const file of filesToProcess) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const raw = evt.target?.result as string;
          if (raw) {
            const compressed = await compressImageDataUrl(raw, 800, 0.7);
            resolve(compressed);
          } else {
            resolve("");
          }
        };
        reader.readAsDataURL(file);
      });
      if (dataUrl) newUrls.push(dataUrl);
    }

    setImages((prev) => [...prev, ...newUrls].slice(0, 10));
    if (!imageUrl && newUrls.length > 0) {
      setImageUrl(newUrls[0]);
    }
    triggerToast(`${newUrls.length}개의 이미지가 추가되었습니다.`);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("상품명을 입력해주세요.");
      return;
    }

    const totalStockCalc = calculateTotalStock(colors, sizes, sizeStock);
    const finalImages = images.length > 0 ? images : ["/product_1.webp"];

    // Product sequence number & code
    let finalProdNo: number;
    let finalProductCode: string;

    if (productNoInput.trim()) {
      const inputStr = productNoInput.trim();
      const match = inputStr.match(/\d+/);
      finalProdNo = match ? parseInt(match[0], 10) : (isEdit ? initialProduct.productNo : Date.now());
      finalProductCode = inputStr.toUpperCase().startsWith("CC-")
        ? inputStr.toUpperCase()
        : `CC-${inputStr.padStart(3, "0")}`;
    } else {
      if (isEdit) {
        finalProdNo = initialProduct.productNo;
        finalProductCode = initialProduct.productCode;
      } else {
        const maxNo = productsList.reduce((max, p) => {
          const num = typeof p.productNo === "number" ? p.productNo : parseInt(p.productNo, 10) || 0;
          return num > max ? num : max;
        }, 0);
        finalProdNo = maxNo + 1;
        finalProductCode = `CC-${String(finalProdNo).padStart(3, "0")}`;
      }
    }

    // Build variants
    const effectiveColors = colors.length > 0 ? colors : ["Default"];
    const effectiveSizes = sizes.length > 0 ? sizes : ["FREE"];
    const numPrice = String(price).replace(/[^0-9]/g, "");

    const variants: any[] = [];
    effectiveColors.forEach((c) => {
      effectiveSizes.forEach((s) => {
        const comboKey = `${c}-${s}`;
        const vStock = sizeStock[comboKey] !== undefined ? sizeStock[comboKey] : (sizeStock[s] !== undefined ? sizeStock[s] : 10);
        variants.push({
          id: `var-${c}-${s}-${Date.now()}`,
          title: c === "Default" ? s : `${c} / ${s}`,
          price: { amount: numPrice || "0", currencyCode: "KRW" },
          availableForSale: availableForSale && vStock > 0,
          selectedOptions: [
            { name: "Color", value: c },
            { name: "Size", value: s },
          ],
        });
      });
    });

    const parsedRate = parseInt(timeSaleDiscountRate, 10) || 35;

    const resultProduct = {
      ...(isEdit ? initialProduct : {}),
      id: isEdit ? initialProduct.id : `custom-prod-${Date.now()}`,
      productNo: finalProdNo,
      productCode: finalProductCode,
      createdAt: isEdit ? initialProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      handle: isEdit ? initialProduct.handle : title.toLowerCase().replace(/\s+/g, "-"),
      title: title.trim(),
      description: description || "새로운 시그니처 상품입니다.",
      detailDescription: detailDescription || "",
      descriptionHtml: `<p>${description}</p>`,
      categoryId: categories[0] || "outer",
      categoryIds: categories,
      stock: totalStockCalc,
      sizeStock,
      availableForSale,
      releaseDate: isScheduledRelease && releaseDate ? releaseDate : undefined,
      isMainFeatured,
      productLabel: label,
      colors,
      colorHexMap,
      colorImages,
      sizes,
      sizeMeasurements,
      showFabricBadge,
      showFabricInfo,
      showSizeGuide,
      fabricComposition,
      elasticity,
      sheerness,
      thickness,
      lining,
      fabricImage,
      bulkDiscount: {
        enabled: bulkEnabled,
        rules: bulkRules,
      },
      options: [
        { id: "color", name: "Color", values: colors },
        { id: "size", name: "Size", values: sizes },
      ],
      price: { amount: numPrice || "0", currencyCode: "KRW" },
      priceRange: {
        maxVariantPrice: { amount: numPrice || "0", currencyCode: "KRW" },
        minVariantPrice: { amount: numPrice || "0", currencyCode: "KRW" },
      },
      featuredImage: {
        url: finalImages[0],
        altText: title,
        width: 1200,
        height: 1600,
      },
      images: finalImages.map((url: string, idx: number) => ({
        url,
        altText: `${title} ${idx + 1}`,
        width: 1200,
        height: 1600,
      })),
      variants,
      isTimeSale,
      timeSaleDiscountRate: parsedRate,
      timeSaleAllowCoupon: isTimeSale ? timeSaleAllowCoupon : true,
      timeSaleAllowPoints: isTimeSale ? timeSaleAllowPoints : true,
      timeSaleStartDate: isTimeSale ? `2026-${timeSaleStartMonth.padStart(2, "0")}-${timeSaleStartDay.padStart(2, "0")}T${timeSaleStartAmpm === "오후" ? String((parseInt(timeSaleStartHour) % 12) + 12).padStart(2, "0") : String(parseInt(timeSaleStartHour) % 12).padStart(2, "0")}:${timeSaleStartMinute.padStart(2, "0")}:00` : undefined,
      timeSaleEndDate: isTimeSale ? `2026-${timeSaleEndMonth.padStart(2, "0")}-${timeSaleEndDay.padStart(2, "0")}T${timeSaleEndAmpm === "오후" ? String((parseInt(timeSaleEndHour) % 12) + 12).padStart(2, "0") : String(parseInt(timeSaleEndHour) % 12).padStart(2, "0")}:${timeSaleEndMinute.padStart(2, "0")}:00` : undefined,
    };

    onSave(resultProduct, !isEdit);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-white sticky top-0 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                isEdit ? "bg-amber-500 text-neutral-950" : "bg-neutral-950 text-white"
              }`}
            >
              {isEdit ? "EDIT PRODUCT" : "NEW PRODUCT"}
            </span>
            <h3 className="text-lg font-bold text-neutral-950">
              {isEdit ? (
                <>
                  상품 수정 — <span className="text-amber-800">{title}</span>
                </>
              ) : (
                "상품 등록"
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 text-sm p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Single Continuous Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#FAF9F5]">
              {/* SECTION 1: BASIC PRODUCT INFORMATION */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-neutral-950 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      STEP 1
                    </span>
                    <h4 className="text-sm font-black text-neutral-950">1. 기본 상품 정보 입력</h4>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400">Basic Details & Images</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      상품 번호 (미입력 시 자동 부여)
                    </label>
                    <input
                      type="text"
                      placeholder="예: 001, CC-001"
                      value={productNoInput}
                      onChange={(e) => setProductNoInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">상품명 *</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 클린 컷 트위드 재킷"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">상품 간단 설명 (상단 제목 밑 노출)</label>
                  <textarea
                    rows={2}
                    placeholder="상품 상단 제목 밑에 표시될 한 줄 간단 설명을 입력하세요."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      제품 이미지 등록 (최대 10개) *
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {images.length} / 10개 등록됨
                    </span>
                  </div>

                  {/* Thumbnail Grid List */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-3">
                      {images.map((url, idx) => (
                        <div
                          key={`${url.slice(0, 20)}-${idx}`}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-100 group shadow-2xs"
                        >
                          <img src={url} alt={`상품 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                          <span
                            className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-md ${idx === 0
                              ? "bg-amber-500 text-neutral-950 shadow-xs"
                              : "bg-black/60 text-white backdrop-blur-xs"
                              }`}
                          >
                            {idx === 0 ? "대표" : `#${idx + 1}`}
                          </span>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                            <button
                              type="button"
                              onClick={() => setImages(images.filter((_, i) => i !== idx))}
                              className="self-end bg-rose-600 text-white rounded-md p-1 hover:bg-rose-700 transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="flex justify-between items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...images];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx - 1];
                                    updated[idx - 1] = temp;
                                    setImages(updated);
                                  }}
                                  className="bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                                >
                                  ←
                                </button>
                              )}
                              {idx < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...images];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx + 1];
                                    updated[idx + 1] = temp;
                                    setImages(updated);
                                  }}
                                  className="ml-auto bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dropzone */}
                  {images.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[100px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl cursor-pointer transition-all p-3 text-center group mb-2">
                      <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-1 shadow-xs group-hover:scale-110 transition-transform">
                        <Upload className="w-3.5 h-3.5 text-neutral-600" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800">
                        클릭하여 사진 파일 추가 (복수 파일 가능, 최대 10개)
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        PNG, JPG, WEBP 지원 ({10 - images.length}개 더 추가 가능)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleMultiImageFileUpload(e)}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* URL Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="/product_1.webp 또는 이미지 URL 직접 입력"
                    />
                    <button
                      type="button"
                      disabled={images.length >= 10 || !urlInput.trim()}
                      onClick={() => {
                        if (urlInput.trim() && images.length < 10) {
                          setImages([...images, urlInput.trim()]);
                          setUrlInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      + 이미지 추가
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (KRW) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={price ? parseInt(String(price).replace(/[^0-9]/g, ""), 10).toLocaleString("ko-KR") : ""}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^0-9]/g, "");
                        setPrice(rawDigits);
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-sans font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="예: 499,000"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-black text-neutral-400 pointer-events-none">
                      원
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>제품 상세 사진 (하단 아코디언 '제품 상세 사진' 메뉴 노출)</span>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">하단 드롭다운 연동</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="상세 페이지 하단 '제품 상세 사진' 아코디언 메뉴에 표시될 상세 사진/HTML 코드를 입력하세요."
                    value={detailDescription}
                    onChange={(e) => setDetailDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                    <span>카테고리 선택 * (복수 선택 가능)</span>
                    <span className="text-[11px] font-mono text-neutral-500 font-bold">{categories.length}개 선택됨</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200/80">
                    {categoriesList.map((c) => {
                      const isChecked = categories.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (categories.length > 1) {
                                setCategories(categories.filter((id) => id !== c.id));
                              }
                            } else {
                              setCategories([...categories, c.id]);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${isChecked
                            ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-xs font-black"
                            : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${isChecked ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
                              }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">메인 전시 여부 (메인 슬라이더/추천 노출)</label>
                  <button
                    type="button"
                    onClick={() => setIsMainFeatured((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${isMainFeatured
                      ? "bg-amber-500/15 border-amber-400 text-neutral-950 shadow-2xs font-black"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${isMainFeatured
                          ? "bg-neutral-950 border-neutral-950 text-white"
                          : "border-neutral-300 bg-white"
                          }`}
                      >
                        {isMainFeatured && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="text-left">
                        <span className="block font-black text-xs">🌟 쇼핑몰 메인 화면에 상품 전시</span>
                        <span className="block text-[10px] font-semibold text-neutral-500">체크 시 메인 홈 대표 영역에 노출됩니다.</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isMainFeatured ? "bg-amber-500 text-neutral-950 border-amber-400" : "bg-neutral-200 text-neutral-600 border-neutral-300"
                      }`}>
                      {isMainFeatured ? "전시 중" : "미전시"}
                    </span>
                  </button>
                </div>

                {/* 상품 구매 가능 상태 ON/OFF 및 판매 시작 일시 지정 (예약 오픈) */}
                <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-black text-neutral-950">상품 구매 가능 상태 (ON/OFF)</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        OFF 설정 시 고객이 해당 상품을 장바구니에 담거나 구매할 수 없습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvailableForSale(!availableForSale)}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider transition-all cursor-pointer shadow-2xs ${availableForSale
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/20"
                          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 ring-1 ring-neutral-300"
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${availableForSale ? "bg-white animate-ping" : "bg-neutral-400"}`} />
                      <span>{availableForSale ? "ON (구매 가능)" : "OFF (구매 불가)"}</span>
                    </button>
                  </div>

                  {/* 시간 지정 판매 오픈 (예약 오픈) */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isScheduledRelease}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsScheduledRelease(checked);
                          if (checked && !releaseDate) {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(10, 0, 0, 0);
                            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setReleaseDate(iso);
                          }
                        }}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 cursor-pointer accent-neutral-950"
                      />
                      <span className="text-xs font-black text-neutral-900">
                        판매 시작 시간 지정 (예약 오픈)
                      </span>
                      <span className="text-[10px] text-amber-700 font-extrabold bg-amber-100/80 px-2 py-0.5 rounded-full">
                        지정 시간 도달 시 자동 구매 오픈
                      </span>
                    </label>

                    {isScheduledRelease && (
                      <div className="pl-6 space-y-2 pt-1 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <input
                            type="datetime-local"
                            value={releaseDate}
                            onChange={(e) => setReleaseDate(e.target.value)}
                            className="bg-white border border-neutral-300 rounded-xl px-3.5 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950 shadow-2xs font-mono"
                          />
                          {releaseDate && (
                            <span className="text-xs font-bold text-neutral-900">
                              {new Date(releaseDate).getTime() > Date.now() ? (
                                <span className="text-amber-800 flex items-center gap-1 font-bold">
                                  ⏰ {new Date(releaseDate).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}에 구매가 자동 오픈됩니다.
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  ✓ 설정된 시간이 이미 지나 현재 즉시 구매 가능한 상태입니다.
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          * 지정한 시간이 도래하기 전에는 쇼핑몰 상품 상세 및 목록에서 "오픈 예정"으로 표시되며 장바구니 담기 및 결제가 불가능합니다. 지정한 시간이 되면 자동으로 구매 가능 상태로 즉시 전환됩니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: OPTION & STOCK CONFIGURATION */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      STEP 2
                    </span>
                    <h4 className="text-sm font-black text-neutral-950 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-600" />
                      2. 컬러 · 사이즈 · 수량 옵션 및 할인 설정
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Option & Stock Configuration
                  </span>
                </div>

                {/* 1. PRODUCT LABEL */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-1.5">
                    <Tags className="w-4 h-4 text-amber-500" />
                    <label className="text-xs font-extrabold text-neutral-900">상품 라벨 (Product Label)</label>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium -mt-1">
                    상품 카드에 노출되는 프리미엄 라벨을 선택합니다.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {([
                      { value: "", label: "라벨 없음", sub: "기본 상품" },
                      { value: "BLACK_LABEL", label: "BLACK LABEL", sub: "최상위 프리미엄" },
                      { value: "PREMIUM", label: "PREMIUM", sub: "프리미엄 라인" },
                      { value: "ESSENTIAL", label: "ESSENTIAL", sub: "에센셜 라인" },
                    ] as const).map((opt) => {
                      const isSelected = label === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLabel(opt.value as any)}
                          className={`relative flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${isSelected
                            ? "bg-neutral-950 text-white border-neutral-950 shadow-md scale-[1.02]"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                            }`}
                        >
                          {isSelected && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                          <span className="text-xs font-black tracking-wide">{opt.label}</span>
                          <span className={`text-[10px] font-semibold ${isSelected ? "opacity-80" : "text-neutral-400"}`}>{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 🧵 FABRIC INFORMATION */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      {/* 좌측 상단 체크박스: 상세페이지에 표시할지 선택 */}
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-500 transition-all shadow-2xs group">
                        <input
                          type="checkbox"
                          checked={showFabricInfo}
                          onChange={(e) => setShowFabricInfo(e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 accent-neutral-950 cursor-pointer"
                        />
                        <span className="text-xs font-black text-neutral-950">
                          상세페이지에 표시
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                            showFabricInfo ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {showFabricInfo ? "메뉴 추가됨" : "미표시"}
                        </span>
                      </label>

                      <span className="text-xs font-black text-neutral-950 flex items-center gap-1.5 uppercase tracking-wider">
                        🧵 원단 정보 설정 (Fabric Details)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {showFabricInfo ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline-block">
                          ✓ 상세페이지 [원단 정보] 메뉴 노출 활성화
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md hidden sm:inline-block">
                          상세페이지 메뉴 미노출
                        </span>
                      )}

                      <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs hover:border-black transition-colors">
                        <input
                          type="checkbox"
                          checked={showFabricBadge}
                          onChange={(e) => setShowFabricBadge(e.target.checked)}
                          className="w-3.5 h-3.5 accent-black rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-extrabold text-neutral-900">
                          🏷️ 상품 카드에 원단 뱃지 노출
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">소재 구성 (FABRIC)</label>
                    <input
                      type="text"
                      value={fabricComposition}
                      onChange={(e) => setFabricComposition(e.target.value)}
                      placeholder="예: COTTON 100% (프리미엄 콤마 코튼)"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">신축성</label>
                      <select
                        value={elasticity}
                        onChange={(e) => setElasticity(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-950"
                      >
                        <option value="보통">보통</option>
                        <option value="없음">없음</option>
                        <option value="좋음">좋음</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">비침</label>
                      <select
                        value={sheerness}
                        onChange={(e) => setSheerness(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-950"
                      >
                        <option value="없음">없음</option>
                        <option value="약간">약간</option>
                        <option value="있음">있음</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">두께감</label>
                      <select
                        value={thickness}
                        onChange={(e) => setThickness(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-950"
                      >
                        <option value="적당함">적당함</option>
                        <option value="얇음">얇음</option>
                        <option value="두꺼움">두꺼움</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">안감</label>
                      <select
                        value={lining}
                        onChange={(e) => setLining(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-950"
                      >
                        <option value="없음">없음</option>
                        <option value="있음">있음</option>
                        <option value="기모">기모</option>
                      </select>
                    </div>
                  </div>

                  {/* Fabric Texture Image Upload Box */}
                  <div className="pt-2 border-t border-neutral-200/80">
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      원단 실물 텍스처 / 상세 확대 이미지 (Fabric Image)
                    </label>
                    {fabricImage ? (
                      <div className="relative w-full aspect-[16/9] max-h-[140px] rounded-xl overflow-hidden border-2 border-neutral-300 bg-neutral-100 group shadow-2xs">
                        <img src={fabricImage} alt="원단 실물 이미지" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <button
                            type="button"
                            onClick={() => setFabricImage("")}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> 이미지 삭제
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[90px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-white hover:bg-neutral-100/60 rounded-xl cursor-pointer transition-all p-2 text-center group">
                        <Upload className="w-4 h-4 text-neutral-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-neutral-800">
                          원단 확대컷 / 텍스처 사진 업로드
                        </span>
                        <span className="text-[9px] text-neutral-400">클릭하여 파일 선택</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                const raw = evt.target?.result as string;
                                if (raw) {
                                  const compressed = await compressImageDataUrl(raw, 1200, 0.8);
                                  setFabricImage(compressed);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                    <input
                      type="text"
                      value={fabricImage}
                      onChange={(e) => setFabricImage(e.target.value)}
                      placeholder="또는 원단 이미지 URL 입력"
                      className="w-full mt-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                {/* 2. OPTION / PRODUCT CUTS (제품컷 사진 등록) */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>옵션별 제품컷 사진 등록 (컬러 / 모델 착용 제품컷)</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {colors.length}개 제품컷 옵션 등록됨
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    💡 단순 텍스트/색상칩 대신, 각 옵션별 <strong>실제 제품컷 사진</strong>을 등록하세요. 상세페이지에서 고객이 제품컷 사진을 보고 클릭하여 직관적으로 구매할 수 있습니다.
                  </p>

                  {/* Add New Variant Option with Product Cut */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                        {customColorImg ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-neutral-900 bg-neutral-100 shrink-0">
                            <img src={customColorImg} alt="제품컷 미리보기" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setCustomColorImg("")}
                              className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-12 h-12 rounded-xl border-2 border-dashed border-neutral-300 hover:border-black flex flex-col items-center justify-center cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors shrink-0">
                            <Upload className="w-4 h-4 text-neutral-500" />
                            <span className="text-[8px] font-bold text-neutral-500 mt-0.5">제품컷</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (evt) => {
                                    const raw = evt.target?.result as string;
                                    if (raw) {
                                      const compressed = await compressImageDataUrl(raw, 800, 0.8);
                                      setCustomColorImg(compressed);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                        <input
                          type="text"
                          placeholder="또는 이미지 URL 직접 입력"
                          value={customColorImg}
                          onChange={(e) => setCustomColorImg(e.target.value)}
                          className="flex-1 sm:w-48 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-950"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full flex-1">
                        <input
                          type="text"
                          placeholder="옵션/컬러명 입력 (예: 블랙, 크림, 올리브)"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const trimmed = customColor.trim().toUpperCase();
                              if (trimmed && !colors.includes(trimmed)) {
                                setColors([...colors, trimmed]);
                                if (customColorImg) {
                                  setColorImages((prev) => ({ ...prev, [trimmed]: customColorImg }));
                                }
                                setCustomColor("");
                                setCustomColorImg("");
                              }
                            }
                          }}
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customColor.trim().toUpperCase();
                            if (trimmed && !colors.includes(trimmed)) {
                              setColors([...colors, trimmed]);
                              if (customColorImg) {
                                setColorImages((prev) => ({ ...prev, [trimmed]: customColorImg }));
                              }
                              setCustomColor("");
                              setCustomColorImg("");
                            }
                          }}
                          className="px-4 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                        >
                          + 제품컷 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Registered Option Product Cuts Grid */}
                  {colors.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                      {colors.map((color) => {
                        const imgUrl = colorImages[color] || images[0] || "/product_1.webp";
                        return (
                          <div
                            key={color}
                            className="flex items-center justify-between bg-white border border-neutral-200 rounded-2xl p-2 shadow-2xs hover:border-neutral-400 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 shrink-0 cursor-pointer group" title="클릭하여 제품컷 변경">
                                <img src={imgUrl} alt={color} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Upload className="w-3 h-3 text-white" />
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = async (evt) => {
                                        const raw = evt.target?.result as string;
                                        if (raw) {
                                          const compressed = await compressImageDataUrl(raw, 800, 0.8);
                                          setColorImages((prev) => ({ ...prev, [color]: compressed }));
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              <div className="min-w-0">
                                <span className="block text-xs font-black text-neutral-950 truncate">{color}</span>
                                <span className="block text-[10px] text-neutral-400 font-semibold truncate">제품컷 연동</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setColors(colors.filter((c) => c !== color));
                                const updatedMap = { ...colorImages };
                                delete updatedMap[color];
                                setColorImages(updatedMap);
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="옵션 삭제"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. SIZE OPTIONS */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200/70">
                    <div className="flex items-center gap-3">
                      {/* 좌측 상단 체크박스: 상세페이지에 표시할지 선택 */}
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-500 transition-all shadow-2xs group">
                        <input
                          type="checkbox"
                          checked={showSizeGuide}
                          onChange={(e) => setShowSizeGuide(e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 accent-neutral-950 cursor-pointer"
                        />
                        <span className="text-xs font-black text-neutral-950">
                          상세페이지에 표시
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                            showSizeGuide ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {showSizeGuide ? "메뉴 추가됨" : "미표시"}
                        </span>
                      </label>

                      <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-blue-500" />
                        <span>사이즈 (Size) 옵션 선택</span>
                      </label>
                    </div>

                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {sizes.length}개 사이즈 선택됨
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "FREE"].map((sz) => {
                      const isSelected = sizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (sizes.length > 1) {
                                setSizes(sizes.filter((s) => s !== sz));
                              }
                            } else {
                              setSizes([...sizes, sz]);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${isSelected
                            ? "bg-neutral-950 text-white shadow-md scale-105"
                            : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
                            }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. SIZE MEASUREMENTS TABLE */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200/70">
                    <div className="flex items-center gap-3">
                      {/* 좌측 상단 체크박스 */}
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-500 transition-all shadow-2xs group">
                        <input
                          type="checkbox"
                          checked={showSizeGuide}
                          onChange={(e) => setShowSizeGuide(e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-950 focus:ring-0 accent-neutral-950 cursor-pointer"
                        />
                        <span className="text-xs font-black text-neutral-950">
                          상세페이지에 표시
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                            showSizeGuide ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          {showSizeGuide ? "메뉴 추가됨" : "미표시"}
                        </span>
                      </label>

                      <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5 cursor-pointer">
                        <Ruler className="w-4 h-4 text-indigo-500" />
                        <span>사이즈별 실측 치수 가이드 (Size Chart Measurement Table)</span>
                      </label>
                    </div>

                    {showSizeGuide ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ 상세페이지 [사이즈 가이드] 메뉴 노출 활성화
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                        상세페이지 메뉴 미노출
                      </span>
                    )}
                  </div>

                  {/* Add Custom Measurement Option Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="부위명 입력 (예: 어깨너비, 가슴단면, 소매길이, 총장, 허리단면, 밑단단면)"
                      value={newMeasurementName}
                      onChange={(e) => setNewMeasurementName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newMeasurementName.trim()) {
                            const nameVal = newMeasurementName.trim();
                            if (!sizeMeasurements.some((m) => m.name === nameVal)) {
                              setSizeMeasurements([
                                ...sizeMeasurements,
                                { name: nameVal, values: {} },
                              ]);
                            }
                            setNewMeasurementName("");
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newMeasurementName.trim()) {
                          const nameVal = newMeasurementName.trim();
                          if (!sizeMeasurements.some((m) => m.name === nameVal)) {
                            setSizeMeasurements([
                              ...sizeMeasurements,
                              { name: nameVal, values: {} },
                            ]);
                          }
                          setNewMeasurementName("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      + 수치항목 추가
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white">
                    <table className="w-full text-center text-xs font-sans">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-800 font-bold">
                          <th className="py-2.5 px-3 text-left">부위명 (MEASUREMENT)</th>
                          {sizes.map((sz) => (
                            <th key={sz} className="py-2.5 px-3 font-extrabold">{sz}</th>
                          ))}
                          <th className="py-2.5 px-1 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {sizeMeasurements.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-2 px-3 text-left">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => {
                                  const updated = [...sizeMeasurements];
                                  updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                                  setSizeMeasurements(updated);
                                }}
                                className="w-full min-w-[100px] bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-950"
                                placeholder="부위명"
                              />
                            </td>
                            {sizes.map((sz) => (
                              <td key={sz} className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.values[sz] || ""}
                                  onChange={(e) => {
                                    const updated = [...sizeMeasurements];
                                    updated[rIdx] = {
                                      ...updated[rIdx],
                                      values: {
                                        ...updated[rIdx].values,
                                        [sz]: e.target.value,
                                      },
                                    };
                                    setSizeMeasurements(updated);
                                  }}
                                  className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center font-mono text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-950"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="py-1.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSizeMeasurements(sizeMeasurements.filter((_, idx) => idx !== rIdx));
                                }}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                                title="항목 삭제"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. STOCK QUANTITY & AVAILABILITY (Color × Size Matrix) */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-emerald-600" />
                      <span>컬러 · 사이즈 조합별 재고 수량 및 판매 상태</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      총 재고: {calculateTotalStock(colors, sizes, sizeStock)}개
                    </span>
                  </div>

                  {colors.length === 0 || sizes.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-2">컬러와 사이즈를 1개 이상 선택해야 옵션별 재고를 설정할 수 있습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {colors.map((color) => {
                        const hexVal = colorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
                        return (
                          <div key={color} className="bg-white border border-neutral-200/80 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs inline-block"
                                style={{ backgroundColor: hexVal }}
                              />
                              <span className="text-xs font-extrabold text-neutral-900">{color}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">({hexVal})</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {sizes.map((size) => {
                                const comboKey = `${color}-${size}`;
                                const currentQty = sizeStock[comboKey] !== undefined
                                  ? sizeStock[comboKey]
                                  : (sizeStock[size] !== undefined ? sizeStock[size] : 10);
                                return (
                                  <StockInputItem
                                    key={comboKey}
                                    size={`${color} / ${size}`}
                                    currentStock={currentQty}
                                    onConfirmStock={(sz, val) => {
                                      setSizeStock((prev) => ({ ...prev, [comboKey]: val }));
                                      triggerToast(`[${sz}] 재고 수량이 ${val}개로 설정되었습니다.`);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bulk Toggle Button */}
                  <div className="pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        const total = calculateTotalStock(colors, sizes, sizeStock);
                        const isConfirmed = window.confirm(
                          total > 0
                            ? "전체 컬러/사이즈 재고를 0개(🔴 품절)로 변경하시겠습니까?"
                            : "전체 컬러/사이즈 재고를 각 10개(🟢 판매 중)로 변경하시겠습니까?"
                        );
                        if (!isConfirmed) return;

                        const updated: Record<string, number> = {};
                        const targetQty = total > 0 ? 0 : 10;
                        colors.forEach((c) => {
                          sizes.forEach((s) => {
                            updated[`${c}-${s}`] = targetQty;
                          });
                        });
                        setSizeStock(updated);
                        triggerToast(total > 0 ? "전체 재고가 🔴 품절(0개)로 변경되었습니다." : "전체 재고가 🟢 판매 중(각 10개)으로 변경되었습니다.");
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer h-10 ${calculateTotalStock(colors, sizes, sizeStock) > 0
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                        }`}
                    >
                      {calculateTotalStock(colors, sizes, sizeStock) > 0 ? "🟢 전체 판매 중 (In Stock)" : "🔴 전체 품절 (Out of Stock)"}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PROMOTION & SPECIAL SALE DISCOUNT CONFIGURATION */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      STEP 3
                    </span>
                    <h4 className="text-sm font-black text-neutral-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      3. 프로모션 & 특별 할인 설정 (타임세일 및 대량 구매 할인)
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Promotion & Discount Settings
                  </span>
                </div>

                {/* 1. TIME SALE CONFIGURATION */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <label className="text-xs font-extrabold text-neutral-900">타임세일 (Time Sale) 특가 지정</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTimeSale(!isTimeSale)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border ${isTimeSale
                        ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-xs"
                        : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                        }`}
                    >
                      {isTimeSale ? "🔥 타임세일 적용 중" : "일반 상품 (적용 안 함)"}
                    </button>
                  </div>

                  {isTimeSale ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-amber-900 font-bold bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
                        ⚡ 타임세일을 설정하면 상품 카드 상단에 라이브 카운트다운 타이머와 뱃지가 노출되며, SPECIAL 카테고리에도 자동 연동 노출됩니다.
                      </p>

                      {/* 타임세일 할인율 (%) 설정 영역 */}
                      <div className="bg-white border border-amber-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                          <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <Percent className="w-4 h-4 text-amber-600" />
                            <span>타임세일 할인율 설정 (%)</span>
                          </label>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Time Sale Discount Rate
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div>
                            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                              할인율 입력 (%)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={timeSaleDiscountRate}
                                onChange={(e) => setTimeSaleDiscountRate(e.target.value)}
                                placeholder="예: 35"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-sans font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-xs font-black text-amber-700 shrink-0">% OFF</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 mb-1">빠른 할인율 선택</label>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[10, 20, 30, 40, 50].map((rate) => (
                                <button
                                  key={rate}
                                  type="button"
                                  onClick={() => setTimeSaleDiscountRate(String(rate))}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${timeSaleDiscountRate === String(rate)
                                    ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-2xs"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                                    }`}
                                >
                                  {rate}% OFF
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Real-time price summary preview box */}
                        {(() => {
                          const orig = parseFloat(price) || 0;
                          const rate = parseInt(timeSaleDiscountRate, 10) || 35;
                          const disc = orig > 0 ? Math.round(orig * (1 - rate / 100)) : 0;
                          const savings = orig > disc ? orig - disc : 0;

                          return (
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
                              <div className="flex items-center gap-2">
                                <span className="text-neutral-400 line-through font-sans">정가 {formatPrice(String(orig), "KRW")}</span>
                                <span className="text-amber-600 font-bold">→</span>
                                <span className="font-black text-amber-950 font-sans text-sm">타임세일가 {formatPrice(String(disc), "KRW")}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="bg-amber-500 text-neutral-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                                  {rate}% OFF
                                </span>
                                {savings > 0 && (
                                  <span className="text-[10px] font-bold text-amber-900 font-sans">
                                    ({formatPrice(String(savings), "KRW")} 할인)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-extrabold text-neutral-800 flex items-center gap-1 mb-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            타임세일 시작 일정 (00월 00일 00시 00분)
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            <select
                              value={timeSaleStartMonth}
                              onChange={(e) => setTimeSaleStartMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleStartDay}
                              onChange={(e) => setTimeSaleStartDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleStartAmpm}
                              onChange={(e) => setTimeSaleStartAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={timeSaleStartHour}
                              onChange={(e) => setTimeSaleStartHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleStartMinute}
                              onChange={(e) => setTimeSaleStartMinute(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {["00", "10", "20", "30", "40", "50", "59"].map((m) => (
                                <option key={m} value={m}>{m}분</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-extrabold text-neutral-800 flex items-center gap-1 mb-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            타임세일 종료 일정 (00월 00일 00시 00분)
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            <select
                              value={timeSaleEndMonth}
                              onChange={(e) => setTimeSaleEndMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleEndDay}
                              onChange={(e) => setTimeSaleEndDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleEndAmpm}
                              onChange={(e) => setTimeSaleEndAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={timeSaleEndHour}
                              onChange={(e) => setTimeSaleEndHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={timeSaleEndMinute}
                              onChange={(e) => setTimeSaleEndMinute(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {["00", "10", "20", "30", "40", "50", "59"].map((m) => (
                                <option key={m} value={m}>{m}분</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Real-time Ticking Remaining Time Display Box */}
                        {(() => {
                          const year = new Date().getFullYear();
                          let startH = parseInt(timeSaleStartHour, 10) || 9;
                          if (timeSaleStartAmpm === "오후" && startH < 12) startH += 12;
                          if (timeSaleStartAmpm === "오전" && startH === 12) startH = 0;
                          const startDate = new Date(year, (parseInt(timeSaleStartMonth, 10) || 8) - 1, parseInt(timeSaleStartDay, 10) || 20, startH, parseInt(timeSaleStartMinute, 10) || 0);

                          let endH = parseInt(timeSaleEndHour, 10) || 11;
                          if (timeSaleEndAmpm === "오후" && endH < 12) endH += 12;
                          if (timeSaleEndAmpm === "오전" && endH === 12) endH = 0;
                          const endDate = new Date(year, (parseInt(timeSaleEndMonth, 10) || 8) - 1, parseInt(timeSaleEndDay, 10) || 27, endH, parseInt(timeSaleEndMinute, 10) || 59);

                          const diffMs = Math.max(0, endDate.getTime() - nowTick);
                          const totalSec = Math.floor(diffMs / 1000);
                          const days = Math.floor(totalSec / 86400);
                          const hours = Math.floor((totalSec % 86400) / 3600);
                          const mins = Math.floor((totalSec % 3600) / 60);
                          const secs = totalSec % 60;

                          const formattedDD = String(days).padStart(2, "0");
                          const formattedHH = String(hours).padStart(2, "0");
                          const formattedMM = String(mins).padStart(2, "0");
                          const formattedSS = String(secs).padStart(2, "0");

                          const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
                          const startFormatted = `${year}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")} ${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")} (${weekDays[startDate.getDay()]}요일)`;
                          const expiryFormatted = `${year}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")} ${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")} (${weekDays[endDate.getDay()]}요일)`;

                          return (
                            <div className="bg-neutral-950 text-white p-3.5 rounded-2xl border border-neutral-800 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-xs font-black text-white">
                                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                  <Clock className="w-4 h-4 text-amber-400" /> 실시간 잔여 남은 시간:
                                </span>
                                <div className="flex items-center gap-1 font-sans">
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedDD}일
                                  </span>
                                  <span className="text-white font-black text-xs">:</span>
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedHH}시
                                  </span>
                                  <span className="text-white font-black text-xs">:</span>
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedMM}분
                                  </span>
                                  <span className="text-white font-black text-xs">:</span>
                                  <span className="bg-amber-500 text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs animate-pulse">
                                    {formattedSS}초
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between font-sans pt-1.5 border-t border-neutral-800">
                                <span>타임세일 시작/종료 일시:</span>
                                <span className="text-amber-300 font-black bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">{startFormatted} ~ {expiryFormatted}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 타임세일 중복 혜택 설정 (쿠폰 및 적립금 적용 선택) */}
                        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                            <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              <span>타임세일 추가 혜택 적용 설정 (쿠폰 / 적립금)</span>
                            </label>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Coupon & Points
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => setTimeSaleAllowCoupon(!timeSaleAllowCoupon)}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                timeSaleAllowCoupon
                                  ? "bg-amber-50/70 border-amber-400 text-amber-950"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-400"
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                timeSaleAllowCoupon ? "bg-amber-500 border-amber-500 text-neutral-950 font-black" : "border-neutral-300 bg-white"
                              }`}>
                                {timeSaleAllowCoupon && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-neutral-900">쿠폰 적용 허용</div>
                                <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                                  {timeSaleAllowCoupon ? "타임세일 특가에 고객 보유 쿠폰 추가 할인을 허용합니다." : "타임세일 특가 상품에는 쿠폰 추가 할인을 제한합니다."}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTimeSaleAllowPoints(!timeSaleAllowPoints)}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                timeSaleAllowPoints
                                  ? "bg-amber-50/70 border-amber-400 text-amber-950"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-400"
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                timeSaleAllowPoints ? "bg-amber-500 border-amber-500 text-neutral-950 font-black" : "border-neutral-300 bg-white"
                              }`}>
                                {timeSaleAllowPoints && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-neutral-900">적립금 사용 허용</div>
                                <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                                  {timeSaleAllowPoints ? "결제 시 타임세일 상품에 적립금 사용을 허용합니다." : "결제 시 타임세일 상품에 적립금 사용을 제한합니다."}
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 font-medium">타임세일 비활성화 상태입니다. 카운트다운 타이머 특가를 적용하려면 상단 토글 버튼을 켜주세요.</p>
                  )}
                </div>
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span>수량별 대량 구매 자동 할인 (Bulk Purchase Discount)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setBulkEnabled(!bulkEnabled)}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${bulkEnabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-neutral-200 text-neutral-600"
                        }`}
                    >
                      {bulkEnabled ? "활성화됨" : "비활성화됨"}
                    </button>
                  </div>

                  {bulkEnabled ? (
                    <div className="space-y-2 pt-1">
                      {bulkRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-neutral-200">
                          <span className="text-xs font-bold text-neutral-700">최소</span>
                          <input
                            type="number"
                            value={rule.qty}
                            onChange={(e) => {
                              const updated = [...bulkRules];
                              updated[idx].qty = parseInt(e.target.value) || 1;
                              setBulkRules(updated);
                            }}
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold"
                          />
                          <span className="text-xs font-bold text-neutral-700">개 이상 구매 시</span>
                          <input
                            type="number"
                            value={rule.rate}
                            onChange={(e) => {
                              const updated = [...bulkRules];
                              updated[idx].rate = parseInt(e.target.value) || 0;
                              setBulkRules(updated);
                            }}
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold"
                          />
                          <span className="text-xs font-bold text-neutral-700">% 추가 할인</span>
                          <button
                            type="button"
                            onClick={() => setBulkRules(bulkRules.filter((_, i) => i !== idx))}
                            className="ml-auto text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBulkRules([...bulkRules, { qty: 3, rate: 10 }])}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        + 구간 규칙 추가
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 font-medium">수량 할인 비활성화 상태입니다. 토글을 켜서 설정해 주세요.</p>
                  )}
                </div>
              </div>


          {/* Sticky Submit Bar */}
          <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3 sticky bottom-0 bg-white py-3 px-2 z-20 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
            >
              {isEdit ? "수정 취소" : "취소"}
            </button>
            <button
              type="submit"
              className="bg-neutral-950 hover:bg-black text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
            >
              {isEdit ? "💾 수정사항 저장 완료" : "🚀 상품 등록 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
