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
  Eye,
  EyeOff,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Heart,
  Star,
  ShieldCheck,
  Ticket,
  Menu,
  Search,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import {
  DEFAULT_COLOR_HEX_MAP,
  MEASUREMENT_KO_MAP,
  DEFAULT_SIZE_MEASUREMENTS,
  SizeMeasurementRow,
} from "@/lib/admin/constants";
import { calculateTotalStock, compressImageDataUrl } from "@/lib/admin/helpers";
import { ProductReviews } from "@/app/product/[handle]/components/product-reviews";


export interface FormTitlesConfig {
  // STEP 1: 기본 상품 정보
  productImages: string;
  price: string;
  variantCutImages: string;
  productNo: string;
  title: string;
  description: string;
  detailImages: string;
  previewScreen: string;
  categories: string;
  mainFeatured: string;
  saleStatus: string;
  scheduledRelease: string;

  // STEP 2: 옵션 및 원단 / 사이즈
  productLabel: string;
  fabricInfo: string;
  fabricComposition: string;
  fabricImage: string;
  sizeOptions: string;
  sizeGuide: string;
  sizeStock: string;

  // STEP 3: 프로모션 & 특별 할인
  timeSale: string;
  bulkDiscount: string;

  // 주문 옵션명
  option1Name: string;
  option2Name: string;
}

export const DEFAULT_FORM_TITLES: FormTitlesConfig = {
  productImages: "제품 이미지 등록 (최대 10개)",
  price: "판매가 (KRW)",
  variantCutImages: "컬러등록",
  productNo: "{formTitles.productNo}",
  title: "상품명",
  description: "{formTitles.description} (상단 제목 밑 노출)",
  detailImages: "{formTitles.detailImages}",
  previewScreen: "상세페이지 미리보기 화면",
  categories: "{formTitles.categories}",
  mainFeatured: "메인 전시 여부 (메인 슬라이더/추천 노출)",
  saleStatus: "상품 판매 상태 (즉시 구매 On/Off)",
  scheduledRelease: "판매 시작 시간 지정 (예약 오픈)",

  productLabel: "{formTitles.productLabel}",
  fabricInfo: "{formTitles.fabricInfo}",
  fabricComposition: "{formTitles.fabricComposition}",
  fabricImage: "{formTitles.fabricImage}",
  sizeOptions: "{formTitles.sizeOptions}",
  sizeGuide: "{formTitles.sizeGuide}",
  sizeStock: "{formTitles.sizeStock}",

  timeSale: "{formTitles.timeSale}",
  bulkDiscount: "대량 구매 구간별 할인 규칙 (수량 할인)",

  option1Name: "Color",
  option2Name: "Size",
};

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

  // Form titles & option names modal
  const [formTitles, setFormTitles] = useState<FormTitlesConfig>(DEFAULT_FORM_TITLES);
  const [tempTitles, setTempTitles] = useState<FormTitlesConfig>(DEFAULT_FORM_TITLES);
  const [activeTitleTab, setActiveTitleTab] = useState<"step1" | "step2" | "step3">("step1");
  const [isOptionNameModalOpen, setIsOptionNameModalOpen] = useState<boolean>(false);
  const [option1Name, setOption1Name] = useState<string>("Color");
  const [option2Name, setOption2Name] = useState<string>("Size");

  // Right Column Preview States (실제 배율 상세페이지 미리보기 패널)
  const [showPreviewPanel, setShowPreviewPanel] = useState<boolean>(true);
  const [previewMobileTab, setPreviewMobileTab] = useState<"form" | "preview">("form");
  const [previewSelectedColor, setPreviewSelectedColor] = useState<string>("");
  const [previewSelectedSize, setPreviewSelectedSize] = useState<string>("");
  const [previewActiveImageIdx, setPreviewActiveImageIdx] = useState<number>(0);
  const [previewDeviceScale, setPreviewDeviceScale] = useState<"100" | "90" | "80">("100");
  const [previewActiveTab, setPreviewActiveTab] = useState<string>("details");

  // Recent Fabrics History & Detail Img Url Input
  const [recentFabrics, setRecentFabrics] = useState<string[]>([]);
  const [detailImgUrlInput, setDetailImgUrlInput] = useState<string>("");

  // Label & Fabric
  const [label, setLabel] = useState<"" | "BLACK_LABEL" | "PREMIUM" | "ESSENTIAL">("PREMIUM");
  const [fabricComposition, setFabricComposition] = useState("COTTON 100% (프리미엄 코튼)");
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
  const [sizeGuideImage, setSizeGuideImage] = useState<string>("");
  const [sizeGuideImgUrlInput, setSizeGuideImgUrlInput] = useState<string>("");

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
            let loadedTitles = { ...DEFAULT_FORM_TITLES };
      try {
        const savedGlobal = localStorage.getItem("admin_form_titles");
        if (savedGlobal) {
          loadedTitles = { ...loadedTitles, ...JSON.parse(savedGlobal) };
        }
      } catch (e) {}

      if (initialProduct.customTitles) {
        loadedTitles = { ...loadedTitles, ...initialProduct.customTitles };
      }
      const op1 = initialProduct.options?.[0]?.name || initialProduct.optionNames?.color || loadedTitles.option1Name || "Color";
      const op2 = initialProduct.options?.[1]?.name || initialProduct.optionNames?.size || loadedTitles.option2Name || "Size";
      loadedTitles.option1Name = op1;
      loadedTitles.option2Name = op2;
      setFormTitles(loadedTitles);
      setTempTitles(loadedTitles);
      setOption1Name(op1);
      setOption2Name(op2);
      setDetailDescription(initialProduct.detailDescription || initialProduct.descriptionHtml || initialProduct.detailedInfo || "");
      const initImgs = Array.isArray(initialProduct.images) && initialProduct.images.length > 0
        ? initialProduct.images.map((img: any) => (typeof img === "string" ? img : img.url))
        : (initialProduct.featuredImage?.url ? [initialProduct.featuredImage.url] : []);
      setImages(initImgs);
      setImageUrl(initImgs[0] || "");

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

      const initFabricImg =
        initialProduct.fabricImage ||
        initialProduct.fabricTextureImage ||
        initialProduct.fabricImageUrl ||
        initialProduct.bulkDiscount?.fabricImage ||
        "";
      const rawComp =
        initialProduct.fabricComposition ||
        initialProduct.bulkDiscount?.fabricComposition ||
        "COTTON 100% (프리미엄 코튼)";
      setFabricComposition(rawComp.replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼"));
      setShowFabricBadge(Boolean(initialProduct.showFabricBadge));
      setShowFabricInfo(Boolean(initFabricImg));
      setShowSizeGuide(Boolean(initialProduct.showSizeGuide));
      setSizeGuideImage(initialProduct.sizeGuideImage || (initialProduct as any).sizeChartImage || "");
      setSizeGuideImgUrlInput("");
      setElasticity(initialProduct.elasticity || "보통");
      setSheerness(initialProduct.sheerness || "없음");
      setThickness(initialProduct.thickness || "적당함");
      setLining(initialProduct.lining || "없음");
      setFabricImage(initFabricImg);

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
      let loadedTitles = { ...DEFAULT_FORM_TITLES };
      try {
        const savedGlobal = localStorage.getItem("admin_form_titles");
        if (savedGlobal) {
          loadedTitles = { ...loadedTitles, ...JSON.parse(savedGlobal) };
        }
      } catch (e) {}
      setFormTitles(loadedTitles);
      setTempTitles(loadedTitles);
      setOption1Name(loadedTitles.option1Name || "Color");
      setOption2Name(loadedTitles.option2Name || "Size");
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
      setFabricComposition("COTTON 100% (프리미엄 코튼)");
      setShowFabricBadge(false);
      setShowFabricInfo(true);
      setShowSizeGuide(false);
      setSizeGuideImage("");
      setSizeGuideImgUrlInput("");
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
        const compressed = await compressImageDataUrl(rawResult, 1920, 0.92);
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
            const compressed = await compressImageDataUrl(raw, 1920, 0.92);
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

  // Helper to extract image srcs from detailDescription HTML or plain text
  const extractImagesFromHtml = (html: string): string[] => {
    if (!html) return [];
    const srcs: string[] = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) srcs.push(match[1]);
    }
    if (srcs.length === 0) {
      const trimmed = html.trim();
      if (
        trimmed.startsWith("data:image/") ||
        /^https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(trimmed) ||
        /^\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(trimmed)
      ) {
        srcs.push(trimmed);
      }
    }
    return srcs;
  };

  // Remove specific image from detailDescription
  const removeImageFromDetailDescription = (imgSrc: string) => {
    if (!detailDescription) return;
    const parts = detailDescription.split("\n");
    const filtered = parts.filter((line) => !line.includes(imgSrc));
    let updated = filtered.join("\n").trim();
    if (updated === detailDescription.trim()) {
      updated = detailDescription.replaceAll(imgSrc, "").trim();
    }
    setDetailDescription(updated);
    triggerToast("상세 사진이 삭제되었습니다.");
  };

  // Upload handler for high-resolution detail images
  const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImgTags: string[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const raw = evt.target?.result as string;
          if (raw) {
            const compressed = await compressImageDataUrl(raw, 1920, 0.92);
            resolve(compressed);
          } else {
            resolve("");
          }
        };
        reader.readAsDataURL(file);
      });
      if (dataUrl) {
        newImgTags.push(`<p><img src="${dataUrl}" alt="상세 사진" class="w-full h-auto rounded-xl my-2 block" /></p>`);
      }
    }
    if (newImgTags.length > 0) {
      setDetailDescription((prev) => (prev ? `${prev}\n${newImgTags.join("\n")}` : newImgTags.join("\n")));
      triggerToast(`${newImgTags.length}개의 상세 사진이 고해상도로 추가되었습니다.`);
    }
    e.target.value = "";
  };

  // Handle Add Color Option (제품컷 이미지 필수)
  const handleAddColorOption = () => {
    const trimmed = customColor.trim().toUpperCase();
    if (!trimmed) {
      alert("옵션/컬러명을 입력해주세요.");
      triggerToast("옵션/컬러명을 입력해주세요.");
      return;
    }
    if (!customColorImg) {
      alert("제품을 등록해주세요");
      triggerToast("제품을 등록해주세요");
      return;
    }
    if (colors.includes(trimmed)) {
      alert("이미 등록된 컬러입니다.");
      triggerToast("이미 등록된 컬러입니다.");
      return;
    }

    setColors([...colors, trimmed]);
    setColorImages((prev) => ({ ...prev, [trimmed]: customColorImg }));
    setCustomColor("");
    setCustomColorImg("");
    triggerToast(`'${trimmed}' 컬러가 등록되었습니다.`);
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
      customTitles: formTitles,
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
      descriptionHtml: detailDescription || (description ? `<p>${description}</p>` : ""),
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
      sizeGuideImage: sizeGuideImage ? sizeGuideImage.trim() : undefined,
      showFabricBadge,
      showFabricInfo: Boolean(fabricImage && fabricImage.trim() !== ""),
      showSizeGuide,
      fabricComposition: (fabricComposition || "").replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼"),
      elasticity,
      sheerness,
      thickness,
      lining,
      fabricImage: fabricImage.trim(),
      fabricTextureImage: fabricImage.trim(),
      bulkDiscount: {
        enabled: bulkEnabled,
        rules: bulkRules,
        fabricImage: fabricImage.trim(),
        fabricTextureImage: fabricImage.trim(),
        fabricComposition: (fabricComposition || "").replace(/프리미엄 콤마 코튼/g, "프리미엄 코튼"),
        showFabricInfo: Boolean(fabricImage && fabricImage.trim() !== ""),
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
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div
        className={`bg-white border border-neutral-200 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-all ${
          showPreviewPanel
            ? "max-w-[1440px] xl:max-w-[1560px] 2xl:max-w-[1680px] max-h-[95vh] h-[95vh]"
            : "max-w-4xl max-h-[90vh]"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 sm:px-6 py-3.5 bg-white sticky top-0 shrink-0 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
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

            {/* 옵션명 수정 버튼 */}
            <button
              type="button"
              onClick={() => {
                setTempTitles({ ...formTitles });
                setActiveTitleTab("step1");
                setIsOptionNameModalOpen(true);
              }}
              className="ml-1 sm:ml-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-neutral-400"
              title="상품 등록 및 상품 수정에 포함된 각 항목의 제목(옵션명)들을 수정합니다"
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-700" />
              <span>옵션명 수정</span>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md font-bold">
                제목 수정
              </span>
            </button>

            {/* 우측 실제 배율 미리보기 ON/OFF 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowPreviewPanel((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                showPreviewPanel
                  ? "bg-neutral-950 text-white border border-neutral-950"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300"
              }`}
              title="우측 상세페이지 실제 배율 미리보기 패널을 켜거나 끕니다"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">실제 배율 미리보기</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  showPreviewPanel ? "bg-white text-neutral-950" : "bg-neutral-300 text-neutral-800"
                }`}
              >
                {showPreviewPanel ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Switcher (Visible only on < lg when preview is ON) */}
            {showPreviewPanel && (
              <div className="flex lg:hidden items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setPreviewMobileTab("form")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    previewMobileTab === "form" ? "bg-white text-neutral-950 shadow-2xs" : "text-neutral-500"
                  }`}
                >
                  폼 작성
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMobileTab("preview")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    previewMobileTab === "preview" ? "bg-white text-neutral-950 shadow-2xs" : "text-neutral-500"
                  }`}
                >
                  📱 미리보기
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-950 text-sm p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Left Column (Form) + Right Column (Actual Scale Detail Page Preview) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#FAF9F5]">
          {/* Left Column: Form & Menu Container */}
          <form
            onSubmit={handleSubmit}
            className={`flex-1 min-w-0 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-8 bg-[#FAF9F5] ${
              !showPreviewPanel || previewMobileTab === "form" ? "block" : "hidden lg:block"
            }`}
          >
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
                    <label className="block text-xs font-bold text-neutral-700 mb-1">{formTitles.title} *</label>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      {formTitles.productImages} *
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

                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{formTitles.price} *</label>
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

                <div className="space-y-3 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-neutral-700" />
                      <span>{formTitles.detailImages}</span>
                    </label>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                      상세페이지 하단 연동
                    </span>
                  </div>

                  {/* Thumbnail List of registered detail images */}
                  {extractImagesFromHtml(detailDescription).length > 0 && (
                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-neutral-200/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                        <span>등록된 상세 사진 ({extractImagesFromHtml(detailDescription).length}개)</span>
                        <span className="text-[10px] text-neutral-400">마우스 호버 시 삭제</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {extractImagesFromHtml(detailDescription).map((src, idx) => (
                          <div
                            key={`${src.slice(0, 30)}-${idx}`}
                            className="relative w-16 h-20 rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-50 group shadow-2xs shrink-0"
                          >
                            <img src={src} alt={`상세컷 ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1 py-0.2 rounded">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeImageFromDetailDescription(src)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                              title="상세 사진 삭제"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-200" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dropzone for High-Res Detail Images */}
                  <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[96px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 rounded-2xl cursor-pointer transition-all p-3 text-center group">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mb-1 shadow-xs group-hover:scale-110 transition-transform">
                      <Upload className="w-3.5 h-3.5 text-neutral-700" />
                    </div>
                    <span className="text-xs font-bold text-neutral-800">
                      클릭하여 상세페이지 사진 추가 (복수 선택 가능, 고해상도 유지)
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      1920px 고해상도 화질 보존 / 세로 롱배너 깨짐 없이 최적화
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleDetailImageUpload(e)}
                      className="hidden"
                    />
                  </label>


                  {/* Direct HTML / Code View Toggle */}
                  <details className="text-xs">
                    <summary className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer select-none py-1">
                      상세 HTML / 텍스트 직접 편집 (고급)
                    </summary>
                    <div className="pt-2">
                      <textarea
                        rows={3}
                        placeholder="상세 페이지 하단 '제품 상세 사진' 아코디언 메뉴에 표시될 상세 사진/HTML 코드를 입력하세요."
                        value={detailDescription}
                        onChange={(e) => setDetailDescription(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                      />
                    </div>
                  </details>
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



                {/* 3. 판매 시작 시간 지정 (예약 오픈) - 독립된 깔끔한 카드 */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    {formTitles.scheduledRelease || "판매 시작 시간 지정 (예약 오픈)"}
                  </label>
                  <div
                    className={`rounded-2xl border transition-all select-none p-4 ${
                      isScheduledRelease
                        ? "bg-neutral-50/80 border-neutral-300 shadow-2xs"
                        : "bg-white border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    {/* 상단 클릭 행 (토글 컨트롤) */}
                    <div
                      onClick={() => {
                        const next = !isScheduledRelease;
                        setIsScheduledRelease(next);
                        if (next && !releaseDate) {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(10, 0, 0, 0);
                          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setReleaseDate(iso);
                        }
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                            isScheduledRelease
                              ? "bg-neutral-950 border-neutral-950 text-white"
                              : "border-neutral-300 bg-white"
                          }`}
                        >
                          {isScheduledRelease && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="block font-black text-xs text-neutral-950">
                              ⏰ 판매 시작 시간 예약 (오픈 예정 기능)
                            </span>
                            <span className="text-[10px] text-neutral-600 font-extrabold bg-white border border-neutral-200 px-2 py-0.5 rounded-full shadow-2xs">
                              지정 시간 도달 시 자동 구매 오픈
                            </span>
                          </div>
                          <span className="block text-[11px] font-medium text-neutral-500 mt-0.5">
                            지정 시간 전까지 '오픈 예정'으로 전시되며, 설정한 시간에 자동으로 구매가 열립니다.
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                          isScheduledRelease
                            ? "bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-2xs"
                            : "bg-neutral-100 text-neutral-500 border-neutral-200 font-bold"
                        }`}
                      >
                        {isScheduledRelease ? "예약 설정 중" : "상시 판매 (미설정)"}
                      </span>
                    </div>

                    {/* 활성화 시 부드럽게 나타나는 프리미엄 일시 선택 커스텀 UI */}
                    {isScheduledRelease && (() => {
                      const d = releaseDate ? new Date(releaseDate) : new Date();
                      const validDate = isNaN(d.getTime()) ? new Date() : d;

                      const currentYear = validDate.getFullYear();
                      const currentMonth = validDate.getMonth() + 1; // 1 ~ 12
                      const currentDay = validDate.getDate(); // 1 ~ 31
                      const currentHours24 = validDate.getHours(); // 0 ~ 23
                      const currentMinutes = validDate.getMinutes(); // 0 ~ 59

                      const isPM = currentHours24 >= 12;
                      const ampm: "오전" | "오후" = isPM ? "오후" : "오전";
                      const displayHour12 = currentHours24 === 0 ? 12 : currentHours24 > 12 ? currentHours24 - 12 : currentHours24;

                      const pad = (n: number) => String(n).padStart(2, "0");

                      const handleUpdate = (updates: {
                        year?: number;
                        month?: number;
                        day?: number;
                        ampm?: "오전" | "오후";
                        hour12?: number;
                        minutes?: number;
                      }) => {
                        const y = updates.year ?? currentYear;
                        const m = updates.month ?? currentMonth;
                        let dVal = updates.day ?? currentDay;
                        const targetAmpm = updates.ampm ?? ampm;
                        const targetHour12 = updates.hour12 ?? displayHour12;
                        const min = updates.minutes ?? currentMinutes;

                        let h24 = targetHour12;
                        if (targetAmpm === "오후" && targetHour12 < 12) {
                          h24 = targetHour12 + 12;
                        } else if (targetAmpm === "오전" && targetHour12 === 12) {
                          h24 = 0;
                        }

                        const lastDayOfMonth = new Date(y, m, 0).getDate();
                        if (dVal > lastDayOfMonth) dVal = lastDayOfMonth;

                        const newIso = `${y}-${pad(m)}-${pad(dVal)}T${pad(h24)}:${pad(min)}`;
                        setReleaseDate(newIso);
                      };

                      const handlePreset = (offsetDays: number, hour24: number, min: number = 0) => {
                        const target = new Date();
                        target.setDate(target.getDate() + offsetDays);
                        target.setHours(hour24, min, 0, 0);
                        const newIso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
                        setReleaseDate(newIso);
                      };

                      const now = Date.now();
                      const diffMs = validDate.getTime() - now;
                      const isFuture = diffMs > 0;

                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                      let countdownText = "";
                      if (isFuture) {
                        if (diffDays > 0) {
                          countdownText = `D-${diffDays} (${diffDays}일 ${diffHours}시간 뒤)`;
                        } else if (diffHours > 0) {
                          countdownText = `${diffHours}시간 ${diffMinutes}분 뒤 오픈`;
                        } else {
                          countdownText = `${Math.max(1, diffMinutes)}분 뒤 오픈 예정`;
                        }
                      }

                      const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
                      const dayOfWeek = weekDays[validDate.getDay()];
                      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

                      return (
                        <div className="mt-3.5 pt-3.5 border-t border-neutral-200/80 space-y-3.5 animate-in fade-in duration-200">
                          {/* 1. 실시간 일정 요약 카드 (블랙 & 앰버 테마) */}
                          <div className="bg-neutral-950 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-neutral-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                <Calendar className="w-5 h-5 text-amber-400" />
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">
                                  예약 오픈 지정 일시
                                </span>
                                <span className="text-sm font-black text-white tracking-tight">
                                  {currentYear}년 {currentMonth}월 {currentDay}일 ({dayOfWeek}) {ampm} {displayHour12}시 {pad(currentMinutes)}분
                                </span>
                              </div>
                            </div>
                            <div className="self-start sm:self-center">
                              {isFuture ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-500 text-neutral-950 px-3 py-1.5 rounded-full shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-neutral-950 inline-block animate-ping"></span>
                                  {countdownText}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-800 text-emerald-400 px-3 py-1.5 rounded-full border border-neutral-700">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  시간 경과 (현재 구매 가능 상태)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2. 빠른 간편 프리셋 버튼들 */}
                          <div className="bg-neutral-50/90 rounded-2xl p-3.5 border border-neutral-200/80 space-y-2">
                            <span className="text-[11px] font-bold text-neutral-600 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              자주 쓰는 오픈 일정 빠른 선택
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const getPreset = (title: string, days: number, h: number, timeStr: string) => {
                                  const target = new Date();
                                  target.setDate(target.getDate() + days);
                                  const dayName = weekDays[target.getDay()];
                                  return {
                                    label: `${title}(${dayName}) ${timeStr}`,
                                    days,
                                    h,
                                  };
                                };

                                const presets = [
                                  getPreset("오늘", 0, 20, "저녁 8시"),
                                  getPreset("내일", 1, 10, "오전 10시"),
                                  getPreset("내일", 1, 20, "저녁 8시"),
                                  getPreset("3일 뒤", 3, 10, "오전 10시"),
                                  getPreset("1주일 뒤", 7, 10, "오전 10시"),
                                ];

                                return presets.map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handlePreset(preset.days, preset.h)}
                                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-neutral-950 hover:text-white border border-neutral-200 hover:border-neutral-950 text-neutral-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    {preset.label}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>

                          {/* 3. 모던 커스텀 셀렉트 패널 (날짜 + 시간) */}
                          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-2xs space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 좌측: 날짜 선택 */}
                              <div className="space-y-2">
                                {(() => {
                                  const todayDate = new Date();
                                  const isSelectedToday =
                                    todayDate.getFullYear() === currentYear &&
                                    todayDate.getMonth() + 1 === currentMonth &&
                                    todayDate.getDate() === currentDay;

                                  return (
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>날짜 지정</span>
                                        {isSelectedToday && (
                                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                                            오늘
                                          </span>
                                        )}
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const now = new Date();
                                          handleUpdate({
                                            year: now.getFullYear(),
                                            month: now.getMonth() + 1,
                                            day: now.getDate(),
                                          });
                                        }}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200/90 border border-neutral-200 px-2 py-0.5 rounded-md transition-all cursor-pointer shadow-2xs"
                                        title="오늘 날짜로 즉시 설정"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                        <span>오늘 ({todayDate.getMonth() + 1}월 {todayDate.getDate()}일)</span>
                                      </button>
                                    </div>
                                  );
                                })()}
                                <div className="grid grid-cols-3 gap-2">
                                  {/* 년도 */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">연도</span>
                                    <select
                                      value={currentYear}
                                      onChange={(e) => handleUpdate({ year: parseInt(e.target.value, 10) })}
                                      className="w-full h-10 bg-neutral-50 hover:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-all cursor-pointer"
                                    >
                                      {[2026, 2027, 2028].map((y) => (
                                        <option key={y} value={y}>{y}년</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* 월 */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">월</span>
                                    <select
                                      value={currentMonth}
                                      onChange={(e) => handleUpdate({ month: parseInt(e.target.value, 10) })}
                                      className="w-full h-10 bg-neutral-50 hover:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-all cursor-pointer"
                                    >
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>{m}월</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* 일 (요일 및 오늘 표시 포함) */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">일 (요일)</span>
                                    <select
                                      value={currentDay}
                                      onChange={(e) => handleUpdate({ day: parseInt(e.target.value, 10) })}
                                      className="w-full h-10 bg-neutral-50 hover:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none transition-all cursor-pointer"
                                    >
                                      {(() => {
                                        const now = new Date();
                                        return Array.from({ length: daysInMonth }, (_, i) => {
                                          const dayNum = i + 1;
                                          const targetDate = new Date(currentYear, currentMonth - 1, dayNum);
                                          const dayName = weekDays[targetDate.getDay()];
                                          const isTodayDay =
                                            now.getFullYear() === currentYear &&
                                            now.getMonth() + 1 === currentMonth &&
                                            now.getDate() === dayNum;

                                          return (
                                            <option key={dayNum} value={dayNum}>
                                              {dayNum}일 ({dayName}){isTodayDay ? " • 오늘" : ""}
                                            </option>
                                          );
                                        });
                                      })()}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* 우측: 시간 선택 */}
                              <div className="space-y-2">
                                <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  시간 지정
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {/* 오전/오후 세그먼트 */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">구분</span>
                                    <div className="h-10 bg-neutral-100 p-1 rounded-xl flex items-center gap-1 border border-neutral-200/80">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdate({ ampm: "오전" })}
                                        className={`flex-1 h-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          ampm === "오전"
                                            ? "bg-neutral-950 text-white shadow-2xs font-black"
                                            : "text-neutral-500 hover:text-neutral-900"
                                        }`}
                                      >
                                        오전
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdate({ ampm: "오후" })}
                                        className={`flex-1 h-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          ampm === "오후"
                                            ? "bg-neutral-950 text-white shadow-2xs font-black"
                                            : "text-neutral-500 hover:text-neutral-900"
                                        }`}
                                      >
                                        오후
                                      </button>
                                    </div>
                                  </div>

                                  {/* 시 */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">시 (Hour)</span>
                                    <select
                                      value={displayHour12}
                                      onChange={(e) => handleUpdate({ hour12: parseInt(e.target.value, 10) })}
                                      className="w-full h-10 bg-neutral-50 hover:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-all cursor-pointer font-mono"
                                    >
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                        <option key={h} value={h}>{h}시</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* 분 */}
                                  <div>
                                    <span className="text-[10px] text-neutral-400 font-bold block mb-1">분 (Minute)</span>
                                    <select
                                      value={currentMinutes}
                                      onChange={(e) => handleUpdate({ minutes: parseInt(e.target.value, 10) })}
                                      className="w-full h-10 bg-neutral-50 hover:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl px-2.5 text-xs font-bold text-neutral-950 focus:outline-none transition-all cursor-pointer font-mono"
                                    >
                                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map((m) => (
                                        <option key={m} value={m}>{pad(m)}분</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 부가 안내 문구 */}
                            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 leading-relaxed font-medium">
                              <span>* 설정된 오픈 일시 도달 전에는 상품 상세에 "오픈 예정" 배지가 노출되며 장바구니/구매 버튼이 비활성화됩니다.</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-neutral-950 flex items-center gap-1.5 uppercase tracking-wider">
                        🧵 원단 정보 설정 (Fabric Details)
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-colors ${
                          fabricImage.trim() ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-500"
                        }`}
                      >
                        {fabricImage.trim() ? "상세페이지 노출 활성화됨" : "원단 이미지 미등록 시 자동 숨김"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">소재 (FABRIC)</label>
                    <input
                      type="text"
                      value={fabricComposition}
                      onChange={(e) => setFabricComposition(e.target.value)}
                      placeholder="예: COTTON 100% (프리미엄 코튼)"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
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
                                  const compressed = await compressImageDataUrl(raw, 1920, 0.92);
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

                  </div>
                </div>

                {/* 2. OPTION / PRODUCT CUTS (컬러등록) */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      <span>{formTitles.variantCutImages && formTitles.variantCutImages !== "{formTitles.variantCutImages}" ? formTitles.variantCutImages : "컬러등록"}</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {colors.length}개 컬러 등록됨
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    💡 각 옵션별 <strong>실제 제품컷 사진을 필수로 등록</strong>해야 컬러를 추가할 수 있습니다.
                  </p>

                  {/* Add New Color Option with Product Cut */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      {/* 옵션/컬러명 입력창 (왼쪽) */}
                      <input
                        type="text"
                        placeholder="옵션/컬러명 입력 (예: 블랙, 크림, 올리브)"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddColorOption();
                          }
                        }}
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold"
                      />

                      {/* 제품컷 이미지 업로드 버튼 (오른쪽) */}
                      {customColorImg ? (
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-neutral-900 bg-neutral-100 shrink-0">
                          <img src={customColorImg} alt="제품컷 미리보기" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setCustomColorImg("")}
                            className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="h-10 px-3 rounded-xl border border-dashed border-neutral-300 hover:border-black flex items-center gap-1.5 cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors shrink-0">
                          <Upload className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="text-xs font-bold text-neutral-600">제품컷 업로드 (필수)</span>
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
                                    const compressed = await compressImageDataUrl(raw, 1920, 0.92);
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

                      {/* + 컬러 추가 버튼 */}
                      <button
                        type="button"
                        onClick={handleAddColorOption}
                        className="px-4 py-2.5 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        + 컬러 추가
                      </button>
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
                                          const compressed = await compressImageDataUrl(raw, 1920, 0.92);
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
                    {/* 좌측: 타이틀 및 선택 개수 안내 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/80 border border-blue-200 flex items-center justify-center shrink-0">
                        <Ruler className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-extrabold text-neutral-900">
                          사이즈 (Size) 옵션 선택
                        </label>
                        <span className="text-[10px] font-mono font-extrabold text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded-full shadow-2xs">
                          {sizes.length}개 선택됨
                        </span>
                      </div>
                    </div>

                    {/* 우측: 상세페이지에 표시 체크박스 */}
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
                        {showSizeGuide ? "ON" : "OFF"}
                      </span>
                    </label>
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
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200/70">
                    {/* 좌측: 타이틀 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100/80 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Ruler className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <label className="text-xs font-extrabold text-neutral-900 cursor-pointer">
                        사이즈별 실측 치수 가이드 (Size Chart Measurement Table)
                      </label>
                    </div>

                    {/* 우측: 상세페이지에 표시 체크박스 */}
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
                        {showSizeGuide ? "ON" : "OFF"}
                      </span>
                    </label>
                  </div>

                  {/* 📐 사이즈 실측 안내 이미지 업로드 영역 */}
                  <div className="bg-white border border-neutral-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          사이즈 실측 치수 가이드 이미지 (Size Guide Image)
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                          선택 사항
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        * 상세페이지 사이즈 차트(표) 상단에 대표 이미지로 노출됩니다.
                      </span>
                    </div>

                    {sizeGuideImage ? (
                      <div className="relative w-full rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-50 group shadow-2xs">
                        <img
                          src={sizeGuideImage}
                          alt="사이즈 가이드 이미지"
                          className="w-full h-auto max-h-[220px] object-contain block mx-auto py-2"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <label className="bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm">
                            <Upload className="w-3.5 h-3.5" /> 이미지 변경
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
                                      const compressed = await compressImageDataUrl(raw, 1920, 0.92);
                                      setSizeGuideImage(compressed);
                                      triggerToast("사이즈 가이드 이미지가 변경되었습니다.");
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSizeGuideImage("");
                              triggerToast("사이즈 가이드 이미지가 삭제되었습니다.");
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <X className="w-3.5 h-3.5" /> 이미지 삭제
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[100px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-neutral-50/60 hover:bg-neutral-100/60 rounded-xl cursor-pointer transition-all p-3 text-center group">
                        <Upload className="w-4 h-4 text-neutral-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-neutral-800">
                          클릭하여 사이즈 실측 안내 / 피팅 가이드 이미지 업로드
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          JPG, PNG, WEBP (고해상도 유지 / 상세페이지 사이즈 차트 표 위에 노출)
                        </span>
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
                                  const compressed = await compressImageDataUrl(raw, 1920, 0.92);
                                  setSizeGuideImage(compressed);
                                  triggerToast("사이즈 가이드 이미지가 등록되었습니다.");
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
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
                      <span>{formTitles.bulkDiscount}</span>
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

        {/* Right Column: Complete Mobile Detail Page Preview (실제 상세페이지와 100% 동일한 구조) */}
        {showPreviewPanel && (() => {
          // 1. 등록된 제품정보 연동
          const displayTitle = title.trim();
          const cleanTitle = displayTitle
            ? displayTitle.replace(/\[?(PREMIUM|BLACK_LABEL|BLACK LABEL|ESSENTIAL)\]?/gi, "").trim()
            : "";

          // Pricing calculations
          const rawPriceNum = price.trim()
            ? (parseInt(String(price).replace(/[^0-9]/g, ""), 10) || 0)
            : null;

          const timeSaleRateNum = parseInt(timeSaleDiscountRate, 10) || 0;
          const isSaleEffective = isTimeSale && timeSaleRateNum > 0 && rawPriceNum !== null && rawPriceNum > 0;
          const regularTimeSalePrice = isSaleEffective
            ? Math.round((rawPriceNum || 0) * (1 - timeSaleRateNum / 100))
            : (rawPriceNum || 0);

          const effectivePrice = isSaleEffective ? regularTimeSalePrice : (rawPriceNum || 0);

          // Images resolution
          const candidateImages: string[] = images.length > 0
            ? images
            : (imageUrl.trim() ? [imageUrl.trim()] : []);

          // Colors & cuts resolution
          const effectiveColors: string[] = colors;
          const activeColor = previewSelectedColor && effectiveColors.includes(previewSelectedColor)
            ? previewSelectedColor
            : (effectiveColors[0] || "");

          const mergedColorImages: Record<string, string> = { ...colorImages };
          const activeColorCut = activeColor && mergedColorImages[activeColor] ? mergedColorImages[activeColor] : "";

          const heroImage =
            activeColorCut ||
            candidateImages[previewActiveImageIdx] ||
            candidateImages[0] ||
            "";

          // Sizes resolution
          const effectiveSizes: string[] = sizes;
          const activeSize = previewSelectedSize && effectiveSizes.includes(previewSelectedSize)
            ? previewSelectedSize
            : (effectiveSizes[0] || "");

          // Descriptions
          const displayDescription = description.trim();
          const displayDetailDescription = detailDescription.trim();
          const displayFabricComposition = fabricComposition.trim();
          const displayFabricImage = fabricImage.trim();
          const displayLabel = label;

          // Tabs for mobile accordions sliding menu
          const mobileTabs = [
            { id: "reviews", label: "고객 후기", tooltip: "✨ 베스트댓글 선정 시, 최대 50,000원" },
            { id: "details", label: "제품 상세 사진" },
            ...(displayFabricImage ? [{ id: "fabric", label: "원단 정보" }] : []),
            ...(showSizeGuide ? [{ id: "guide", label: "사이즈 가이드" }] : []),
            { id: "care", label: "배송 및 반품" },
          ];

          return (
            <aside
              className={`w-full lg:w-[440px] xl:w-[480px] 2xl:w-[500px] shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-100 flex flex-col overflow-hidden ${
                previewMobileTab === "form" ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Preview Column Top Toolbar */}
              <div className="px-4 py-3 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-black text-neutral-900">{formTitles.previewScreen}</span>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    모바일 1:1 배율
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Zoom/Scale Switcher */}
                  <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-[10px] font-bold">
                    {(["100", "90", "80"] as const).map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setPreviewDeviceScale(sc)}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          previewDeviceScale === sc
                            ? "bg-white text-neutral-950 shadow-2xs font-black"
                            : "text-neutral-500 hover:text-neutral-800"
                        }`}
                        title={`화면 배율 ${sc}%`}
                      >
                        {sc}%
                      </button>
                    ))}
                  </div>

                  {/* Close Preview Panel */}
                  <button
                    type="button"
                    onClick={() => setShowPreviewPanel(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                    title="미리보기 화면 닫기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Device Canvas Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex justify-center items-start bg-neutral-100/90 no-scrollbar">
                <div
                  className="w-[390px] shrink-0 transition-transform duration-200 origin-top mb-10"
                  style={{
                    transform:
                      previewDeviceScale === "90"
                        ? "scale(0.9)"
                        : previewDeviceScale === "80"
                        ? "scale(0.8)"
                        : "scale(1)",
                  }}
                >
                  {/* Smartphone Frame (실제 모바일 뷰포트 높이) */}
                  <div className="rounded-[44px] border-[8px] border-neutral-950 bg-white shadow-2xl overflow-hidden flex flex-col h-[844px] max-h-[85vh] relative">
                    {/* Top Speaker / Dynamic Island */}
                    <div className="pt-2 pb-1 bg-white flex justify-center items-center shrink-0 select-none">
                      <div className="w-24 h-4.5 bg-neutral-950 rounded-full flex items-center justify-end pr-2.5">
                        <div className="w-2 h-2 rounded-full bg-neutral-800" />
                      </div>
                    </div>

                    {/* Phone Status Bar */}
                    <div className="px-6 py-1 flex items-center justify-between text-[11px] font-bold text-neutral-900 bg-white shrink-0 select-none">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold">
                        <span>5G</span>
                        <span className="w-5 h-2.5 border border-neutral-900 rounded-sm p-0.5 flex items-center">
                          <span className="w-3 h-full bg-neutral-900 rounded-2xs" />
                        </span>
                      </div>
                    </div>

                    {/* Mobile Store Navigation Header (실제 쇼핑몰 글로벌 헤더와 100% 동일) */}
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-30">
                      <div className="flex items-center gap-2.5 text-neutral-800">
                        <button type="button" className="p-1 cursor-default" onClick={(e) => e.preventDefault()}>
                          <Menu className="w-4 h-4" />
                        </button>
                        <span className="font-serif tracking-[0.2em] text-sm font-black text-neutral-950">CHOICOMMA</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-neutral-700">
                        <button type="button" className="p-1 cursor-default" onClick={(e) => e.preventDefault()}>
                          <Search className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" className="p-1 relative cursor-default" onClick={(e) => e.preventDefault()}>
                          <ShoppingBag className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neutral-950 text-white text-[8px] font-bold flex items-center justify-center">0</span>
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Mobile Detail Page Body (실제 상세페이지 컴포넌트 구조와 100% 일치) */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-10 bg-white">
                      {/* 1. Mobile Gallery Slider (실제 MobileGallerySlider와 동일한 380px 높이 & object-contain) */}
                      <div className="relative w-full h-[380px] bg-neutral-50 overflow-hidden select-none">
                        {heroImage ? (
                          <img
                            src={heroImage}
                            alt="상품 대표 이미지"
                            className="w-full h-full object-contain object-center transition-all duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-100/60 flex items-center justify-center text-neutral-300" />
                        )}

                        {/* Multiple Images Counter Badge */}
                        {candidateImages.length > 1 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                            <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-white/90 border border-neutral-200 rounded-full shadow-2xs text-neutral-800">
                              {previewActiveImageIdx + 1}/{candidateImages.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Multiple Images Thumbnail Dots */}
                      {candidateImages.length > 1 && (
                        <div className="flex items-center justify-center gap-1.5 py-2 border-b border-neutral-100 bg-neutral-50/50">
                          {candidateImages.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPreviewActiveImageIdx(idx);
                                setPreviewSelectedColor("");
                              }}
                              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                                !activeColorCut && previewActiveImageIdx === idx
                                  ? "w-5 bg-neutral-950"
                                  : "bg-neutral-300 hover:bg-neutral-400"
                              }`}
                              title={`${idx + 1}번 사진`}
                            />
                          ))}
                        </div>
                      )}

                      {/* 2. Product Detail Header Block (실제 ProductDetailHeader와 100% 동일한 구조) */}
                      <div className="p-4 flex flex-col gap-4 w-full font-sans text-neutral-900">
                        <div className="flex flex-col items-start gap-1">
                          {/* Badges Row above Product Title (실제 설정된 뱃지만 노출) */}
                          {(displayLabel || isSaleEffective || isScheduledRelease || availableForSale === false) && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {/* Product Label Badge */}
                              {displayLabel && (
                                <span
                                  className={`text-[11px] font-black px-2.5 py-1 uppercase tracking-wider rounded-sm shrink-0 whitespace-nowrap ${
                                    displayLabel === "BLACK_LABEL"
                                      ? "bg-black text-white"
                                      : displayLabel === "PREMIUM"
                                      ? "bg-neutral-600 text-white"
                                      : "bg-neutral-200 text-neutral-800"
                                  }`}
                                >
                                  {displayLabel.replace("_", " ")}
                                </span>
                              )}

                              {/* Fabric Badge */}
                              {showFabricBadge && displayFabricComposition && (
                                <span className="text-[11px] font-bold px-2.5 py-1 uppercase tracking-wider rounded-sm bg-white text-black border border-black shadow-2xs shrink-0 whitespace-nowrap">
                                  {displayFabricComposition.replace(/^ORIGIN:\s*/i, "").trim()}
                                </span>
                              )}

                              {/* TimeSale Badge */}
                              {isSaleEffective && (
                                <span className="text-[11px] font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-950 text-white flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap">
                                  <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                                  TIME SALE {timeSaleRateNum}% OFF
                                </span>
                              )}

                              {/* Scheduled or Availability Badge */}
                              {isScheduledRelease ? (
                                <span className="text-[11px] font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-amber-500 text-neutral-950 shadow-2xs shrink-0 whitespace-nowrap flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-neutral-950" />
                                  <span>{releaseDate ? `${new Date(releaseDate).getMonth() + 1}월 ${new Date(releaseDate).getDate()}일 오픈 예정` : "오픈 예정"}</span>
                                </span>
                              ) : availableForSale === false ? (
                                <span className="text-[11px] font-black px-2.5 py-1 uppercase tracking-wider rounded-sm bg-neutral-900 text-white shadow-2xs shrink-0 whitespace-nowrap">
                                  품절
                                </span>
                              ) : null}
                            </div>
                          )}

                          {/* 1. Product Title (실제 h1 스타일 적용) */}
                          <h1 className="text-2xl font-normal tracking-tight uppercase leading-snug">
                            {cleanTitle || <span className="text-neutral-300 font-light">상품명</span>}
                          </h1>

                          {/* 2. 정상가 표시 및 하단 라인 (실제 쇼핑몰과 100% 동일) */}
                          <div className="flex items-baseline justify-between w-full mt-2.5 mb-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-normal text-neutral-500 whitespace-nowrap">정상가</span>
                            </div>
                            <div className="flex items-baseline gap-2 shrink-0 whitespace-nowrap">
                              <span className="text-xl font-normal text-neutral-800 tracking-tight font-mono whitespace-nowrap">
                                {rawPriceNum !== null && rawPriceNum > 0 ? (
                                  `${rawPriceNum.toLocaleString("ko-KR")}원`
                                ) : (
                                  <span className="text-neutral-300">0원</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 정상가 하단 구분 라인 */}
                          <div className="w-full border-b border-neutral-200/90 my-2" />

                          {/* 3. 타임세일 적용가 (타임세일 적용 시) */}
                          {isSaleEffective && (
                            <div className="w-full flex flex-col gap-2 py-1">
                              <div className="flex items-center justify-between w-full text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-neutral-700 whitespace-nowrap">타임세일 적용가</span>
                                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 whitespace-nowrap">
                                    {timeSaleRateNum}% OFF
                                  </span>
                                </div>
                                <span className="font-bold text-neutral-900 font-mono whitespace-nowrap">
                                  {regularTimeSalePrice.toLocaleString("ko-KR")}원
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 간단 설명 */}
                          {displayDescription && (
                            <p className="text-xs text-neutral-600 leading-relaxed mt-1">
                              {displayDescription}
                            </p>
                          )}
                        </div>

                        {/* 4. Color / Product Cut Option Thumbnails (실제 쇼핑몰 스탠드얼론 컷 스타일) */}
                        {effectiveColors.length > 0 && (
                          <div className="flex flex-col items-start gap-2 mt-2">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-900">
                              <span>{option1Name}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-start gap-3">
                              {effectiveColors.map((color, idx) => {
                                const isSelected = activeColor === color;
                                const colorStr = String(color);
                                const customImg = mergedColorImages[colorStr];
                                const fallbackImg = candidateImages[idx] || candidateImages[0] || "/product_1.webp";
                                const cutImgUrl = customImg || fallbackImg;

                                return (
                                  <button
                                    key={`color-${colorStr}-${idx}`}
                                    type="button"
                                    onClick={() => setPreviewSelectedColor(colorStr)}
                                    className="flex flex-col items-center gap-1.5 cursor-pointer group focus:outline-none select-none"
                                    title={colorStr}
                                  >
                                    <span
                                      className={`text-[11px] uppercase tracking-wider text-center max-w-[60px] truncate transition-colors ${
                                        isSelected ? "font-black text-neutral-950" : "font-bold text-neutral-600 group-hover:text-neutral-900"
                                      }`}
                                    >
                                      {colorStr}
                                    </span>
                                    <div
                                      className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all p-0.5 bg-white shrink-0 ${
                                        isSelected ? "ring-2 ring-neutral-950 shadow-sm" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                                      }`}
                                    >
                                      <div className="w-full h-full rounded-[10px] overflow-hidden bg-neutral-100 relative">
                                        <img src={cutImgUrl} alt={colorStr} className="w-full h-full object-cover" />
                                        {isSelected && (
                                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-sm" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 5. Size Options (실제 쇼핑몰과 100% 동일한 직사각형 rounded-sm 칩 스타일) */}
                        {effectiveSizes.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-neutral-900">
                              <span>{option2Name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {effectiveSizes.map((sz) => {
                                const sizeStr = String(sz);
                                const isSelected = activeSize === sizeStr;

                                return (
                                  <button
                                    key={sizeStr}
                                    type="button"
                                    onClick={() => setPreviewSelectedSize(sizeStr)}
                                    className={`min-w-[2.5rem] h-9 px-3 flex items-center justify-center border text-xs font-semibold transition-all uppercase tracking-wider cursor-pointer select-none rounded-sm ${
                                      isSelected
                                        ? "border-neutral-950 text-neutral-950 border-[1.5px] font-extrabold bg-neutral-100 shadow-2xs"
                                        : "border-neutral-300 text-neutral-700 hover:border-neutral-950 bg-white"
                                    }`}
                                  >
                                    {sizeStr}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 6. 총 상품 금액 (실제 쇼핑몰과 100% 동일) */}
                        <div className="flex items-end justify-between w-full pt-5 pb-3 border-t border-neutral-200 mt-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-neutral-900 tracking-tight">총 상품 금액</span>
                              <span className="text-[11px] text-neutral-500 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
                                총 1개
                              </span>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-neutral-950 tracking-tight font-mono">
                              {effectivePrice > 0 ? (
                                `${effectivePrice.toLocaleString("ko-KR")}원`
                              ) : (
                                <span className="text-neutral-300">0원</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* 7. Bottom Action Row: 수량 조절기 + 장바구니 아이콘 버튼 + 구매하기 버튼 (실제 쇼핑몰과 100% 동일) */}
                        <div id="product-header-action-row" className="flex items-center gap-3 mt-1">
                          {/* 수량 조절기 */}
                          <div className="flex items-center border border-neutral-900 px-3.5 py-2.5 h-[48px] min-w-[100px] justify-between text-neutral-900 bg-white shrink-0">
                            <button type="button" onClick={(e) => e.preventDefault()} className="text-base leading-none cursor-default select-none">
                              -
                            </button>
                            <span className="text-xs font-medium select-none">1</span>
                            <button type="button" onClick={(e) => e.preventDefault()} className="text-base leading-none cursor-default select-none">
                              +
                            </button>
                          </div>

                          {/* 장바구니 아이콘 버튼 */}
                          <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="w-[48px] h-[48px] border border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title="장바구니 담기"
                          >
                            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
                          </button>

                          {/* 구매하기 버튼 */}
                          <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            disabled={availableForSale === false}
                            className="flex-1 bg-black hover:bg-neutral-800 text-white font-normal text-xs tracking-widest h-[48px] transition-colors uppercase disabled:bg-neutral-300 disabled:text-neutral-500 cursor-pointer flex items-center justify-center"
                          >
                            {isScheduledRelease ? "오픈 예정" : availableForSale === false ? "품절" : "BUY NOW"}
                          </button>
                        </div>
                      </div>

                      {/* 3. Mobile Sliding Tabs Menu (ProductDetailAccordions 모바일 가로 탭 바 동일 구현) */}
                      <div className="mt-6 border-t border-neutral-200">
                        {/* Horizontal Sliding Tab Bar with reviews tooltip */}
                        <div className="w-full border-b border-neutral-200 bg-white sticky top-0 z-20 overflow-x-auto no-scrollbar scrollbar-none px-2 pt-7 pb-1">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            {mobileTabs.map((tab) => {
                              const isActive = previewActiveTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setPreviewActiveTab(tab.id)}
                                  className={`relative px-3 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer whitespace-nowrap select-none ${
                                    isActive
                                      ? "text-neutral-950 font-black bg-neutral-100"
                                      : "text-neutral-400 hover:text-neutral-900"
                                  }`}
                                >
                                  {/* 말풍선 뱃지 (고객후기 탭 위) */}
                                  {tab.id === "reviews" && (
                                    <div className="absolute -top-6 left-0 z-30 pointer-events-none select-none">
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-bold rounded shadow-xs whitespace-nowrap">
                                        <span className="text-amber-400 text-[10px]">✨</span>
                                        최대 50,000원 혜택
                                      </div>
                                    </div>
                                  )}
                                  <span>{tab.label}</span>
                                  {isActive && (
                                    <span className="absolute bottom-0 inset-x-2 h-0.5 bg-neutral-950 rounded-full" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Tab Content Display Area */}
                        <div className="p-4 bg-white min-h-[220px]">
                          {/* TAB 0: 고객 후기 (Reviews - 실제 등록된 리뷰만 노출) */}
                          {previewActiveTab === "reviews" && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                              <ProductReviews
                                productId={initialProduct?.id || "preview"}
                                productTitle={cleanTitle || "상품"}
                                hideTopBorder={true}
                              />
                            </div>
                          )}

                          {/* TAB 1: 제품 상세 사진 (Product Detail Photos) */}
                          {previewActiveTab === "details" && (() => {
                            const isBareDetail =
                              displayDetailDescription.trim().startsWith("data:image/") ||
                              /^https?:\/\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(displayDetailDescription.trim()) ||
                              /^\/[^\s]+?\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(displayDetailDescription.trim());
                            const finalPreviewHtml = isBareDetail
                              ? `<img src="${displayDetailDescription.trim()}" alt="상세 사진" class="w-full h-auto rounded-2xl my-3 block object-contain" />`
                              : displayDetailDescription;

                            return (
                              <div className="space-y-4 animate-in fade-in duration-150">
                                {displayDetailDescription ? (
                                  <div
                                    className="text-xs text-neutral-800 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:block [&_img]:object-contain [&_img]:rounded-2xl [&_img]:my-3 space-y-3"
                                    dangerouslySetInnerHTML={{ __html: finalPreviewHtml }}
                                  />
                                ) : (
                                  <div className="py-8" />
                                )}
                              </div>
                            );
                          })()}

                          {/* TAB 2: 원단 정보 (Fabric Details) */}
                          {previewActiveTab === "fabric" && (
                            <div className="space-y-3.5 animate-in fade-in duration-150">
                              {showFabricInfo && displayFabricImage ? (
                                <>
                                  {displayFabricComposition && (
                                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/80">
                                      <span className="text-[10px] font-bold text-neutral-400 block mb-0.5">
                                        소재
                                      </span>
                                      <p className="font-black text-xs text-neutral-950">
                                        {displayFabricComposition}
                                      </p>
                                    </div>
                                  )}

                                  {displayFabricImage && (
                                    <div className="rounded-xl overflow-hidden border border-neutral-200/90 bg-neutral-100 shadow-2xs">
                                      <img
                                        src={displayFabricImage}
                                        alt="원단 실물 텍스처"
                                        className="w-full h-auto block object-cover max-h-80"
                                      />
                                    </div>
                                  )}

                                  <div className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60 leading-relaxed">
                                    • 권장 세탁 방법: 드라이클리닝 권장 / 찬물 미온수 단독 손세탁 (건조기 사용 금지)
                                  </div>
                                </>
                              ) : null}
                            </div>
                          )}

                          {/* TAB 3: 사이즈 가이드 (Size Guide) */}
                          {previewActiveTab === "guide" && (
                            <div className="space-y-3 animate-in fade-in duration-150">
                              {showSizeGuide ? (
                                <>
                                  {/* 사이즈 실측 안내 이미지 (사이즈 차트 표 상단 노출) */}
                                  {sizeGuideImage && (
                                    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white p-2 shadow-2xs">
                                      <img
                                        src={sizeGuideImage}
                                        alt="사이즈 가이드 실측 이미지"
                                        className="w-full h-auto block object-contain max-h-60 mx-auto"
                                      />
                                    </div>
                                  )}

                                  {effectiveSizes.length > 0 ? (
                                    <>
                                      <div className="overflow-x-auto rounded-xl border border-neutral-200">
                                      <table className="w-full text-center text-[10px]">
                                        <thead>
                                          <tr className="bg-neutral-100 border-b border-neutral-200 font-bold text-neutral-700">
                                            <th className="py-2 px-2.5 text-left">부위명 (cm)</th>
                                            {effectiveSizes.map((s) => (
                                              <th key={s} className="py-2 px-2 font-black">{s}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 font-mono">
                                          {sizeMeasurements.map((m, idx) => (
                                            <tr key={idx}>
                                              <td className="py-2 px-2.5 text-left font-sans font-bold text-neutral-800">{m.name}</td>
                                              {effectiveSizes.map((s) => (
                                                <td key={s} className="py-2 px-2 text-neutral-700">
                                                  {m.values[s] || "-"}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 space-y-0.5 leading-relaxed pt-1">
                                      <p>- 측정수치는 cm를 나타냅니다.</p>
                                      <p>- 측정 위치에 따라 1~1.5cm 정도의 차이가 생길 수 있습니다.</p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="py-8" />
                                )}
                              </>
                            ) : null}
                            </div>
                          )}

                          {/* TAB 4: 배송 및 반품 (Shipping & Returns) */}
                          {previewActiveTab === "care" && (
                            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed animate-in fade-in duration-150">
                              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-1.5">
                                <span className="font-black text-neutral-900 block text-xs">배송 안내</span>
                                <p className="text-[11px] text-neutral-500 leading-normal">
                                  • 평일 오후 2시 이전 결제 완료 건은 당일 출고됩니다 (CJ대한통운).<br />
                                  • 기본 배송료는 3,000원이며, 100,000원 이상 구매 시 무료 배송됩니다.
                                </p>
                              </div>
                              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-1.5">
                                <span className="font-black text-neutral-900 block text-xs">교환 및 반품 안내</span>
                                <p className="text-[11px] text-neutral-500 leading-normal">
                                  • 상품 수령 후 7일 이내에 고객센터 또는 마이페이지를 통해 접수 가능합니다.<br />
                                  • 착용 흔적, 향수/화장품 오염, 택 훼손 시 반품이 불가합니다.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Mobile Store Footer (실제 쇼핑몰 푸터) */}
                      <div className="px-4 py-8 border-t border-neutral-200 bg-neutral-100 text-[10px] text-neutral-400 space-y-1.5 select-none text-center mt-6">
                        <span className="font-serif tracking-widest text-xs font-black text-neutral-800 block">CHOICOMMA</span>
                        <p>고객센터: 1588-0000 | 월-금 10:00 - 17:00</p>
                        <p>© CHOICOMMA ALL RIGHTS RESERVED.</p>
                      </div>
                    </div>

                    {/* Phone Home Indicator Bar */}
                    <div className="py-1.5 flex justify-center pointer-events-none bg-white border-t border-neutral-100">
                      <div className="w-32 h-1 bg-neutral-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          );
        })()}
      </div>
    </div>

    {/* 옵션명 수정 (상품 등록 및 수정 항목 제목 수정 팝업 모달) */}
    {isOptionNameModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-neutral-900">옵션명(항목 제목) 수정</h4>
                <p className="text-[11px] text-neutral-500 font-medium">상품 등록 및 수정 화면에 포함된 모든 섹션과 항목의 제목들을 수정합니다</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOptionNameModalOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/50 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-neutral-100 bg-white shrink-0">
            {[
              { id: "step1", label: "STEP 1: 기본 정보" },
              { id: "step2", label: "STEP 2: 옵션 & 원단 / 사이즈" },
              { id: "step3", label: "STEP 3: 프로모션 & 할인" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTitleTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTitleTab === tab.id
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Form Fields */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTitleTab === "step1" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "productImages", label: "제품 이미지 등록 제목", defaultVal: DEFAULT_FORM_TITLES.productImages },
                    { key: "price", label: "판매가 항목 제목", defaultVal: DEFAULT_FORM_TITLES.price },
                    { key: "variantCutImages", label: "옵션별 제품컷 사진 등록 제목", defaultVal: DEFAULT_FORM_TITLES.variantCutImages },
                    { key: "productNo", label: "상품 번호 항목 제목", defaultVal: DEFAULT_FORM_TITLES.productNo },
                    { key: "title", label: "상품명 항목 제목", defaultVal: DEFAULT_FORM_TITLES.title },
                    { key: "description", label: "간단 설명 항목 제목", defaultVal: DEFAULT_FORM_TITLES.description },
                    { key: "detailImages", label: "상세 사진 등록 항목 제목", defaultVal: DEFAULT_FORM_TITLES.detailImages },
                    { key: "previewScreen", label: "상세페이지 미리보기 화면 제목", defaultVal: DEFAULT_FORM_TITLES.previewScreen },
                    { key: "categories", label: "카테고리 선택 항목 제목", defaultVal: DEFAULT_FORM_TITLES.categories },
                    { key: "mainFeatured", label: "메인 전시 여부 항목 제목", defaultVal: DEFAULT_FORM_TITLES.mainFeatured },
                    { key: "saleStatus", label: "판매 상태 항목 제목", defaultVal: DEFAULT_FORM_TITLES.saleStatus },
                    { key: "scheduledRelease", label: "판매 시작 시간 항목 제목", defaultVal: DEFAULT_FORM_TITLES.scheduledRelease },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-1.5 focus-within:bg-white focus-within:border-neutral-900 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded-md">수정됨</span>
                          )}
                        </label>
                        {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                          <button
                            type="button"
                            onClick={() => setTempTitles((prev) => ({ ...prev, [item.key]: item.defaultVal }))}
                            className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer"
                          >
                            기본값
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={tempTitles[item.key as keyof FormTitlesConfig] || ""}
                        onChange={(e) => setTempTitles((prev) => ({ ...prev, [item.key]: e.target.value }))}
                        placeholder={item.defaultVal}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTitleTab === "step2" && (
              <div className="space-y-4">
                <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-700" />
                    <span className="text-xs font-black text-sky-950">주문 옵션명 (쇼핑몰 및 관리자 공통)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1차 옵션명 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        1차 옵션명 (기본: Color)
                      </label>
                      <input
                        type="text"
                        value={tempTitles.option1Name}
                        onChange={(e) => setTempTitles((prev) => ({ ...prev, option1Name: e.target.value }))}
                        placeholder="Color"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-neutral-400">빠른선택:</span>
                        {["Color", "색상", "컬러", "종류", "타입"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTempTitles((prev) => ({ ...prev, option1Name: p }))}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold cursor-pointer ${
                              tempTitles.option1Name === p
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2차 옵션명 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        2차 옵션명 (기본: Size)
                      </label>
                      <input
                        type="text"
                        value={tempTitles.option2Name}
                        onChange={(e) => setTempTitles((prev) => ({ ...prev, option2Name: e.target.value }))}
                        placeholder="Size"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-neutral-400">빠른선택:</span>
                        {["Size", "사이즈", "규격", "길이", "크기"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTempTitles((prev) => ({ ...prev, option2Name: p }))}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold cursor-pointer ${
                              tempTitles.option2Name === p
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "productLabel", label: "상품 라벨 제목", defaultVal: DEFAULT_FORM_TITLES.productLabel },
                    { key: "fabricInfo", label: "원단 정보 설정 제목", defaultVal: DEFAULT_FORM_TITLES.fabricInfo },
                    { key: "fabricComposition", label: "소재 구성 제목", defaultVal: DEFAULT_FORM_TITLES.fabricComposition },
                    { key: "fabricImage", label: "원단 이미지 항목 제목", defaultVal: DEFAULT_FORM_TITLES.fabricImage },
                    { key: "sizeOptions", label: "사이즈 옵션 선택 제목", defaultVal: DEFAULT_FORM_TITLES.sizeOptions },
                    { key: "sizeGuide", label: "사이즈 실측 가이드 제목", defaultVal: DEFAULT_FORM_TITLES.sizeGuide },
                    { key: "sizeStock", label: "재고 수량 항목 제목", defaultVal: DEFAULT_FORM_TITLES.sizeStock },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-1.5 focus-within:bg-white focus-within:border-neutral-900 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded-md">수정됨</span>
                          )}
                        </label>
                        {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                          <button
                            type="button"
                            onClick={() => setTempTitles((prev) => ({ ...prev, [item.key]: item.defaultVal }))}
                            className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer"
                          >
                            기본값
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={tempTitles[item.key as keyof FormTitlesConfig] || ""}
                        onChange={(e) => setTempTitles((prev) => ({ ...prev, [item.key]: e.target.value }))}
                        placeholder={item.defaultVal}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTitleTab === "step3" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "timeSale", label: "타임세일 설정 제목", defaultVal: DEFAULT_FORM_TITLES.timeSale },
                    { key: "bulkDiscount", label: "대량 구매 수량 할인 제목", defaultVal: DEFAULT_FORM_TITLES.bulkDiscount },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 space-y-1.5 focus-within:bg-white focus-within:border-neutral-900 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded-md">수정됨</span>
                          )}
                        </label>
                        {tempTitles[item.key as keyof FormTitlesConfig] !== item.defaultVal && (
                          <button
                            type="button"
                            onClick={() => setTempTitles((prev) => ({ ...prev, [item.key]: item.defaultVal }))}
                            className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer"
                          >
                            기본값
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={tempTitles[item.key as keyof FormTitlesConfig] || ""}
                        onChange={(e) => setTempTitles((prev) => ({ ...prev, [item.key]: e.target.value }))}
                        placeholder={item.defaultVal}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("모든 항목의 제목을 기본 명칭으로 초기화하시겠습니까?")) {
                  setTempTitles({ ...DEFAULT_FORM_TITLES });
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">전체 기본값 초기화</span>
              <span className="sm:hidden">초기화</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOptionNameModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const final1 = tempTitles.option1Name.trim() || "Color";
                  const final2 = tempTitles.option2Name.trim() || "Size";
                  const finalTitles = {
                    ...tempTitles,
                    option1Name: final1,
                    option2Name: final2,
                  };
                  setFormTitles(finalTitles);
                  setOption1Name(final1);
                  setOption2Name(final2);
                  try {
                    localStorage.setItem("admin_form_titles", JSON.stringify(finalTitles));
                  } catch (e) {}
                  setIsOptionNameModalOpen(false);
                  triggerToast("상품 등록 및 수정 항목 제목(옵션명)들이 성공적으로 적용되었습니다.");
                }}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-neutral-950 hover:bg-black text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>제목 변경사항 저장 및 적용</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
