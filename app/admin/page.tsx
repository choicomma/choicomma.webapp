"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import excelParsedProducts from "@/lib/sfcc/mock/parsed-products.json";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Bell,
  Filter,
  ExternalLink,
  Upload,
  ImageIcon,
  Layers,
  Gift,
  Percent,
  Tags,
  Check,
  X,
  Pencil,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Crown,
  Lock as LockIcon,
  Calendar,
  LogOut,
  Send,
  ChevronLeft,
  ChevronRight,
  Clock,
  Box,
} from "lucide-react";
import {
  Archive,
  AlertCircle,
  BarChart3,
  PieChart,
  CreditCard,
  Download,
  FileSpreadsheet,
  Palette,
  Ruler,
  Sparkles,
  MessageSquare,
  Truck,
  Sliders,
  Globe,
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { mockProducts } from "@/lib/sfcc/mock/products";
import { LogoSvg } from "@/components/layout/header/logo-svg";
import { getRegisteredSetProducts } from "@/lib/sfcc/set-products-helper";
import importedMonthlyRevenue from "@/lib/sfcc/monthly-revenue-data.json";
import * as XLSX from "xlsx";

import { ProductsManagement } from "./components/products-management";
import { TimesaleManagement } from "./components/timesale-management";
import { RevenueManagement } from "./components/revenue-management";
import { MainPageManagement } from "./components/main-page-management";
import { CustomersManagement } from "./components/customers-management";
import { OrdersManagement } from "./components/orders-management";
import { InboundStockManagement } from "./components/inbound-stock-management";
import { InquiriesManagement } from "./components/inquiries-management";
import { GlobalSalesManagement } from "./components/global-sales-management";
import { LanguageSelector } from "@/components/layout/header/language-selector";

const initialCustomers: any[] = [];

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

export interface SizeMeasurementRow {
  name: string;
  values: Record<string, string>;
}

const DEFAULT_SIZE_MEASUREMENTS: SizeMeasurementRow[] = [
  { name: "SHOULDER", values: { "1": "50", "2": "52", "3": "54", "FREE": "56" } },
  { name: "CHEST", values: { "1": "56.5", "2": "58.5", "3": "60.5", "FREE": "62.5" } },
  { name: "SLEEVE", values: { "1": "59", "2": "60", "3": "61", "FREE": "61.5" } },
  { name: "LENGTH", values: { "1": "58/62.5", "2": "60/64.5", "3": "62/66.5", "FREE": "63/67.5" } },
];

// Initial orders data
const initialOrders: any[] = [];

// Initial categories
const categoriesList = [
  { id: "timesale", name: "TIMESALE", count: 8, description: "신상품 & 타임세일 컬렉션" },
  { id: "outer", name: "OUTER", count: 12, description: "아우터 & 재킷" },
  { id: "top", name: "TOP", count: 24, description: "상의 & 니트웨어" },
  { id: "bottom", name: "BOTTOM", count: 16, description: "팬츠 & 스커트" },
  { id: "bag", name: "BAG", count: 6, description: "가방 & 래더 굿즈" },
  { id: "shoes", name: "SHOES", count: 9, description: "슈즈 & 슈케어" },
  { id: "accessory", name: "ACCESSORY", count: 15, description: "액세서리 & 잡화" },
];

// Initial Set Item Sales Data
const initialSetSales: any[] = [];

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

// Initial Shipments Data
const initialShipments: any[] = [];

// Initial Inbound Stock Schedules (입고 일정)
const initialInboundSchedules: any[] = [];

// Initial Daily Settlements Data
const initialDailySettlements: any[] = [];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "inbound" | "timesale" | "sales" | "revenue" | "main" | "customers" | "inquiries" | "settings" | "global_sales">("orders");

  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>([]);
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customer_inquiries");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setInquiriesList(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Sync inquiries state to localStorage & live refresh
  React.useEffect(() => {
    const syncInquiries = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("admin_customer_inquiries");
        if (saved) {
          try {
            setInquiriesList(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    window.addEventListener("storage", syncInquiries);
    const interval = setInterval(syncInquiries, 2000);
    return () => {
      window.removeEventListener("storage", syncInquiries);
      clearInterval(interval);
    };
  }, []);

  // Revenue Management State
  const [revenueSelectedYear, setRevenueSelectedYear] = useState<string>("all");
  const [revenueSelectedMonth, setRevenueSelectedMonth] = useState<string>("all");
  const [revenueFilterPeriod, setRevenueFilterPeriod] = useState<"today" | "7days" | "thisMonth" | "lastMonth" | "year">("thisMonth");
  const [revenueStatusFilter, setRevenueStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [revenueSearchQuery, setRevenueSearchQuery] = useState("");

  // Inbound Management State
  const [inboundSchedulesList, setInboundSchedulesList] = useState<any[]>(initialInboundSchedules);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_inbound_schedules");
      if (saved) {
        try {
          setInboundSchedulesList(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Real-time sync for Inbound Schedules across tabs & windows
  React.useEffect(() => {
    const syncInbound = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("admin_inbound_schedules");
        if (saved) {
          try {
            setInboundSchedulesList((prev) => {
              if (JSON.stringify(prev) !== saved) {
                return JSON.parse(saved);
              }
              return prev;
            });
          } catch (e) {}
        }
      }
    };
    window.addEventListener("storage", syncInbound);
    window.addEventListener("admin_inbound_updated", syncInbound);
    const interval = setInterval(syncInbound, 3000);
    return () => {
      window.removeEventListener("storage", syncInbound);
      window.removeEventListener("admin_inbound_updated", syncInbound);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const currentSaved = localStorage.getItem("admin_inbound_schedules");
      const nextJson = JSON.stringify(inboundSchedulesList);
      if (currentSaved !== nextJson) {
        localStorage.setItem("admin_inbound_schedules", nextJson);
        window.dispatchEvent(new CustomEvent("admin_inbound_updated"));
      }
    }
  }, [inboundSchedulesList, isMounted]);

  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [inboundSearchQuery, setInboundSearchQuery] = useState("");
  const [inboundStatusFilter, setInboundStatusFilter] = useState("all");
  const [isAddInboundModalOpen, setIsAddInboundModalOpen] = useState(false);
  const [selectedInboundItem, setSelectedInboundItem] = useState<any | null>(null);

  const [newInboundDate, setNewInboundDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newInboundTitle, setNewInboundTitle] = useState("");
  const [newInboundQuantity, setNewInboundQuantity] = useState(100);
  const [newInboundSupplier, setNewInboundSupplier] = useState("");
  const [newInboundWarehouse, setNewInboundWarehouse] = useState("제1물류센터 A구역");
  const [newInboundNotes, setNewInboundNotes] = useState("");
  const [newInboundStatus, setNewInboundStatus] = useState("Scheduled");
  
// Initial default product catalog from public/상품전체정보.xlsx
const INITIAL_CHOICOMMA_PRODUCTS: any[] = excelParsedProducts as any[];

  // State for products, orders, search, notifications
  const isProductsLoadedRef = React.useRef(false);
  const [productsList, setProductsList] = useState<any[]>(INITIAL_CHOICOMMA_PRODUCTS);

  // Client-side hydration sync for productsList
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_products");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProductsList(parsed);
            isProductsLoadedRef.current = true;
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      localStorage.setItem("admin_products", JSON.stringify(INITIAL_CHOICOMMA_PRODUCTS));
      setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
      isProductsLoadedRef.current = true;
    }
  }, []);

  // Helper: Calculate accurate total stock for color x size combinations
  const calculateTotalStock = (colors: string[], sizes: string[], stockMap: Record<string, number>): number => {
    if (!colors?.length || !sizes?.length) return 0;
    let total = 0;
    colors.forEach((c) => {
      sizes.forEach((s) => {
        const comboKey = `${c}-${s}`;
        const qty = stockMap[comboKey] !== undefined ? stockMap[comboKey] : (stockMap[s] !== undefined ? stockMap[s] : 10);
        total += (qty || 0);
      });
    });
    return total;
  };

  // Helper: Compress uploaded Base64 image to prevent QuotaExceededError in localStorage
  const compressImageDataUrl = (dataUrl: string, maxDimension = 1920, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith("data:image") || typeof window === "undefined" || !window.Image) {
        resolve(dataUrl);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Helper: Safely save to localStorage with try-catch fallback against QuotaExceededError
  const saveProductsToStorage = (list: any[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("admin_products", JSON.stringify(list));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("admin_products_updated"));
      }, 0);
    } catch (e) {
      console.warn("QuotaExceededError in localStorage, attempting cleanup save...", e);
      try {
        localStorage.removeItem("admin_products");
        localStorage.setItem("admin_products", JSON.stringify(list));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("admin_products_updated"));
        }, 0);
      } catch (err) {
        console.error("Failed to write to localStorage after retry", err);
      }
    }
  };

  // Sync productsList with localStorage safely only after initial load
  React.useEffect(() => {
    if (isProductsLoadedRef.current) {
      saveProductsToStorage(productsList);
    }
  }, [productsList]);

  const handleAddInboundSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInboundTitle.trim()) {
      alert("상품명을 입력해주세요.");
      return;
    }
    const newId = `INB-${newInboundDate.replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`;
    const newItem = {
      id: newId,
      date: newInboundDate,
      productTitle: newInboundTitle.trim(),
      quantity: Number(newInboundQuantity) || 1,
      supplier: newInboundSupplier.trim() || "자체 물류 공장",
      warehouse: newInboundWarehouse,
      status: newInboundStatus,
      notes: newInboundNotes.trim() || "신규 입고 등록건",
    };
    setInboundSchedulesList([newItem, ...inboundSchedulesList]);
    setIsAddInboundModalOpen(false);
    setNewInboundTitle("");
    setNewInboundQuantity(100);
    setNewInboundNotes("");
    triggerToast(`'${newItem.productTitle}' 입고 일정이 등록되었습니다.`);
  };

  const handleUpdateInboundStatus = (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "Scheduled"
        ? "In Progress"
        : currentStatus === "In Progress"
        ? "Completed"
        : "Scheduled";
    const nextText =
      nextStatus === "Completed"
        ? "입고 완료"
        : nextStatus === "In Progress"
        ? "검수 진행 중"
        : "입고 대기";

    const targetItem = inboundSchedulesList.find((item) => item.id === id);

    setInboundSchedulesList(
      inboundSchedulesList.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      )
    );

    if (nextStatus === "Completed" && targetItem) {
      setProductsList((prev) =>
        prev.map((prod) => {
          if (
            prod.title?.toLowerCase().includes(targetItem.productTitle?.toLowerCase()) ||
            targetItem.productTitle?.toLowerCase().includes(prod.title?.toLowerCase())
          ) {
            const updatedStockMap = { ...prod.stockMap };
            const primarySize = prod.sizes?.[0] || "FREE";
            updatedStockMap[primarySize] = (updatedStockMap[primarySize] || 0) + (targetItem.quantity || 0);
            return {
              ...prod,
              stockMap: updatedStockMap,
              stock: calculateTotalStock(prod.colors || ["BLACK"], prod.sizes || ["FREE"], updatedStockMap),
            };
          }
          return prod;
        })
      );
      triggerToast(`입고 완료! '${targetItem.productTitle}' 수량(+${targetItem.quantity}개)이 실시간 재고에 자동 연동되었습니다.`);
    } else {
      triggerToast(`입고 상태가 [${nextText}] (으)로 변경되었습니다.`);
    }
  };

  const handleDeleteInboundSchedule = (id: string) => {
    if (!window.confirm("정말로 해당 입고 일정을 삭제하시겠습니까?")) return;
    setInboundSchedulesList(inboundSchedulesList.filter((item) => item.id !== id));
    if (selectedInboundItem?.id === id) setSelectedInboundItem(null);
    triggerToast("입고 일정이 삭제되었습니다.");
  };

  const [ordersList, setOrdersList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_orders");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return initialOrders;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [productSortOrder, setProductSortOrder] = useState<"productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc" | "custom">("productNoDesc");
  const [topSellerFilter, setTopSellerFilter] = useState<"all" | "topSeller" | "normal">("all");
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

  const [mainSelectMode, setMainSelectMode] = useState<"hero" | "bottom">("hero");
  const [isMainSelectModalOpen, setIsMainSelectModalOpen] = useState(false);

  // Separate Image Upload Modal & Product Link Modal State
  const [targetHeroProduct, setTargetHeroProduct] = useState<any | null>(null);
  const [customHeroImageUrl, setCustomHeroImageUrl] = useState<string>("");
  const [selectedLinkedProductId, setSelectedLinkedProductId] = useState<string>("");
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState<boolean>(false);
  const [isProductLinkModalOpen, setIsProductLinkModalOpen] = useState<boolean>(false);

  const openImageUploadModal = (product?: any) => {
    if (product) {
      setTargetHeroProduct(product);
      setCustomHeroImageUrl(product?.heroCustomImage || product?.featuredImage?.url || "");
    } else {
      setTargetHeroProduct(null);
      setCustomHeroImageUrl("");
    }
    setIsImageUploadModalOpen(true);
  };

  const handleSaveImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    let newImage = customHeroImageUrl.trim();
    if (!newImage) {
      alert("등록할 이미지 URL을 입력하거나 이미지 파일을 업로드해 주세요.");
      return;
    }

    if (newImage.startsWith("data:image")) {
      newImage = await compressImageDataUrl(newImage, 1920, 0.8);
    }

    let updatedList: any[] = [];
    if (targetHeroProduct) {
      updatedList = productsList.map((p) => {
        if (p.id === targetHeroProduct.id) {
          return {
            ...p,
            heroCustomImage: newImage,
            isHeroFeatured: true,
          };
        }
        return p;
      });
      triggerToast("슬라이드 이미지가 성공적으로 변경되었습니다.");
    } else {
      let target = productsList.find((p) => !p.isHeroFeatured);
      if (!target) {
        target = productsList[0];
      }
      if (target) {
        updatedList = productsList.map((p) => {
          if (p.id === target.id) {
            return {
              ...p,
              heroCustomImage: newImage,
              isHeroFeatured: true,
            };
          }
          return p;
        });
      } else {
        updatedList = [...productsList];
      }
      triggerToast("새로운 슬라이드 이미지가 성공적으로 등록되었습니다.");
    }

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    setIsImageUploadModalOpen(false);
  };

  const handleRemoveHeroSlide = (id: string) => {
    const isConfirmed = window.confirm("해당 슬라이드 이미지를 삭제하시겠습니까?");
    if (!isConfirmed) return;

    const updatedList = productsList.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          isHeroFeatured: false,
          heroCustomImage: undefined,
        };
      }
      return p;
    });

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast("슬라이드 이미지가 삭제되었습니다.");
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rawDataUrl = evt.target?.result as string;
      if (rawDataUrl) {
        const compressed = await compressImageDataUrl(rawDataUrl, 1920, 0.8);
        setCustomHeroImageUrl(compressed);
        triggerToast("이미지가 성공적으로 압축 및 등록되었습니다.");
      }
    };
    reader.readAsDataURL(file);
  };

  const openProductLinkModal = (product?: any) => {
    const target = product || productsList.find((p) => p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)) || productsList[0];
    setTargetHeroProduct(target);
    setSelectedLinkedProductId(target?.linkedProductId || target?.id || "");
    setIsProductLinkModalOpen(true);
  };

  const handleSaveProductLink = (linkedId: string) => {
    if (!targetHeroProduct) return;
    const linked = productsList.find((p) => p.id === linkedId);

    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === targetHeroProduct.id) {
          return {
            ...p,
            linkedProductId: linkedId,
            isMainFeatured: true,
            isHeroFeatured: true,
          };
        }
        return p;
      })
    );
    triggerToast(`'${linked?.title || linkedId}' 상품으로 성공적으로 연동되었습니다.`);
    setIsProductLinkModalOpen(false);
  };

  const openMainSelectModal = (mode: "hero" | "bottom") => {
    setMainSelectMode(mode);
    setIsMainSelectModalOpen(true);
  };

  const getProductNoNum = React.useCallback((product: any): number => {
    if (product?.productNo !== undefined && !isNaN(Number(product.productNo))) {
      return Number(product.productNo);
    }
    const code = product?.productCode || product?.id || "";
    const match = String(code).match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 0;
  }, []);

  const getProductNo = React.useCallback((product: any): string => {
    if (product?.productCode && String(product.productCode).startsWith("CC-")) {
      return String(product.productCode);
    }
    const num = getProductNoNum(product);
    return `CC-${String(num).padStart(3, "0")}`;
  }, [getProductNoNum]);

  const handleToggleHeroProduct = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const willBeFeatured = !targetProduct.isHeroFeatured;

    const confirmMessage = willBeFeatured
      ? `'${targetProduct.title}' 상품을 상단 메인 슬라이더 전용 상품으로 등록하시겠습니까?`
      : `'${targetProduct.title}' 상품을 상단 메인 슬라이더 해제하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          triggerToast(
            willBeFeatured
              ? `'${p.title}' 상품이 상단 메인 슬라이더에 등록되었습니다.`
              : `'${p.title}' 상품이 상단 메인 슬라이더에서 해제되었습니다.`
          );
          return {
            ...p,
            isHeroFeatured: willBeFeatured,
          };
        }
        return p;
      })
    );
  };

  const handleToggleBottomProduct = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const willBeFeatured = !targetProduct.isBottomFeatured;

    const confirmMessage = willBeFeatured
      ? `'${targetProduct.title}' 상품을 하단 상품으로 지정하시겠습니까?`
      : `'${targetProduct.title}' 상품을 하단 상품에서 해제하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          triggerToast(
            willBeFeatured
              ? `'${p.title}' 상품이 하단 상품으로 지정되었습니다.`
              : `'${p.title}' 상품의 하단 상품 지정이 해제되었습니다.`
          );
          return {
            ...p,
            isMainFeatured: willBeFeatured ? true : p.isHeroFeatured || false,
            isBottomFeatured: willBeFeatured,
            isHeroFeatured: willBeFeatured ? false : p.isHeroFeatured,
          };
        }
        return p;
      })
    );
  };

  const handleToggleTopSeller = (id: string) => {
    handleToggleHeroProduct(id);
  };

  const categoryProducts = React.useMemo(() => {
    if (!selectedCategoryForProducts) return [];
    if (selectedCategoryForProducts === "timesale") {
      return getRegisteredSetProducts(productsList);
    }
    return productsList.filter(
      (p) => p.categoryId === selectedCategoryForProducts
    );
  }, [selectedCategoryForProducts, productsList]);
  const getProductStock = (product: any) => {
    if (product.stock !== undefined) return Number(product.stock);
    const hash = String(product.id || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 75) + 15;
  };

  const toggleStock = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const isCurrentlyAvailable = targetProduct.availableForSale !== false;
    const confirmMessage = isCurrentlyAvailable
      ? `'${targetProduct.title}' 상품을 품절 처리하시겠습니까?`
      : `'${targetProduct.title}' 상품을 [재고 있음] 상태로 변경하시겠습니까?`;

    const isConfirmed = window.confirm(confirmMessage);
    if (!isConfirmed) return;

    const nextAvailable = !isCurrentlyAvailable;

    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          triggerToast(
            nextAvailable
              ? `'${p.title}' 상태가 [재고 있음]으로 변경되었습니다.`
              : `'${p.title}' 상품이 [품절] 처리되었습니다.`
          );
          return { ...p, availableForSale: nextAvailable };
        }
        return p;
      })
    );
  };

  const toggleMainFeatured = (id: string) => {
    const targetProduct = productsList.find((p) => p.id === id);
    if (!targetProduct) return;

    const isCurrentlyFeatured = targetProduct.isMainFeatured === true;
    const nextFeatured = !isCurrentlyFeatured;

    const confirmMsg = nextFeatured
      ? `'${targetProduct.title}' 상품을 메인 화면에 진열하시겠습니까?`
      : `'${targetProduct.title}' 상품을 메인 화면에서 미진열 처리하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    setProductsList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          triggerToast(
            nextFeatured
              ? `'${p.title}' 상품이 쇼핑몰 메인 화면 [전시 중]으로 설정되었습니다.`
              : `'${p.title}' 상품이 메인 화면 [미전시]로 변경되었습니다.`
          );
          return { ...p, isMainFeatured: nextFeatured };
        }
        return p;
      })
    );
  };

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductNoInput, setEditProductNoInput] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategories, setEditCategories] = useState<string[]>(["outer"]);
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDetailDescription, setEditDetailDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editUrlInput, setEditUrlInput] = useState("");
  const [editStock, setEditStock] = useState<number>(50);
  const [editAvailable, setEditAvailable] = useState(true);
  const [editIsMainFeatured, setEditIsMainFeatured] = useState(true);
  const [editLabel, setEditLabel] = useState<"" | "BLACK_LABEL" | "PREMIUM" | "ESSENTIAL">("PREMIUM");
  const [editColors, setEditColors] = useState<string[]>(["BLACK", "CREAM", "CHARCOAL"]);
  const [editColorHexMap, setEditColorHexMap] = useState<Record<string, string>>(DEFAULT_COLOR_HEX_MAP);
  const [editCustomColorInput, setEditCustomColorInput] = useState("");
  const [editSizes, setEditSizes] = useState<string[]>(["1", "2", "3"]);
  const [editSizeMeasurements, setEditSizeMeasurements] = useState<SizeMeasurementRow[]>(DEFAULT_SIZE_MEASUREMENTS);
  const [editNewMeasurementName, setEditNewMeasurementName] = useState("");
  const [editSizeStock, setEditSizeStock] = useState<Record<string, number>>({});
  // Bulk discount states for edit modal
  const [editBulkEnabled, setEditBulkEnabled] = useState(false);
  const [editBulkRules, setEditBulkRules] = useState<{qty: number; rate: number}[]>([{ qty: 2, rate: 5 }]);
  // Fabric info states for edit modal
  const [editFabricComposition, setEditFabricComposition] = useState("COTTON 100% (프리미엄 콤마 코튼)");
  const [editElasticity, setEditElasticity] = useState("보통");
  const [editSheerness, setEditSheerness] = useState("없음");
  const [editThickness, setEditThickness] = useState("적당함");
  const [editLining, setEditLining] = useState("없음");
  const [editFabricImage, setEditFabricImage] = useState("");
  // Time sale states for edit modal
  const [editIsTimeSale, setEditIsTimeSale] = useState(false);
  const [editTimeSaleHours, setEditTimeSaleHours] = useState("24");
  const [editTimeSaleMinutes, setEditTimeSaleMinutes] = useState("0");
  const [editTimeSaleDiscountPrice, setEditTimeSaleDiscountPrice] = useState("");
  const [editTimeSaleDiscountRate, setEditTimeSaleDiscountRate] = useState("35");

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setEditProductNoInput(
      product.productCode || (product.productNo ? `CC-${String(product.productNo).padStart(3, "0")}` : "")
    );
    setEditTitle(product.title || "");
    const initialCats = Array.isArray(product.categoryIds) && product.categoryIds.length > 0
      ? product.categoryIds
      : (product.categoryId ? [product.categoryId] : ["outer"]);
    setEditCategories(initialCats);
    setEditPrice(product.priceRange?.minVariantPrice?.amount || "0");
    setEditDescription(product.description || "");
    setEditDetailDescription(product.detailDescription || product.detailedInfo || "");
    setEditImageUrl(product.featuredImage?.url || "");
    const initialImages: string[] = product.images?.length
      ? product.images.map((img: any) => (typeof img === "string" ? img : img.url))
      : (product.featuredImage?.url ? [product.featuredImage.url] : ["/product_1.webp"]);
    setEditImages(initialImages);
    setEditUrlInput("");
    setEditStock(getProductStock(product));
    setEditAvailable(product.availableForSale !== false);
    setEditIsMainFeatured(product.isMainFeatured !== false);
    setEditLabel(product.productLabel || "PREMIUM");
    const initialColors = product.colors?.length ? product.colors : ["BLACK", "CREAM", "CHARCOAL"];
    setEditColors(initialColors);
    const initialHexMap = product.colorHexMap ? { ...DEFAULT_COLOR_HEX_MAP, ...product.colorHexMap } : DEFAULT_COLOR_HEX_MAP;
    setEditColorHexMap(initialHexMap);
    setEditCustomColorInput("");
    const initialSizes = product.sizes?.length ? product.sizes : ["1", "2", "3"];
    setEditSizes(initialSizes);
    const initialMeasurements = product.sizeMeasurements && product.sizeMeasurements.length > 0
      ? product.sizeMeasurements
      : DEFAULT_SIZE_MEASUREMENTS;
    setEditSizeMeasurements(initialMeasurements);
    setEditNewMeasurementName("");
    
    const initialSizeStock: Record<string, number> = {};
    if (product.sizeStock) {
      initialColors.forEach((c: string) => {
        initialSizes.forEach((s: string) => {
          const comboKey = `${c}-${s}`;
          if (product.sizeStock[comboKey] !== undefined) {
            initialSizeStock[comboKey] = product.sizeStock[comboKey];
          } else if (product.sizeStock[s] !== undefined) {
            initialSizeStock[comboKey] = product.sizeStock[s];
          } else {
            initialSizeStock[comboKey] = 10;
          }
        });
      });
    } else {
      const baseStock = getProductStock(product) || 50;
      const perCombo = Math.floor(baseStock / Math.max(1, initialColors.length * initialSizes.length)) || 10;
      initialColors.forEach((c: string) => {
        initialSizes.forEach((s: string) => {
          initialSizeStock[`${c}-${s}`] = perCombo;
        });
      });
    }
    setEditSizeStock(initialSizeStock);
    setEditBulkEnabled(product.bulkDiscount?.enabled || false);
    setEditBulkRules(product.bulkDiscount?.rules?.length ? product.bulkDiscount.rules : [{ qty: 2, rate: 5 }]);
    setEditFabricComposition(product.fabricComposition || "COTTON 100% (프리미엄 콤마 코튼)");
    setEditElasticity(product.elasticity || "보통");
    setEditSheerness(product.sheerness || "없음");
    setEditThickness(product.thickness || "적당함");
    setEditLining(product.lining || "없음");
    setEditFabricImage(product.fabricImage || product.fabricTextureImage || "");
    const isTs = adminTimeSaleProductIds.includes(product.id);
    setEditIsTimeSale(isTs);
    const tsSetting = productTimeSaleSettings[product.id] || { hours: 24, minutes: 0 };
    setEditTimeSaleHours(String(tsSetting.hours));
    setEditTimeSaleMinutes(String(tsSetting.minutes));
    setEditTimeSaleDiscountPrice(product.timeSaleDiscountPrice || tsSetting.discountPrice || "");
    setEditTimeSaleDiscountRate(String(product.timeSaleDiscountRate || tsSetting.discountRate || 35));
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const totalStock = calculateTotalStock(editColors, editSizes, editSizeStock);

    const finalImages = editImages.length > 0 ? editImages : ["/product_1.webp"];

    const updatedList = productsList.map((p) => {
      if (String(p.id) === String(editingProduct.id)) {
        let updatedProdNo = p.productNo;
        let updatedProductCode = editProductNoInput.trim() || p.productCode;
        if (editProductNoInput.trim()) {
          const match = editProductNoInput.trim().match(/\d+/);
          if (match) updatedProdNo = parseInt(match[0], 10);
        }
        return {
          ...p,
          productNo: updatedProdNo,
          productCode: updatedProductCode,
          title: editTitle,
          categoryId: editCategories[0] || "outer",
          categoryIds: editCategories,
          description: editDescription,
          detailDescription: editDetailDescription,
          stock: totalStock,
          sizeStock: editSizeStock,
          availableForSale: totalStock > 0,
          isMainFeatured: editIsMainFeatured,
          productLabel: editLabel,
          colors: editColors,
          colorHexMap: editColorHexMap,
          sizes: editSizes,
          sizeMeasurements: editSizeMeasurements,
          options: [
            { id: "color", name: "Color", values: editColors },
            { id: "size", name: "Size", values: editSizes },
          ],
          variants: editColors.flatMap((color: string) =>
            editSizes.map((size: string) => ({
              id: `${editingProduct.id}-${color}-${size}`,
              title: `${editTitle} - ${color} / ${size}`,
              availableForSale: totalStock > 0,
              selectedOptions: [
                { name: "Color", value: color },
                { name: "Size", value: size },
              ],
              price: { amount: editPrice, currencyCode: "KRW" },
            }))
          ),
          bulkDiscount: { enabled: editBulkEnabled, rules: editBulkRules },
          fabricComposition: editFabricComposition,
          elasticity: editElasticity,
          sheerness: editSheerness,
          thickness: editThickness,
          lining: editLining,
          fabricImage: editFabricImage,
          featuredImage: {
            ...p.featuredImage,
            url: finalImages[0],
            altText: editTitle,
          },
          images: finalImages.map((url) => ({ url, altText: editTitle })),
          priceRange: {
            maxVariantPrice: { amount: editPrice, currencyCode: "KRW" },
            minVariantPrice: { amount: editPrice, currencyCode: "KRW" },
          },
          timeSaleDiscountPrice: editIsTimeSale ? editTimeSaleDiscountPrice : undefined,
          timeSaleDiscountRate: editIsTimeSale ? (editTimeSaleDiscountRate ? parseInt(editTimeSaleDiscountRate) : 35) : undefined,
        };
      }
      return p;
    });

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    setEditingProduct(null);

    // Save or remove Time Sale settings for this product
    if (editIsTimeSale) {
      if (!adminTimeSaleProductIds.includes(String(editingProduct.id))) {
        const updatedIds = [...adminTimeSaleProductIds, String(editingProduct.id)];
        setAdminTimeSaleProductIds(updatedIds);
        if (typeof window !== "undefined") {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
        }
      }
      const h = parseInt(editTimeSaleHours) || 0;
      const m = parseInt(editTimeSaleMinutes) || 0;
      const rateNum = editTimeSaleDiscountRate ? parseInt(editTimeSaleDiscountRate) : 35;
      handleUpdateProductTimeSetting(String(editingProduct.id), h, m, editTimeSaleDiscountPrice, rateNum);
    } else {
      if (adminTimeSaleProductIds.includes(String(editingProduct.id))) {
        const updatedIds = adminTimeSaleProductIds.filter((id) => String(id) !== String(editingProduct.id));
        setAdminTimeSaleProductIds(updatedIds);
        if (typeof window !== "undefined") {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
          setTimeout(() => window.dispatchEvent(new CustomEvent("admin_products_updated")), 0);
        }
      }
    }

    triggerToast(`"${editTitle}" 상품 정보(총 재고 ${totalStock}개, 라벨: ${editLabel || "없음"}, 사이즈: ${editSizes.join("/")})가 수정되었습니다!`);
  };

  // Set Item Sale Admin State
  const [setSalesList, setSetSalesList] = useState<any[]>(initialSetSales);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_set_sales");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSetSalesList(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
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

  // New Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProductNoInput, setNewProductNoInput] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>(["new"]);
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDetailDescription, setNewDetailDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newUrlInput, setNewUrlInput] = useState("");
  const [newStock, setNewStock] = useState<number>(50);
  const [newIsMainFeatured, setNewIsMainFeatured] = useState(true);
  const [newColors, setNewColors] = useState<string[]>([]);
  const [newColorHexMap, setNewColorHexMap] = useState<Record<string, string>>(DEFAULT_COLOR_HEX_MAP);
  const [newCustomColor, setNewCustomColor] = useState("");
  const [newLabel, setNewLabel] = useState<"" | "BLACK_LABEL" | "PREMIUM" | "ESSENTIAL">("PREMIUM");
  const [newSizes, setNewSizes] = useState<string[]>(["1", "2", "3"]);
  const [newSizeMeasurements, setNewSizeMeasurements] = useState<SizeMeasurementRow[]>(DEFAULT_SIZE_MEASUREMENTS);
  const [newNewMeasurementName, setNewNewMeasurementName] = useState("");
  const [newSizeStock, setNewSizeStock] = useState<Record<string, number>>({ "1": 10, "2": 10, "3": 10 });
  // Bulk discount states for new product modal
  const [newBulkEnabled, setNewBulkEnabled] = useState(false);
  const [newBulkRules, setNewBulkRules] = useState<{qty: number; rate: number}[]>([{ qty: 2, rate: 5 }]);
  // Fabric info states for new product modal
  const [newFabricComposition, setNewFabricComposition] = useState("COTTON 100% (프리미엄 콤마 코튼)");
  const [newElasticity, setNewElasticity] = useState("보통");
  const [newSheerness, setNewSheerness] = useState("없음");
  const [newThickness, setNewThickness] = useState("적당함");
  const [newLining, setNewLining] = useState("없음");
  const [newFabricImage, setNewFabricImage] = useState("");
  // Time sale states for new product modal
  const [newIsTimeSale, setNewIsTimeSale] = useState(false);
  const [newTimeSaleHours, setNewTimeSaleHours] = useState("24");
  const [newTimeSaleMinutes, setNewTimeSaleMinutes] = useState("0");
  const [newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice] = useState("");
  const [newTimeSaleDiscountRate, setNewTimeSaleDiscountRate] = useState("35");
  const [newTimeSaleStartMonth, setNewTimeSaleStartMonth] = useState("8");
  const [newTimeSaleStartDay, setNewTimeSaleStartDay] = useState("20");
  const [newTimeSaleStartAmpm, setNewTimeSaleStartAmpm] = useState("오전");
  const [newTimeSaleStartHour, setNewTimeSaleStartHour] = useState("09");
  const [newTimeSaleStartMinute, setNewTimeSaleStartMinute] = useState("00");
  const [newTimeSaleEndMonth, setNewTimeSaleEndMonth] = useState("8");
  const [newTimeSaleEndDay, setNewTimeSaleEndDay] = useState("27");
  const [newTimeSaleEndAmpm, setNewTimeSaleEndAmpm] = useState("오후");
  const [newTimeSaleEndHour, setNewTimeSaleEndHour] = useState("11");
  const [newTimeSaleEndMinute, setNewTimeSaleEndMinute] = useState("59");

  // Time sale states for edit product modal
  const [editTimeSaleStartMonth, setEditTimeSaleStartMonth] = useState("8");
  const [editTimeSaleStartDay, setEditTimeSaleStartDay] = useState("20");
  const [editTimeSaleStartAmpm, setEditTimeSaleStartAmpm] = useState("오전");
  const [editTimeSaleStartHour, setEditTimeSaleStartHour] = useState("09");
  const [editTimeSaleStartMinute, setEditTimeSaleStartMinute] = useState("00");
  const [editTimeSaleEndMonth, setEditTimeSaleEndMonth] = useState("8");
  const [editTimeSaleEndDay, setEditTimeSaleEndDay] = useState("27");
  const [editTimeSaleEndAmpm, setEditTimeSaleEndAmpm] = useState("오후");
  const [editTimeSaleEndHour, setEditTimeSaleEndHour] = useState("11");
  const [editTimeSaleEndMinute, setEditTimeSaleEndMinute] = useState("59");


  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("14");
  const [adminTimeSaleMinutes, setAdminTimeSaleMinutes] = useState("55");
  const [adminTimeSaleDiscount, setAdminTimeSaleDiscount] = useState("35");
  const [adminTimeSaleTitle, setAdminTimeSaleTitle] = useState("VIP 회원만을 위해 준비된 파격 할인 한정 단독 시크릿 타임세일");
  const [adminTimeSaleStatus, setAdminTimeSaleStatus] = useState("active");
  const [adminTimeSaleCategory, setAdminTimeSaleCategory] = useState("all");
  const [adminTimeSaleProductIds, setAdminTimeSaleProductIds] = useState<string[]>([]);

  // Live Time Sale Countdown Remaining Ticker State
  const [nowTick, setNowTick] = useState(Date.now());
  const [productTimeSaleSettings, setProductTimeSaleSettings] = useState<Record<string, { hours: number; minutes: number; discountPrice?: string; discountRate?: number }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("secret_timesale_item_settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {};
  });

  // Live Chat Admin State & Storage Sync
  const [adminLiveChatMessages, setAdminLiveChatMessages] = useState<any[]>([]);
  const [adminLiveInput, setAdminLiveInput] = useState("");
  const lastLiveChatMsg = adminLiveChatMessages[adminLiveChatMessages.length - 1];
  const isLiveChatSessionEnded = !lastLiveChatMsg || lastLiveChatMsg.id?.startsWith("admin-close") || lastLiveChatMsg.text?.includes("상담이 종료되었습니다");

  // Multi-Customer Live Chat Sessions State
  const [activeSessionId, setActiveSessionId] = useState<string>("vip@choicomma.com");
  const [chatSessionsList, setChatSessionsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_chat_sessions");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      {
        id: "vip@choicomma.com",
        name: "최상위 VIP 회원님",
        email: "vip@choicomma.com",
        tier: "VIP",
        badgeColor: "bg-amber-400 text-neutral-950 font-black",
        status: "online",
      },
    ];
  });

  const [demoSessionMessages, setDemoSessionMessages] = useState<Record<string, any[]>>({});

  const syncAdminLiveChat = () => {
    if (typeof window === "undefined" || !activeSessionId) return;
    const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
    const saved = localStorage.getItem(sessionKey) || localStorage.getItem("site_live_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAdminLiveChatMessages(parsed);
          return;
        }
      } catch (e) {}
    }
    setAdminLiveChatMessages([]);
  };

  useEffect(() => {
    syncAdminLiveChat();
    window.addEventListener("storage", syncAdminLiveChat);
    window.addEventListener("live_chat_updated", syncAdminLiveChat);
    return () => {
      window.removeEventListener("storage", syncAdminLiveChat);
      window.removeEventListener("live_chat_updated", syncAdminLiveChat);
    };
  }, [activeSessionId]);

  const activeSessionMessages = adminLiveChatMessages;

  const handleAdminSendLiveChat = (presetText?: string) => {
    const textToSend = presetText || adminLiveInput;
    if (!textToSend.trim() || !activeSessionId) return;

    const dateNow = new Date();
    const hours = String(dateNow.getHours()).padStart(2, "0");
    const mins = String(dateNow.getMinutes()).padStart(2, "0");

    const newReply = {
      id: `admin-reply-${Date.now()}`,
      sender: "admin",
      senderName: "choicomma VIP 케어팀",
      text: textToSend.trim(),
      timestamp: `${hours}:${mins}`,
    };

    const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
    const updated = [...adminLiveChatMessages, newReply];
    setAdminLiveChatMessages(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(sessionKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    }
    setAdminLiveInput("");
    triggerToast("💬 고객 라이브 채팅방으로 답변이 성공적으로 전송되었습니다!");
  };

  const handleAdminEndLiveChat = (sessionIdTarget?: string) => {
    const targetId = sessionIdTarget || activeSessionId;
    const targetSession = chatSessionsList.find((s) => s.id === targetId);
    const sessionName = targetSession?.name || "고객";

    const isConfirmed = window.confirm(
      `정말로 '${sessionName}'님과의 1:1 라이브 상담을 종료하고 대화 내역 및 세션을 삭제하시겠습니까?`
    );
    if (!isConfirmed) return;

    const sessionKey = `site_live_chat_messages_${targetId.trim().toLowerCase()}`;
    setAdminLiveChatMessages([]);
    if (typeof window !== "undefined") {
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));
      localStorage.setItem("site_live_chat_ended", "true");
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
      window.dispatchEvent(new CustomEvent("live_chat_ended"));
    }

    setChatSessionsList((prev) => {
      const filtered = prev.filter((s) => s.id !== targetId);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_chat_sessions", JSON.stringify(filtered));
      }
      if (activeSessionId === targetId) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : "");
      }
      return filtered;
    });
    triggerToast(`🔒 '${sessionName}'님과의 1:1 라이브 상담 및 대화 내역이 성공적으로 삭제되었습니다.`);
  };

  const handleAdminClearLiveChat = () => {
    const isConfirmed = window.confirm(
      "정말로 라이브 채팅 대화 기록을 전체 초기화하시겠습니까?\n이 작업은 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    if (activeSessionId && typeof window !== "undefined") {
      const sessionKey = `site_live_chat_messages_${activeSessionId.trim().toLowerCase()}`;
      localStorage.setItem(sessionKey, JSON.stringify([]));
      localStorage.setItem("site_live_chat_messages", JSON.stringify([]));
    }
    setAdminLiveChatMessages([]);
    window.dispatchEvent(new CustomEvent("live_chat_updated"));
    triggerToast("🧹 라이브 채팅 기록이 전체 초기화되었습니다.");
  };

  const [productTimeSaleExpiries, setProductTimeSaleExpiries] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("secret_timesale_item_expiries");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {};
  });

  // Ticker interval every 1 second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getProductTimeSetting = (productId: string) => {
    if (productTimeSaleSettings[productId]) {
      return productTimeSaleSettings[productId];
    }
    return {
      hours: parseInt(adminTimeSaleHours) || 24,
      minutes: parseInt(adminTimeSaleMinutes) || 0,
    };
  };

  const handleUpdateProductTimeSetting = (productId: string, hours: number, minutes: number, discountPrice?: string, discountRate?: number) => {
    const updatedSettings = {
      ...productTimeSaleSettings,
      [productId]: {
        ...productTimeSaleSettings[productId],
        hours,
        minutes,
        ...(discountPrice !== undefined ? { discountPrice } : {}),
        ...(discountRate !== undefined ? { discountRate } : {}),
      },
    };
    const newExpiry = Date.now() + (hours * 3600 + minutes * 60) * 1000;
    const updatedExpiries = {
      ...productTimeSaleExpiries,
      [productId]: newExpiry,
    };

    setProductTimeSaleSettings(updatedSettings);
    setProductTimeSaleExpiries(updatedExpiries);

    if (typeof window !== "undefined") {
      localStorage.setItem("secret_timesale_item_settings", JSON.stringify(updatedSettings));
      localStorage.setItem("secret_timesale_item_expiries", JSON.stringify(updatedExpiries));
      window.dispatchEvent(new CustomEvent("storage"));
    }
  };

  const [timeSaleRemainingSec, setTimeSaleRemainingSec] = useState<number>(() => {
    const h = parseInt(adminTimeSaleHours) || 0;
    const m = parseInt(adminTimeSaleMinutes) || 0;
    return h * 3600 + m * 60;
  });

  React.useEffect(() => {
    const h = parseInt(adminTimeSaleHours) || 0;
    const m = parseInt(adminTimeSaleMinutes) || 0;
    setTimeSaleRemainingSec(h * 3600 + m * 60);
  }, [adminTimeSaleHours, adminTimeSaleMinutes]);

  React.useEffect(() => {
    if (adminTimeSaleStatus !== "active") return;
    const interval = setInterval(() => {
      setTimeSaleRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [adminTimeSaleStatus]);

  const formatRemainingTimeDisplay = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const formattedHH = String(hours).padStart(2, "0");
    const formattedMM = String(mins).padStart(2, "0");
    const formattedSS = String(secs).padStart(2, "0");

    const expiryDate = new Date(Date.now() + totalSec * 1000);
    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
    const day = String(expiryDate.getDate()).padStart(2, "0");
    const hoursStr = String(expiryDate.getHours()).padStart(2, "0");
    const minsStr = String(expiryDate.getMinutes()).padStart(2, "0");
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = weekDays[expiryDate.getDay()];

    const expiryFormatted = `${year}-${month}-${day} ${hoursStr}:${minsStr} (${dayOfWeek}요일)`;

    return {
      hours,
      mins,
      secs,
      formattedHH,
      formattedMM,
      formattedSS,
      timeString: `${hours}시간 ${formattedMM}분 ${formattedSS}초`,
      expiryFormatted,
    };
  };
  const [isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen] = useState(false);
  const [timeSaleItemSearchQuery, setTimeSaleItemSearchQuery] = useState("");
  const [timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter] = useState("all");


  // Main Home Page Admin Control State
  const [mainBadgeText, setMainBadgeText] = useState("latest drop");
  const [mainNoticeBanner, setMainNoticeBanner] = useState("전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다.");
  const [isMainNoticeActive, setIsMainNoticeActive] = useState(true);

  // Customer Management Admin State
  const [customersList, setCustomersList] = useState<any[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isCleared = localStorage.getItem("admin_customers_cleared_v2");
      if (!isCleared) {
        localStorage.setItem("admin_customers", JSON.stringify([]));
        localStorage.setItem("admin_customers_cleared_v2", "true");
        setCustomersList([]);
        return;
      }
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          const parsed: any[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCustomersList(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);



  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_customers", JSON.stringify(customersList));
    }
  }, [customersList]);

  React.useEffect(() => {
    const syncAdminCustomers = () => {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCustomersList(parsed);
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", syncAdminCustomers);
    window.addEventListener("admin_customers_updated", syncAdminCustomers);
    return () => {
      window.removeEventListener("storage", syncAdminCustomers);
      window.removeEventListener("admin_customers_updated", syncAdminCustomers);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_orders", JSON.stringify(ordersList));
    }
  }, [ordersList]);

  React.useEffect(() => {
    const syncAdminOrders = () => {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("admin_orders");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setOrdersList(parsed);
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", syncAdminOrders);
    window.addEventListener("admin_orders_updated", syncAdminOrders);
    const interval = setInterval(syncAdminOrders, 2000);
    return () => {
      window.removeEventListener("storage", syncAdminOrders);
      window.removeEventListener("admin_orders_updated", syncAdminOrders);
      clearInterval(interval);
    };
  }, []);

  // Customer Search & Filters
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerGradeFilter, setCustomerGradeFilter] = useState("all");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all");

  // Add Customer Modal State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("010-");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustGrade, setNewCustGrade] = useState("REGULAR");
  const [newCustPoints, setNewCustPoints] = useState("10000");
  const [newCustStatus, setNewCustStatus] = useState("Active");

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [editCustGrade, setEditCustGrade] = useState("");
  const [editCustAddress, setEditCustAddress] = useState("");
  const [editCustPointsDelta, setEditCustPointsDelta] = useState("0");
  const [editCustStatus, setEditCustStatus] = useState("Active");

  // Customer Handlers
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustEmail.trim()) {
      triggerToast("회원 이름과 이메일 주소를 정확히 입력해 주세요.");
      return;
    }

    const newCust = {
      id: `CUST-${1000 + customersList.length + 1}`,
      name: newCustName.trim(),
      email: newCustEmail.trim(),
      phone: newCustPhone.trim() || "010-0000-0000",
      address: newCustAddress.trim() || "-",
      grade: newCustGrade,
      totalSpent: 0,
      points: parseInt(newCustPoints) || 0,
      couponsCount: 1,
      joinedDate: new Date().toISOString().split("T")[0],
      status: newCustStatus,
    };

    const updated = [newCust, ...customersList];
    setCustomersList(updated);
    setIsAddCustomerModalOpen(false);
    setNewCustName("");
    setNewCustEmail("");
    setNewCustPhone("010-");
    setNewCustAddress("");
    setNewCustGrade("REGULAR");
    setNewCustPoints("10000");
    setNewCustStatus("Active");
    triggerToast(`신규 회원 '${newCust.name}'님 정보가 성공적으로 등록되었습니다!`);
  };

  const handleOpenEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setEditCustGrade(customer.grade);
    setEditCustAddress(customer.address || "");
    setEditCustPointsDelta("0");
    setEditCustStatus(customer.status);
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const delta = parseInt(editCustPointsDelta) || 0;
    const updatedList = customersList.map((c) => {
      if (c.id === editingCustomer.id) {
        const newPoints = Math.max(0, c.points + delta);
        return {
          ...c,
          grade: editCustGrade,
          address: editCustAddress,
          points: newPoints,
          status: editCustStatus,
        };
      }
      return c;
    });

    setCustomersList(updatedList);
    setEditingCustomer(null);
    triggerToast(`회원 '${editingCustomer.name}'님의 정보가 반영되었습니다.`);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (window.confirm(`정말로 회원 '${name}'님의 계정 정보를 삭제하시겠습니까?`)) {
      const updated = customersList.filter((c) => c.id !== id);
      setCustomersList(updated);
      triggerToast(`회원 '${name}'님의 정보가 삭제되었습니다.`);
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const parsedCustomers = rows.map((row, idx) => {
          const rawGrade = String(row["회원 등급"] || row["회원 그룹"] || "REGULAR").trim();
          let grade = "REGULAR";
          if (rawGrade.includes("BLACK") || rawGrade.includes("블랙")) grade = "BLACK VIP";
          else if (rawGrade.includes("GOLD") || rawGrade.includes("골드")) grade = "GOLD VIP";
          else if (rawGrade.includes("SILVER") || rawGrade.includes("실버")) grade = "SILVER VIP";
          else if (rawGrade.includes("VIP") || rawGrade.includes("우수")) grade = "GOLD VIP";
          else if (parseFloat(row["구매금액(KRW)"]) >= 1000000) grade = "GOLD VIP";
          else if (parseFloat(row["구매금액(KRW)"]) >= 500000) grade = "SILVER VIP";

          const rawPhone = String(row["연락처"] || "").trim();
          const rawDate = String(row["가입일"] || "").trim();

          return {
            id: String(row["고유키"] || `CUST-${Date.now()}-${idx}`),
            name: String(row["이름"] || "무명 회원").trim(),
            email: String(row["이메일"] || row["아이디"] || "-").trim(),
            phone: rawPhone || "-",
            grade: grade,
            rawGrade: rawGrade,
            totalSpent: parseFloat(row["구매금액(KRW)"]) || 0,
            points: parseInt(row["보유 적립금 포인트"]) || 0,
            couponsCount: parseInt(row["작성 게시물 개수"]) || 1,
            joinedDate: rawDate ? rawDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            status: "Active",
          };
        });

        const combined = [...parsedCustomers, ...customersList];
        setCustomersList(combined);
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_customers", JSON.stringify(combined));
          window.dispatchEvent(new CustomEvent("storage"));
        }
        triggerToast(`엑셀 파일에서 총 ${parsedCustomers.length.toLocaleString()}명의 회원 정보가 연동되었습니다!`);
      } catch (err) {
        console.error(err);
        triggerToast("엑셀 파싱 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleResetCustomerData = () => {
    if (window.confirm("엑셀 회원 데이터(5,666명)로 복원하시겠습니까?")) {
      setCustomersList(initialCustomers);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify(initialCustomers));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      triggerToast("엑셀 회원 데이터(5,666명)로 복원되었습니다.");
    }
  };

  const handleClearAllCustomers = () => {
    if (window.confirm("정말로 모든 회원 정보를 초기화(0명) 하시겠습니까?")) {
      setCustomersList([]);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_customers", JSON.stringify([]));
        window.dispatchEvent(new CustomEvent("storage"));
      }
      triggerToast("전체 회원 목록이 0명으로 초기화되었습니다.");
    }
  };

  const newCustomersThisMonth = React.useMemo(() => {
    const currentYM = new Date().toISOString().slice(0, 7);
    return customersList.filter((c) => c.joinedDate && c.joinedDate.startsWith(currentYM)).length;
  }, [customersList]);

  const filteredCustomers = React.useMemo(() => {
    return customersList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase()));
      const matchesGrade = customerGradeFilter === "all" || c.grade === customerGradeFilter;
      const matchesStatus = customerStatusFilter === "all" || c.status === customerStatusFilter;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [customersList, customerSearchQuery, customerGradeFilter, customerStatusFilter]);

  const filteredProducts = React.useMemo(() => {
    const list = productsList.filter((p) => {
      const pCode = String(getProductNo(p));
      const pNoNum = String(getProductNoNum(p));
      const cleanSearch = searchQuery.toLowerCase().replace("#", "").trim();
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        pCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pNoNum === cleanSearch ||
        cleanSearch === pCode.toLowerCase().replace("cc-", "").replace("cc", "");
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        p.categoryId === selectedCategoryFilter ||
        (Array.isArray(p.categoryIds) && p.categoryIds.includes(selectedCategoryFilter));
      return matchesSearch && matchesCategory;
    });

    if (productSortOrder === "custom") {
      return list;
    }

    list.sort((a, b) => {
      const pNoA = getProductNoNum(a);
      const pNoB = getProductNoNum(b);

      if (productSortOrder === "productNoAsc") {
        return pNoA - pNoB;
      }
      if (productSortOrder === "nameAsc") {
        return a.title.localeCompare(b.title, "ko");
      }
      if (productSortOrder === "priceDesc") {
        return parseFloat(b.priceRange?.minVariantPrice?.amount || "0") - parseFloat(a.priceRange?.minVariantPrice?.amount || "0");
      }
      if (productSortOrder === "priceAsc") {
        return parseFloat(a.priceRange?.minVariantPrice?.amount || "0") - parseFloat(b.priceRange?.minVariantPrice?.amount || "0");
      }
      // Default: productNoDesc (상품번호 내림차순 / 최신 등록순)
      return pNoB - pNoA;
    });

    return list;
  }, [productsList, searchQuery, selectedCategoryFilter, productSortOrder, getProductNo, getProductNoNum]);

  // Customer Table Pagination
  const [customerPage, setCustomerPage] = useState(1);
  const CUSTOMERS_PER_PAGE = 25;

  React.useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchQuery, customerGradeFilter, customerStatusFilter]);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = React.useMemo(() => {
    return filteredCustomers.slice((customerPage - 1) * CUSTOMERS_PER_PAGE, customerPage * CUSTOMERS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  // Shipment Management State & Handlers
  const [shipmentsList, setShipmentsList] = useState<any[]>(initialShipments);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setShipmentsList(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_shipments", JSON.stringify(shipmentsList));
      window.dispatchEvent(new CustomEvent("storage"));
    }
  }, [shipmentsList]);

  const [shipmentSearchQuery, setShipmentSearchQuery] = useState("");
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState("all");
  const [shipmentCarrierFilter, setShipmentCarrierFilter] = useState("all");
  const [shipmentPage, setShipmentPage] = useState(1);
  const SHIPMENTS_PER_PAGE = 15;

  const [isAddShipmentModalOpen, setIsAddShipmentModalOpen] = useState(false);
  const [newShipmentRecipient, setNewShipmentRecipient] = useState("");
  const [newShipmentPhone, setNewShipmentPhone] = useState("");
  const [newShipmentAddress, setNewShipmentAddress] = useState("");
  const [newShipmentItems, setNewShipmentItems] = useState("");
  const [newShipmentCarrier, setNewShipmentCarrier] = useState("CJ대한통운");
  const [newShipmentTracking, setNewShipmentTracking] = useState("");
  const [newShipmentStatus, setNewShipmentStatus] = useState("Pending");

  const [editingShipment, setEditingShipment] = useState<any | null>(null);
  const [editShipmentCarrier, setEditShipmentCarrier] = useState("CJ대한통운");
  const [editShipmentTracking, setEditShipmentTracking] = useState("");
  const [editShipmentStatus, setEditShipmentStatus] = useState("Pending");

  // CJ Logistics (CJ대한통운) Integration State
  const [isCjConfigModalOpen, setIsCjConfigModalOpen] = useState(false);
  const [cjClientCode, setCjClientCode] = useState("CJ-882910");
  const [cjContractNo, setCjContractNo] = useState("30291049");
  const [cjApiKey, setCjApiKey] = useState("cj_live_sk_89201948201948");
  const [cjSenderAddress, setCjSenderAddress] = useState("(04512) 서울 중구 남대문로 81 choicomma 물류센터");

  const handleIssueCjLogisticsTracking = async () => {
    try {
      const pendingShipments = shipmentsList.filter((s) => s.status === "Pending");
      if (pendingShipments.length === 0) {
        triggerToast("배송 준비 중인 주문 건이 없습니다.");
        return;
      }
      triggerToast("CJ대한통운 Open API 통신 중... 운송장 번호 일괄 채번/발급 중입니다.");
      const res = await fetch("/api/admin/shipping/cj-logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_tracking", shipments: shipmentsList }),
      });
      const data = await res.json();
      if (data.success && data.shipments) {
        setShipmentsList(data.shipments);
        triggerToast(`CJ대한통운 운송장 번호(${pendingShipments.length}건)가 자동 생성 및 '배송 중'으로 연동되었습니다!`);
      } else {
        triggerToast(data.message || "CJ대한통운 연동 중 오류가 발생했습니다.");
      }
    } catch (e: any) {
      triggerToast("CJ대한통운 API 통신 오류가 발생했습니다.");
    }
  };

  const handleExportCjExcel = () => {
    try {
      const pendingShipments = shipmentsList.filter((s) => s.status === "Pending");
      if (pendingShipments.length === 0) {
        triggerToast("다운로드할 배송 준비 건이 없습니다.");
        return;
      }
      const exportData = pendingShipments.map((s) => ({
        "주문번호": s.orderId,
        "받는분성명": s.recipient,
        "받는분전화번호": s.phone,
        "받는분주소": s.address,
        "상품명": s.items,
        "수량": 1,
        "배송메세지": "부재시 문앞에 놓아주세요",
        "택배사": "CJ대한통운",
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CJ대한통운_eFlex");
      XLSX.writeFile(wb, `CJ대한통운_발송요청_${new Date().toISOString().split("T")[0]}.xlsx`);
      triggerToast(`CJ대한통운 LoIS e-Flex 양식 엑셀 파일(${pendingShipments.length}건)이 다운로드되었습니다.`);
    } catch (e) {
      triggerToast("엑셀 파일 생성 중 오류가 발생했습니다.");
    }
  };

  const handleAddShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipmentRecipient.trim()) {
      triggerToast("수령인 이름을 입력해 주세요.");
      return;
    }
    const newShipment = {
      id: `TRK-2026-${String(Date.now()).slice(-4)}`,
      orderId: `ORD-2026-${String(Date.now()).slice(-4)}`,
      recipient: newShipmentRecipient.trim(),
      phone: newShipmentPhone.trim() || "010-0000-0000",
      address: newShipmentAddress.trim() || "-",
      items: newShipmentItems.trim() || "주문 상품 1건",
      carrier: newShipmentCarrier,
      trackingNumber: newShipmentTracking.trim() || String(Math.floor(100000000000 + Math.random() * 900000000000)),
      status: newShipmentStatus,
      shippedDate: newShipmentStatus === "Pending" ? "-" : new Date().toISOString().split("T")[0],
      estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    };
    setShipmentsList([newShipment, ...shipmentsList]);
    setIsAddShipmentModalOpen(false);
    setNewShipmentRecipient("");
    setNewShipmentPhone("");
    setNewShipmentAddress("");
    setNewShipmentItems("");
    setNewShipmentTracking("");
    triggerToast(`운송장 및 배송 건(${newShipment.id})이 새로 등록되었습니다!`);
  };

  const handleOpenEditShipment = (shipment: any) => {
    setEditingShipment(shipment);
    setEditShipmentCarrier(shipment.carrier || "CJ대한통운");
    setEditShipmentTracking(shipment.trackingNumber || "");
    setEditShipmentStatus(shipment.status || "Pending");
  };

  const handleSaveEditShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    const updated = shipmentsList.map((s) => {
      if (s.id === editingShipment.id) {
        return {
          ...s,
          carrier: editShipmentCarrier,
          trackingNumber: editShipmentTracking.trim() || s.trackingNumber,
          status: editShipmentStatus,
          shippedDate: editShipmentStatus !== "Pending" && s.shippedDate === "-" ? new Date().toISOString().split("T")[0] : s.shippedDate,
        };
      }
      return s;
    });
    setShipmentsList(updated);
    setEditingShipment(null);
    triggerToast(`배송건 (${editingShipment.id}) 정보가 업데이트되었습니다.`);
  };

  const handleDeleteShipment = (id: string) => {
    if (window.confirm("이 배송건 항목을 삭제하시겠습니까?")) {
      setShipmentsList(shipmentsList.filter((s) => s.id !== id));
      triggerToast("배송건이 삭제되었습니다.");
    }
  };

  const filteredShipments = React.useMemo(() => {
    return shipmentsList.filter((s) => {
      const q = shipmentSearchQuery.toLowerCase();
      const matchesSearch =
        s.recipient.toLowerCase().includes(q) ||
        s.orderId.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.trackingNumber.includes(q) ||
        s.address.toLowerCase().includes(q);
      const matchesStatus = shipmentStatusFilter === "all" || s.status === shipmentStatusFilter;
      const matchesCarrier = shipmentCarrierFilter === "all" || s.carrier === shipmentCarrierFilter;
      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [shipmentsList, shipmentSearchQuery, shipmentStatusFilter, shipmentCarrierFilter]);

  const totalShipmentPages = Math.ceil(filteredShipments.length / SHIPMENTS_PER_PAGE) || 1;
  const paginatedShipments = React.useMemo(() => {
    const start = (shipmentPage - 1) * SHIPMENTS_PER_PAGE;
    return filteredShipments.slice(start, start + SHIPMENTS_PER_PAGE);
  }, [filteredShipments, shipmentPage]);

  React.useEffect(() => {
    const savedSeconds = localStorage.getItem("secret_timesale_seconds");
    if (savedSeconds) {
      const sec = parseInt(savedSeconds);
      setAdminTimeSaleHours(Math.floor(sec / 3600).toString());
      setAdminTimeSaleMinutes(Math.floor((sec % 3600) / 60).toString());
    }
    const savedDiscount = localStorage.getItem("secret_timesale_discount");
    if (savedDiscount) setAdminTimeSaleDiscount(savedDiscount);
    const savedTitle = localStorage.getItem("secret_timesale_title");
    if (savedTitle) setAdminTimeSaleTitle(savedTitle);
    const savedStatus = localStorage.getItem("secret_timesale_status");
    if (savedStatus) setAdminTimeSaleStatus(savedStatus);
    const savedCategory = localStorage.getItem("secret_timesale_category");
    if (savedCategory) setAdminTimeSaleCategory(savedCategory);
    const savedProductIds = localStorage.getItem("secret_timesale_product_ids");
    if (savedProductIds) {
      try {
        const parsed = JSON.parse(savedProductIds);
        if (Array.isArray(parsed)) setAdminTimeSaleProductIds(parsed);
      } catch (e) {}
    }

    // Main Page Settings Load
    const savedBadge = localStorage.getItem("main_badge_text");
    if (savedBadge) setMainBadgeText(savedBadge);
    const savedNotice = localStorage.getItem("main_notice_banner");
    if (savedNotice) setMainNoticeBanner(savedNotice);
    const savedNoticeActive = localStorage.getItem("main_notice_active");
    if (savedNoticeActive) setIsMainNoticeActive(savedNoticeActive === "true");
  }, []);

  const handleSaveMainPageSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("main_badge_text", mainBadgeText);
    localStorage.setItem("main_notice_banner", mainNoticeBanner);
    localStorage.setItem("main_notice_active", isMainNoticeActive.toString());
    window.dispatchEvent(new CustomEvent("storage"));
    triggerToast("메인 화면 설정(상단 공지 띠배너, 배지 문구)이 메인 페이지에 즉시 적용되었습니다!");
  };

  const mockVipCustomersList = React.useMemo(() => {
    return customersList
      .filter((c: any) => c.grade && c.grade.includes("VIP"))
      .slice(0, 20)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        email: c.email,
        totalSpent: `₩${Number(c.totalSpent || 0).toLocaleString()}`,
      }));
  }, [customersList]);



  const handleSaveTimeSaleDetailSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const statusText = adminTimeSaleStatus === "active" ? "🔴 진행 중 (Active)" : "⏸️ 일시 정지 (Paused)";

    const isConfirmed = window.confirm(
      `타임세일 설정을 저장하고 쇼핑몰 전체에 즉시 반영하시겠습니까?\n\n• 진행 상태: ${statusText}\n• 할인율: ${adminTimeSaleDiscount}%\n• 지정 상품 수: 총 ${adminTimeSaleProductIds.length}개`
    );
    if (!isConfirmed) return;

    const h = parseInt(adminTimeSaleHours) || 0;
    const m = parseInt(adminTimeSaleMinutes) || 0;
    const totalSeconds = h * 3600 + m * 60;
    const expiryTimestamp = Date.now() + totalSeconds * 1000;
    localStorage.setItem("secret_timesale_seconds", totalSeconds.toString());
    localStorage.setItem("secret_timesale_expiry_timestamp", expiryTimestamp.toString());
    localStorage.setItem("secret_timesale_discount", adminTimeSaleDiscount);
    localStorage.setItem("secret_timesale_title", adminTimeSaleTitle);
    localStorage.setItem("secret_timesale_status", adminTimeSaleStatus);
    localStorage.setItem("secret_timesale_category", adminTimeSaleCategory);
    localStorage.setItem("secret_timesale_product_ids", JSON.stringify(adminTimeSaleProductIds));
    window.dispatchEvent(new CustomEvent("storage"));

    const toastMsg = `타임세일 설정(할인율: ${adminTimeSaleDiscount}%, 지정 상품: ${adminTimeSaleProductIds.length}개)이 성공적으로 저장되었습니다!`;
    triggerToast(toastMsg);
  };

  const handleToggleTimeSaleProduct = (id: string) => {
    const prod = productsList.find((p) => p.id === id);
    const prodTitle = prod?.title || "선택한 상품";
    const isSelected = adminTimeSaleProductIds.includes(id);

    const updated = isSelected
      ? adminTimeSaleProductIds.filter((pId) => pId !== id)
      : [...adminTimeSaleProductIds, id];
    setAdminTimeSaleProductIds(updated);
    localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("storage"));

    if (isSelected) {
      triggerToast(`'${prodTitle}' 상품이 타임세일 지정 목록에서 해제되었습니다.`);
    } else {
      triggerToast(`'${prodTitle}' 상품이 타임세일 지정 목록에 추가되었습니다.`);
    }
  };

  // Export Revenue Settlements CSV
  const handleExportRevenueCSV = () => {
    const headers = ["정산ID", "정산일자", "주문건수", "총주문금액(원)", "할인금액(원)", "환불/취소금액(원)", "실매출액(원)", "결제수단", "정산상태"];
    const rows = initialDailySettlements.map((s) => [
      s.id,
      s.date,
      s.orderCount,
      s.grossSales,
      s.discounts,
      s.refunds,
      s.netRevenue,
      s.paymentMethod,
      s.status === "completed" ? "정산완료" : "정산예정",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CHOICOMMA_매출정산리포트_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Set Item Sale Handlers
  const handleToggleProductInSet = (productId: string) => {
    if (selectedSetProductIds.includes(productId)) {
      setSelectedSetProductIds(selectedSetProductIds.filter((id) => id !== productId));
      const next = { ...setProductQuantities };
      delete next[productId];
      setSetProductQuantities(next);
    } else {
      setSelectedSetProductIds([...selectedSetProductIds, productId]);
      setSetProductQuantities({ ...setProductQuantities, [productId]: 1 });
    }
  };

  const handleUpdateProductQuantityInSet = (productId: string, delta: number) => {
    const current = setProductQuantities[productId] || 1;
    const nextVal = Math.max(1, current + delta);
    setSetProductQuantities({ ...setProductQuantities, [productId]: nextVal });
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
    setSetSalesList(updated);
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
      setAdminTimeSaleProductIds(updatedIds);
      localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
    }

    window.dispatchEvent(new CustomEvent("storage"));

    setIsSetModalOpen(false);
    setSetBundleTitle("");
    setSelectedSetProductIds([]);
    setSetProductQuantities({});
    setSetDiscountRate(20);
    triggerToast(`새 세트 할인 상품 '${setBundleTitle}'이(가) SPECIAL 카테고리에 즉시 노출되도록 등록되었습니다!`);
  };

  const handleToggleSetStatus = (id: string) => {
    const updated = setSalesList.map((s: any) =>
      s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s
    );
    setSetSalesList(updated);
    localStorage.setItem("admin_set_sales", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("storage"));
    triggerToast("세트 할인 진행 상태가 반영되었습니다.");
  };

  const handleDeleteSetBundle = (id: string) => {
    const updated = setSalesList.filter((s: any) => s.id !== id);
    setSetSalesList(updated);
    localStorage.setItem("admin_set_sales", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("storage"));
    triggerToast("세트 아이템 할인이 삭제되었습니다.");
  };

  // File Upload Handler
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };



  // Add Product Handler
  const handleMultiImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditMode: boolean = false
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentList = isEditMode ? editImages : newImages;
    const availableSlots = 10 - currentList.length;

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

    if (isEditMode) {
      setEditImages((prev) => [...prev, ...newUrls].slice(0, 10));
    } else {
      setNewImages((prev) => [...prev, ...newUrls].slice(0, 10));
    }

    e.target.value = "";
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const totalNewStock = calculateTotalStock(newColors, newSizes, newSizeStock);
    const finalImages = newImages.length > 0 ? newImages : ["/product_1.webp"];

    // Determine product sequence number or code
    let newProdNo: number;
    let newProductCode: string;

    if (newProductNoInput.trim()) {
      const inputStr = newProductNoInput.trim();
      const match = inputStr.match(/\d+/);
      newProdNo = match ? parseInt(match[0], 10) : Date.now();
      newProductCode = inputStr.toUpperCase().startsWith("CC-")
        ? inputStr.toUpperCase()
        : `CC-${inputStr.padStart(3, "0")}`;
    } else {
      const maxNo = productsList.reduce((max, p) => {
        const num = getProductNoNum(p);
        return num > max ? num : max;
      }, 0);
      newProdNo = maxNo + 1;
      newProductCode = `CC-${String(newProdNo).padStart(3, "0")}`;
    }

    const newProd = {
      id: `custom-prod-${Date.now()}`,
      productNo: newProdNo,
      productCode: newProductCode,
      createdAt: new Date().toISOString(),
      handle: newTitle.toLowerCase().replace(/\s+/g, "-"),
      title: newTitle,
      description: newDescription || "새로운 시그니처 상품입니다.",
      detailDescription: newDetailDescription || "",
      descriptionHtml: `<p>${newDescription}</p>`,
      categoryId: newCategories[0] || "new",
      categoryIds: newCategories,
      stock: totalNewStock,
      sizeStock: newSizeStock,
      availableForSale: totalNewStock > 0,
      isMainFeatured: newIsMainFeatured,
      colors: newColors,
      colorHexMap: newColorHexMap,
      sizes: newSizes,
      sizeMeasurements: newSizeMeasurements,
      options: [
        { id: "color", name: "Color", values: newColors },
        { id: "size", name: "Size", values: newSizes },
      ],
      variants: newColors.flatMap((color: string) =>
        newSizes.map((size: string) => ({
          id: `custom-prod-${Date.now()}-${color}-${size}`,
          title: `${newTitle} - ${color} / ${size}`,
          availableForSale: totalNewStock > 0,
          selectedOptions: [
            { name: "Color", value: color },
            { name: "Size", value: size },
          ],
          price: { amount: newPrice, currencyCode: "KRW" },
        }))
      ),
      productLabel: newLabel,
      bulkDiscount: { enabled: newBulkEnabled, rules: newBulkRules },
      fabricComposition: newFabricComposition,
      elasticity: newElasticity,
      sheerness: newSheerness,
      thickness: newThickness,
      lining: newLining,
      fabricImage: newFabricImage,
      tags: newIsMainFeatured ? ["NEW", "top-seller"] : ["NEW"],
      featuredImage: {
        altText: newTitle,
        url: finalImages[0],
        width: 1200,
        height: 1200,
      },
      images: finalImages.map((url) => ({ url, altText: newTitle })),
      currencyCode: "KRW",
      priceRange: {
        maxVariantPrice: { amount: newPrice, currencyCode: "KRW" },
        minVariantPrice: { amount: newPrice, currencyCode: "KRW" },
      },
      timeSaleDiscountPrice: newIsTimeSale ? newTimeSaleDiscountPrice : undefined,
      timeSaleDiscountRate: newIsTimeSale ? (newTimeSaleDiscountRate ? parseInt(newTimeSaleDiscountRate) : 35) : undefined,
    };

    const updatedFullList = [newProd, ...productsList];
    setProductsList(updatedFullList);
    saveProductsToStorage(updatedFullList);
    setIsAddModalOpen(false);

    // Save Time Sale settings for new product if enabled
    if (newIsTimeSale) {
      const updatedIds = [...adminTimeSaleProductIds, newProd.id];
      setAdminTimeSaleProductIds(updatedIds);
      const h = parseInt(newTimeSaleHours) || 0;
      const m = parseInt(newTimeSaleMinutes) || 0;
      const rateNum = newTimeSaleDiscountRate ? parseInt(newTimeSaleDiscountRate) : 35;
      
      const updatedSettings = {
        ...productTimeSaleSettings,
        [newProd.id]: { hours: h, minutes: m, discountPrice: newTimeSaleDiscountPrice || undefined, discountRate: rateNum },
      };
      const newExpiry = Date.now() + (h * 3600 + m * 60) * 1000;
      const updatedExpiries = {
        ...productTimeSaleExpiries,
        [newProd.id]: newExpiry,
      };
      setProductTimeSaleSettings(updatedSettings);
      setProductTimeSaleExpiries(updatedExpiries);

      if (typeof window !== "undefined") {
        localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
        localStorage.setItem("secret_timesale_item_settings", JSON.stringify(updatedSettings));
        localStorage.setItem("secret_timesale_item_expiries", JSON.stringify(updatedExpiries));
        setTimeout(() => window.dispatchEvent(new CustomEvent("admin_products_updated")), 0);
      }
    }

    setNewProductNoInput("");
    setNewTitle("");
    setNewPrice("");
    setNewDescription("");
    setNewImageUrl("");
    setNewImages([]);
    setNewUrlInput("");
    setNewFabricImage("");
    setNewColors([]);
    setNewSizes(["1", "2", "3"]);
    setNewSizeStock({ "1": 10, "2": 10, "3": 10 });
    setNewLabel("PREMIUM");
    setNewBulkEnabled(false);
    setNewBulkRules([{ qty: 2, rate: 5 }]);
    setNewIsTimeSale(false);
    setNewTimeSaleHours("24");
    setNewTimeSaleMinutes("0");
    triggerToast(`"${newTitle}" 상품 (옵션: ${newColors.length}컬러 / ${newSizes.length}사이즈 / 총 재고 ${totalNewStock}개)이 추가되었습니다.`);
  };



  // Delete Product
  const handleDeleteProduct = (id: string, title: string) => {
    const isConfirmed = window.confirm(
      `정말로 '${title}' 상품을 완전히 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const updatedList = productsList.filter((p) => p.id !== id);
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(`'${title}' 상품이 성공적으로 삭제되었습니다.`);
  };

  const handleBulkDeleteProducts = (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    const isConfirmed = window.confirm(
      `정말로 선택한 ${targetIds.length}개의 상품을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    const idSet = new Set(targetIds.map(String));
    const updatedList = productsList.filter((p) => !idSet.has(String(p.id)));
    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    triggerToast(`🗑️ 선택한 ${targetIds.length}개 상품이 성공적으로 삭제되었습니다.`);
  };

  const handleClearAllProducts = () => {
    const totalCount = productsList.length;
    const isConfirmed = window.confirm(
      `정말로 상품관리에 등록된 전체 상품 (${totalCount}개)을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`
    );
    if (!isConfirmed) return;

    setProductsList([]);
    saveProductsToStorage([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_products", "[]");
      localStorage.removeItem("secret_timesale_product_ids");
    }
    triggerToast(`🗑️ 상품관리에 등록된 전체 상품 ${totalCount}개가 모두 성공적으로 삭제되었습니다.`);
  };

  const handleRestoreDefaultProducts = () => {
    setProductsList(INITIAL_CHOICOMMA_PRODUCTS);
    saveProductsToStorage(INITIAL_CHOICOMMA_PRODUCTS);
    triggerToast("✨ 초이콤마 대표 시그니처 상품 10종이 모두 성공적으로 복원되었습니다!");
  };

  const handleBulkAddProducts = (newProducts: any[]) => {
    if (!newProducts || newProducts.length === 0) return;
    setProductsList((prev) => {
      const updatedList = [...newProducts, ...prev];
      saveProductsToStorage(updatedList);
      return updatedList;
    });
    triggerToast(`📊 엑셀 일괄 업로드 완료! ${newProducts.length}개의 신규 상품이 성공적으로 등록되었습니다.`);
  };

  const handleMoveProduct = (id: string, direction: "up" | "down") => {
    const idx = productsList.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= productsList.length) return;

    const newList = [...productsList];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;

    setProductsList(newList);
    saveProductsToStorage(newList);
    setProductSortOrder("custom");
    triggerToast(`'${temp.title}' 상품 순서가 이동되었습니다.`);
  };

  // Order Status Cycle
  const updateOrderStatus = (orderId: string) => {
    if (!orderId || typeof orderId !== "string") return;
    const statuses = ["Pending", "Processing", "Shipped", "Completed"];
    setOrdersList((prev) =>
      (prev || []).map((ord) => {
        if (ord && ord.id === orderId) {
          const currentStatus = ord.status || "Pending";
          const idx = statuses.indexOf(currentStatus);
          const nextIdx = idx >= 0 ? (idx + 1) % statuses.length : 0;
          return { ...ord, status: statuses[nextIdx] };
        }
        return ord;
      })
    );
    triggerToast("주문 상태가 업데이트되었습니다.");
  };



  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("choicomma_admin_authenticated");
      if (saved === "false") return false;
    }
    return true;
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim() === "admin" && loginPassword === "Mrschoi83!!") {
      setIsAdminAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("choicomma_admin_authenticated", "true");
      }
      setLoginError("");
      triggerToast("🔐 관리자 인증 성공! 초이콤마 어드민 시스템에 접속되었습니다.");
    } else {
      setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
      triggerToast("❌ 인증 실패: 아이디 또는 비밀번호를 다시 확인해 주세요.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("choicomma_admin_authenticated", "false");
    }
    triggerToast("🔒 관리자 세션이 종료되었습니다.");
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-950 text-white mb-2">
              <LockIcon className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black text-neutral-950">CHOICOMMA ADMIN</h1>
            <p className="text-xs text-neutral-500 font-medium">관리자 전용 스토어 통합 제어 시스템 접속</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">관리자 계정 (ID)</label>
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="관리자 ID 입력 (예: admin)"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-bold text-neutral-950 focus:outline-none focus:border-black"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">비밀번호 (Password)</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-bold text-neutral-950 focus:outline-none focus:border-black"
                required
              />
            </div>
            {loginError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-neutral-950 hover:bg-black text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              🔐 관리자 로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex flex-col font-sans" suppressHydrationWarning>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-neutral-950 text-white font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="h-16 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            onClick={(e) => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            스토어 바로가기
          </Link>
          <div className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center gap-3">
            <Link href="/" onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }}>
              <LogoSvg className="h-5 w-auto text-neutral-950 cursor-pointer" />
            </Link>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded-full">
              ADMIN v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Multi-Language Selector for Admin */}
          <div className="notranslate" translate="no">
            <LanguageSelector />
          </div>

          <button
            onClick={() => triggerToast("새로운 알림이 없습니다.")}
            className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neutral-950 rounded-full" />
          </button>
          <div className="flex items-center gap-3 pl-2 border-l border-neutral-200">
            <div className="w-8 h-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              CC
            </div>
            <div className="hidden sm:block text-xs">
              <p className="font-bold text-neutral-950 leading-tight">Admin Manager</p>
            </div>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer ml-1"
              title="어드민 로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-neutral-200/80 bg-white/50 p-4 flex flex-col gap-1 hidden md:flex shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Menu
          </div>
          {/* 1. 주문 및 배송 관리 */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "orders"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            주문 및 배송 관리
            <span suppressHydrationWarning className="ml-auto text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold">
              {shipmentsList.length}
            </span>
          </button>

          {/* 2. 회원 관리 */}
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "customers"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            회원 관리
            <span suppressHydrationWarning className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {customersList.length.toLocaleString()}
            </span>
          </button>

          {/* 3. 재고 및 입고 캘린더 */}
          <button
            onClick={() => setActiveTab("inbound")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "inbound"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-500" />
            재고 및 입고 캘린더
            <span suppressHydrationWarning className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
              {inboundSchedulesList.filter((s) => s.status === "Scheduled" || s.status === "In Progress").length}
            </span>
          </button>

          {/* 4. 메인 슬라이더 */}
          <button
            onClick={() => setActiveTab("main")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "main"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            메인 이미지 관리
            <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950">
              IMAGE
            </span>
          </button>

          {/* 5. 상품관리 */}
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "products"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Package className="w-4 h-4" />
            상품 관리
            <span suppressHydrationWarning className="ml-auto text-xs px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-800">
              {productsList.length}
            </span>
          </button>



          {/* 7. 세트아이템 */}
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "sales"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <Percent className="w-4 h-4 text-amber-500" />
            세트아이템
            <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950">
              SET
            </span>
          </button>

          {/* 8. 매출 관리 */}
          <button
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "revenue"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            매출 관리
            <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              REVENUE
            </span>
          </button>

          {/* 9. 해외 판매가 */}
          <button
            onClick={() => setActiveTab("global_sales")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "global_sales"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-700 hover:bg-sky-50 hover:text-neutral-950"
            }`}
          >
            <Globe className="w-4 h-4 text-sky-500" />
            해외 판매가
            <span suppressHydrationWarning className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500 text-neutral-950 shadow-2xs">
              GLOBAL
            </span>
          </button>

          {/* 10. 1:1 라이브 채팅 콘솔 */}
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "inquiries"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-700 hover:bg-amber-50 hover:text-neutral-950"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            1:1 라이브 채팅
            <span suppressHydrationWarning className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 shadow-2xs animate-pulse">
              LIVE ONLINE
            </span>
          </button>

          <div className="mt-auto pt-4 border-t border-neutral-200">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === "settings"
                  ? "bg-neutral-950 text-white font-bold shadow-md"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              }`}
            >
              <Settings className="w-4 h-4" />
              스토어 설정
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto">
          {/* Mobile Horizontal Tab Navigation */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-neutral-200/80 scrollbar-thin">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "orders" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              주문 및 배송
            </button>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "revenue" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              매출 관리
            </button>
            <button
              onClick={() => setActiveTab("timesale")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1 ${
                activeTab === "timesale" ? "bg-amber-500 text-neutral-950 shadow-xs" : "bg-amber-100/70 text-amber-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950" />
              타임세일
            </button>
            <button
              onClick={() => setActiveTab("inbound")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "inbound" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              재고
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "products" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              상품
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "sales" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              세트아이템
            </button>
            <button
              onClick={() => setActiveTab("main")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "main" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              메인
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "customers" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              회원
            </button>
            <button
              onClick={() => setActiveTab("global_sales")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                activeTab === "global_sales"
                  ? "bg-sky-500 text-neutral-950 font-black shadow-xs"
                  : "bg-sky-50 text-sky-900 border border-sky-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              해외 판매가
            </button>
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
                activeTab === "inquiries"
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "bg-amber-100/70 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              1:1 VIP 문의
              {inquiriesList.filter((i) => i.status === "대기").length > 0 && (
                <span className="bg-amber-500 text-neutral-950 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                  {inquiriesList.filter((i) => i.status === "대기").length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 2: PRODUCTS MANAGEMENT */}
          {activeTab === "products" && (
            <ProductsManagement
              productsList={productsList}
              filteredProducts={filteredProducts}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategoryFilter={selectedCategoryFilter}
              setSelectedCategoryFilter={setSelectedCategoryFilter}
              productSortOrder={productSortOrder}
              setProductSortOrder={setProductSortOrder}
              categoriesList={categoriesList}
              getProductStock={getProductStock}
              getProductNo={getProductNo}
              handleClearAllProducts={handleClearAllProducts}
              handleOpenEditModal={handleOpenEditModal}
              handleDeleteProduct={handleDeleteProduct}
              toggleStock={toggleStock}
              toggleMainFeatured={toggleMainFeatured}
              setIsAddModalOpen={setIsAddModalOpen}
              setNewTitle={setNewTitle}
              setNewPrice={setNewPrice}
              setNewDescription={setNewDescription}
              setNewImageUrl={setNewImageUrl}
              setNewImages={setNewImages}
              setNewUrlInput={setNewUrlInput}
              setNewFabricImage={setNewFabricImage}
              setNewColors={setNewColors}
              setNewIsTimeSale={setNewIsTimeSale}
              setNewTimeSaleHours={setNewTimeSaleHours}
              setNewTimeSaleMinutes={setNewTimeSaleMinutes}
              handleBulkAddProducts={handleBulkAddProducts}
              handleMoveProduct={handleMoveProduct}
              handleBulkDeleteProducts={handleBulkDeleteProducts}
            />
          )}

          {/* TAB: TIMESALE & PROMOTION */}
          {activeTab === "sales" && (
            <TimesaleManagement
              setSalesList={setSalesList}
              productsList={productsList}
              setIsSetModalOpen={setIsSetModalOpen}
              handleToggleSetStatus={handleToggleSetStatus}
              handleDeleteSetBundle={handleDeleteSetBundle}
            />
          )}

          {/* TAB: REVENUE MANAGEMENT */}
          {activeTab === "revenue" && (
            <RevenueManagement
              revenueSelectedMonth={revenueSelectedMonth}
              setRevenueSelectedMonth={setRevenueSelectedMonth}
              revenueSelectedYear={revenueSelectedYear}
              setRevenueSelectedYear={setRevenueSelectedYear}
              revenueSearchQuery={revenueSearchQuery}
              setRevenueSearchQuery={setRevenueSearchQuery}
              triggerToast={triggerToast}
            />
          )}

          {/* TAB: MAIN PAGE CONTROL */}
          {activeTab === "main" && (
            <MainPageManagement
              productsList={productsList}
              openImageUploadModal={openImageUploadModal}
              handleRemoveHeroSlide={handleRemoveHeroSlide}
            />
          )}

          {/* TAB: CUSTOMER MANAGEMENT */}
          {activeTab === "customers" && (
            <CustomersManagement
              customersList={customersList}
              setCustomersList={setCustomersList}
              customerSearchQuery={customerSearchQuery}
              setCustomerSearchQuery={setCustomerSearchQuery}
              customerGradeFilter={customerGradeFilter}
              setCustomerGradeFilter={setCustomerGradeFilter}
              setIsAddCustomerModalOpen={setIsAddCustomerModalOpen}
              handleOpenEditCustomer={handleOpenEditCustomer}
              handleDeleteCustomer={handleDeleteCustomer}
              handleClearAllCustomers={handleClearAllCustomers}
              handleExcelFileUpload={handleExcelFileUpload}
            />
          )}

          {/* TAB: ORDERS & SHIPMENTS INTEGRATED MANAGEMENT */}
          {activeTab === "orders" && (
            <OrdersManagement
              shipmentsList={shipmentsList}
              setShipmentsList={setShipmentsList}
              shipmentSearchQuery={shipmentSearchQuery}
              setShipmentSearchQuery={setShipmentSearchQuery}
              shipmentStatusFilter={shipmentStatusFilter}
              setShipmentStatusFilter={setShipmentStatusFilter}
              shipmentCarrierFilter={shipmentCarrierFilter}
              setShipmentCarrierFilter={setShipmentCarrierFilter}
              cjClientCode={cjClientCode}
              cjContractNo={cjContractNo}
              setIsAddShipmentModalOpen={setIsAddShipmentModalOpen}
              setIsCjConfigModalOpen={setIsCjConfigModalOpen}
              handleIssueCjLogisticsTracking={handleIssueCjLogisticsTracking}
              handleExportCjExcel={handleExportCjExcel}
              handleOpenEditShipment={handleOpenEditShipment}
              handleDeleteShipment={handleDeleteShipment}
            />
          )}

          {/* TAB: INBOUND STOCK MANAGEMENT */}
          {activeTab === "inbound" && (
            <InboundStockManagement
              inboundSchedulesList={inboundSchedulesList}
              setInboundSchedulesList={setInboundSchedulesList}
              calendarDate={calendarDate}
              setCalendarDate={setCalendarDate}
              inboundSearchQuery={inboundSearchQuery}
              setInboundSearchQuery={setInboundSearchQuery}
              inboundStatusFilter={inboundStatusFilter}
              setInboundStatusFilter={setInboundStatusFilter}
              setIsAddInboundModalOpen={setIsAddInboundModalOpen}
              setSelectedInboundItem={setSelectedInboundItem}
              setNewInboundDate={setNewInboundDate}
              handleUpdateInboundStatus={handleUpdateInboundStatus}
              handleDeleteInboundSchedule={handleDeleteInboundSchedule}
            />
          )}

          {/* TAB: 1:1 VIP INQUIRIES & LIVE CHAT */}
          {activeTab === "inquiries" && (
            <InquiriesManagement
              adminLiveChatMessages={adminLiveChatMessages}
              chatSessionsList={chatSessionsList}
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
              isLiveChatSessionEnded={isLiveChatSessionEnded}
              activeSessionMessages={activeSessionMessages}
              adminLiveInput={adminLiveInput}
              setAdminLiveInput={setAdminLiveInput}
              handleAdminSendLiveChat={handleAdminSendLiveChat}
              handleAdminEndLiveChat={handleAdminEndLiveChat}
              handleAdminClearLiveChat={handleAdminClearLiveChat}
            />
          )}



          {activeTab === "global_sales" && (
            <GlobalSalesManagement />
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold text-neutral-950">스토어 설정</h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  choicomma 브랜드의 기본 운영 환경을 관리합니다.
                </p>
              </div>

              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-6 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                    스토어명 (Brand Name)
                  </label>
                  <input
                    type="text"
                    defaultValue="choicomma"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                    기본 화폐 단위 (Currency Code)
                  </label>
                  <input
                    type="text"
                    defaultValue="KRW (₩)"
                    disabled
                    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                    대표 관리자 ID
                  </label>
                  <input
                    type="text"
                    defaultValue="admin"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 focus:bg-white"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-200 flex justify-end">
                  <button
                    onClick={() => triggerToast("스토어 설정이 저장되었습니다.")}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md text-sm"
                  >
                    설정 저장하기
                  </button>
                </div>
              </div>
            </div>
          )}



              {/* Image Zoom Lightbox Modal */}
              {zoomedInquiryImage && (
                <div
                  className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                  onClick={() => setZoomedInquiryImage(null)}
                >
                  <div
                    className="relative max-w-4xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 p-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={zoomedInquiryImage} alt="확대 이미지" className="w-full h-full object-contain max-h-[85vh] rounded-2xl" />
                    <button
                      type="button"
                      onClick={() => setZoomedInquiryImage(null)}
                      className="absolute top-4 right-4 bg-black/70 hover:bg-rose-600 text-white rounded-full p-2 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
          </main>
        </div>

      {/* Modal: Add Product Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Single Continuous Form Container */}
          <form onSubmit={handleAddProduct} className="bg-white border border-neutral-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-white sticky top-0 shrink-0 z-10">
              <div className="flex items-center gap-2">
                <span className="bg-neutral-950 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  NEW PRODUCT
                </span>
                <h3 className="text-lg font-bold text-neutral-950">상품 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-950 text-sm p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#FAF9F5]">
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
                      value={newProductNoInput}
                      onChange={(e) => setNewProductNoInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">상품명 *</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 클린 컷 트위드 재킷"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">상품 간단 설명 (상단 제목 밑 노출)</label>
                  <textarea
                    rows={2}
                    placeholder="상품 상단 제목 밑에 표시될 한 줄 간단 설명을 입력하세요."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>제품 상세 사진 (하단 아코디언 '제품 상세 사진' 메뉴 노출)</span>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">하단 드롭다운 연동</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="상세 페이지 하단 '제품 상세 사진' 아코디언 메뉴에 표시될 상세 사진/HTML 코드를 입력하세요."
                    value={newDetailDescription}
                    onChange={(e) => setNewDetailDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (KRW) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={newPrice ? parseInt(String(newPrice).replace(/[^0-9]/g, ""), 10).toLocaleString("ko-KR") : ""}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^0-9]/g, "");
                        setNewPrice(rawDigits);
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      대표 및 상세 이미지 업로드 (최대 10개) *
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {newImages.length} / 10개 등록됨
                    </span>
                  </div>

                  {/* Thumbnail Grid List */}
                  {newImages.length > 0 && (
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-3">
                      {newImages.map((url, idx) => (
                        <div
                          key={`${url.slice(0, 20)}-${idx}`}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-100 group shadow-2xs"
                        >
                          <img src={url} alt={`상품 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                          <span
                            className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              idx === 0
                                ? "bg-amber-500 text-neutral-950 shadow-xs"
                                : "bg-black/60 text-white backdrop-blur-xs"
                            }`}
                          >
                            {idx === 0 ? "대표" : `#${idx + 1}`}
                          </span>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                            <button
                              type="button"
                              onClick={() => setNewImages(newImages.filter((_, i) => i !== idx))}
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
                                    const updated = [...newImages];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx - 1];
                                    updated[idx - 1] = temp;
                                    setNewImages(updated);
                                  }}
                                  className="bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                                >
                                  ←
                                </button>
                              )}
                              {idx < newImages.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newImages];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx + 1];
                                    updated[idx + 1] = temp;
                                    setNewImages(updated);
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
                  {newImages.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[100px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl cursor-pointer transition-all p-3 text-center group mb-2">
                      <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-1 shadow-xs group-hover:scale-110 transition-transform">
                        <Upload className="w-3.5 h-3.5 text-neutral-600" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800">
                        클릭하여 사진 파일 추가 (복수 파일 가능, 최대 10개)
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        PNG, JPG, WEBP 지원 ({10 - newImages.length}개 더 추가 가능)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleMultiImageFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* URL Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUrlInput}
                      onChange={(e) => setNewUrlInput(e.target.value)}
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="/product_1.webp 또는 이미지 URL 직접 입력"
                    />
                    <button
                      type="button"
                      disabled={newImages.length >= 10 || !newUrlInput.trim()}
                      onClick={() => {
                        if (newUrlInput.trim() && newImages.length < 10) {
                          setNewImages([...newImages, newUrlInput.trim()]);
                          setNewUrlInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      + 이미지 추가
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                    <span>카테고리 선택 * (복수 선택 가능)</span>
                    <span className="text-[11px] font-mono text-neutral-500 font-bold">{newCategories.length}개 선택됨</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200/80">
                    {categoriesList.map((c) => {
                      const isChecked = newCategories.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (newCategories.length > 1) {
                                setNewCategories(newCategories.filter((id) => id !== c.id));
                              }
                            } else {
                              setNewCategories([...newCategories, c.id]);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-xs font-black"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              isChecked ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
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
                    onClick={() => setNewIsMainFeatured((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none ${
                      newIsMainFeatured
                        ? "bg-amber-500/15 border-amber-400 text-neutral-950 shadow-2xs font-black"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          newIsMainFeatured
                            ? "bg-neutral-950 border-neutral-950 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {newIsMainFeatured && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="text-left">
                        <span className="block font-black text-xs">🌟 쇼핑몰 메인 화면에 상품 전시</span>
                        <span className="block text-[10px] font-semibold text-neutral-500">체크 시 메인 홈 대표 영역에 노출됩니다.</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      newIsMainFeatured ? "bg-amber-500 text-neutral-950 border-amber-400" : "bg-neutral-200 text-neutral-600 border-neutral-300"
                    }`}>
                      {newIsMainFeatured ? "전시 중" : "미전시"}
                    </span>
                  </button>
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
                      const isSelected = newLabel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNewLabel(opt.value as any)}
                          className={`relative flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                            isSelected
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
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-black text-neutral-950 flex items-center gap-1.5 uppercase tracking-wider">
                      🧵 원단 정보 설정 (Fabric Details)
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">상세페이지 드롭다운 노출</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">소재 구성 (FABRIC)</label>
                    <input
                      type="text"
                      value={newFabricComposition}
                      onChange={(e) => setNewFabricComposition(e.target.value)}
                      placeholder="예: COTTON 100% (프리미엄 콤마 코튼)"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">신축성</label>
                      <select
                        value={newElasticity}
                        onChange={(e) => setNewElasticity(e.target.value)}
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
                        value={newSheerness}
                        onChange={(e) => setNewSheerness(e.target.value)}
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
                        value={newThickness}
                        onChange={(e) => setNewThickness(e.target.value)}
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
                        value={newLining}
                        onChange={(e) => setNewLining(e.target.value)}
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
                    {newFabricImage ? (
                      <div className="relative w-full aspect-[16/9] max-h-[140px] rounded-xl overflow-hidden border-2 border-neutral-300 bg-neutral-100 group shadow-2xs">
                        <img src={newFabricImage} alt="원단 실물 이미지" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <button
                            type="button"
                            onClick={() => setNewFabricImage("")}
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
                                  setNewFabricImage(compressed);
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
                      value={newFabricImage}
                      onChange={(e) => setNewFabricImage(e.target.value)}
                      placeholder="또는 원단 이미지 URL 입력"
                      className="w-full mt-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                {/* 2. COLOR OPTIONS */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-500" />
                      <span>컬러 (Color) 옵션 선택 및 헥사코드 추가</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {newColors.length}개 컬러 등록됨
                    </span>
                  </div>

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="컬러 직접 입력 (예: KHAKI, RED)"
                      value={newCustomColor}
                      onChange={(e) => setNewCustomColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newCustomColor.trim() && !newColors.includes(newCustomColor.trim().toUpperCase())) {
                            setNewColors([...newColors, newCustomColor.trim().toUpperCase()]);
                            setNewCustomColor("");
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCustomColor.trim() && !newColors.includes(newCustomColor.trim().toUpperCase())) {
                          setNewColors([...newColors, newCustomColor.trim().toUpperCase()]);
                          setNewCustomColor("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      + 추가
                    </button>
                  </div>

                  {/* Registered Colors Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {newColors.map((color) => {
                      const hexVal = newColorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
                      return (
                        <div
                          key={color}
                          className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="color"
                              value={hexVal}
                              onChange={(e) => {
                                setNewColorHexMap((prev) => ({
                                  ...prev,
                                  [color]: e.target.value.toUpperCase(),
                                }));
                              }}
                              className="w-5 h-5 rounded-full border-0 p-0 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-neutral-900 truncate">{color}</span>
                              <span className="block text-[9px] font-mono text-neutral-400 uppercase">{hexVal}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewColors(newColors.filter((c) => c !== color))}
                            className="text-neutral-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SIZE OPTIONS */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-blue-500" />
                      <span>사이즈 (Size) 옵션 선택</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {newSizes.length}개 사이즈 선택됨
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "FREE", "S", "M", "L", "XL"].map((sz) => {
                      const isSelected = newSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (newSizes.length > 1) {
                                setNewSizes(newSizes.filter((s) => s !== sz));
                              }
                            } else {
                              setNewSizes([...newSizes, sz]);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            isSelected
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-indigo-500" />
                      <span>사이즈별 실측 치수 가이드 (Size Chart Measurement Table)</span>
                    </label>
                  </div>

                  {/* Add Custom Measurement Option Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="부위명 입력 (예: SHOULDER, CHEST, SLEEVE, LENGTH, 허리, 총장)"
                      value={newNewMeasurementName}
                      onChange={(e) => setNewNewMeasurementName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newNewMeasurementName.trim()) {
                            const nameVal = newNewMeasurementName.trim();
                            if (!newSizeMeasurements.some((m) => m.name === nameVal)) {
                              setNewSizeMeasurements([
                                ...newSizeMeasurements,
                                { name: nameVal, values: {} },
                              ]);
                            }
                            setNewNewMeasurementName("");
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newNewMeasurementName.trim()) {
                          const nameVal = newNewMeasurementName.trim();
                          if (!newSizeMeasurements.some((m) => m.name === nameVal)) {
                            setNewSizeMeasurements([
                              ...newSizeMeasurements,
                              { name: nameVal, values: {} },
                            ]);
                          }
                          setNewNewMeasurementName("");
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
                          {newSizes.map((sz) => (
                            <th key={sz} className="py-2.5 px-3 font-extrabold">{sz}</th>
                          ))}
                          <th className="py-2.5 px-1 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {newSizeMeasurements.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-2 px-3 text-left">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => {
                                  const updated = [...newSizeMeasurements];
                                  updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                                  setNewSizeMeasurements(updated);
                                }}
                                className="w-full min-w-[100px] bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-950"
                                placeholder="부위명"
                              />
                            </td>
                            {newSizes.map((sz) => (
                              <td key={sz} className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.values[sz] || ""}
                                  onChange={(e) => {
                                    const updated = [...newSizeMeasurements];
                                    updated[rIdx] = {
                                      ...updated[rIdx],
                                      values: {
                                        ...updated[rIdx].values,
                                        [sz]: e.target.value,
                                      },
                                    };
                                    setNewSizeMeasurements(updated);
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
                                  setNewSizeMeasurements(newSizeMeasurements.filter((_, idx) => idx !== rIdx));
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
                      총 재고: {calculateTotalStock(newColors, newSizes, newSizeStock)}개
                    </span>
                  </div>

                  {newColors.length === 0 || newSizes.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-2">컬러와 사이즈를 1개 이상 선택해야 옵션별 재고를 설정할 수 있습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {newColors.map((color) => {
                        const hexVal = newColorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
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
                              {newSizes.map((size) => {
                                const comboKey = `${color}-${size}`;
                                const currentQty = newSizeStock[comboKey] !== undefined
                                  ? newSizeStock[comboKey]
                                  : (newSizeStock[size] !== undefined ? newSizeStock[size] : 10);
                                return (
                                  <StockInputItem
                                    key={comboKey}
                                    size={`${color} / ${size}`}
                                    currentStock={currentQty}
                                    onConfirmStock={(sz, val) => {
                                      setNewSizeStock((prev) => ({ ...prev, [comboKey]: val }));
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
                        const total = calculateTotalStock(newColors, newSizes, newSizeStock);
                        const isConfirmed = window.confirm(
                          total > 0
                            ? "전체 컬러/사이즈 재고를 0개(🔴 품절)로 변경하시겠습니까?"
                            : "전체 컬러/사이즈 재고를 각 10개(🟢 판매 중)로 변경하시겠습니까?"
                        );
                        if (!isConfirmed) return;

                        const updated: Record<string, number> = {};
                        const targetQty = total > 0 ? 0 : 10;
                        newColors.forEach((c) => {
                          newSizes.forEach((s) => {
                            updated[`${c}-${s}`] = targetQty;
                          });
                        });
                        setNewSizeStock(updated);
                        triggerToast(total > 0 ? "전체 재고가 🔴 품절(0개)로 변경되었습니다." : "전체 재고가 🟢 판매 중(각 10개)으로 변경되었습니다.");
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer h-10 ${
                        calculateTotalStock(newColors, newSizes, newSizeStock) > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      {calculateTotalStock(newColors, newSizes, newSizeStock) > 0 ? "🟢 전체 판매 중 (In Stock)" : "🔴 전체 품절 (Out of Stock)"}
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
                      onClick={() => setNewIsTimeSale(!newIsTimeSale)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border ${
                        newIsTimeSale
                          ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-xs"
                          : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {newIsTimeSale ? "🔥 타임세일 적용 중" : "일반 상품 (적용 안 함)"}
                    </button>
                  </div>

                  {newIsTimeSale ? (
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
                                value={newTimeSaleDiscountRate}
                                onChange={(e) => setNewTimeSaleDiscountRate(e.target.value)}
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
                                  onClick={() => setNewTimeSaleDiscountRate(String(rate))}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                    newTimeSaleDiscountRate === String(rate)
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
                          const orig = parseFloat(newPrice) || 0;
                          const rate = parseInt(newTimeSaleDiscountRate, 10) || 35;
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
                              value={newTimeSaleStartMonth}
                              onChange={(e) => setNewTimeSaleStartMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleStartDay}
                              onChange={(e) => setNewTimeSaleStartDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleStartAmpm}
                              onChange={(e) => setNewTimeSaleStartAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={newTimeSaleStartHour}
                              onChange={(e) => setNewTimeSaleStartHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleStartMinute}
                              onChange={(e) => setNewTimeSaleStartMinute(e.target.value)}
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
                              value={newTimeSaleEndMonth}
                              onChange={(e) => setNewTimeSaleEndMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleEndDay}
                              onChange={(e) => setNewTimeSaleEndDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleEndAmpm}
                              onChange={(e) => setNewTimeSaleEndAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={newTimeSaleEndHour}
                              onChange={(e) => setNewTimeSaleEndHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={newTimeSaleEndMinute}
                              onChange={(e) => setNewTimeSaleEndMinute(e.target.value)}
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
                          let startH = parseInt(newTimeSaleStartHour, 10) || 9;
                          if (newTimeSaleStartAmpm === "오후" && startH < 12) startH += 12;
                          if (newTimeSaleStartAmpm === "오전" && startH === 12) startH = 0;
                          const startDate = new Date(year, (parseInt(newTimeSaleStartMonth, 10) || 8) - 1, parseInt(newTimeSaleStartDay, 10) || 20, startH, parseInt(newTimeSaleStartMinute, 10) || 0);

                          let endH = parseInt(newTimeSaleEndHour, 10) || 11;
                          if (newTimeSaleEndAmpm === "오후" && endH < 12) endH += 12;
                          if (newTimeSaleEndAmpm === "오전" && endH === 12) endH = 0;
                          const endDate = new Date(year, (parseInt(newTimeSaleEndMonth, 10) || 8) - 1, parseInt(newTimeSaleEndDay, 10) || 27, endH, parseInt(newTimeSaleEndMinute, 10) || 59);

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
                      onClick={() => setNewBulkEnabled(!newBulkEnabled)}
                      className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                        newBulkEnabled
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {newBulkEnabled ? "활성화됨" : "비활성화됨"}
                    </button>
                  </div>

                  {newBulkEnabled ? (
                    <div className="space-y-2 pt-1">
                      {newBulkRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-neutral-200">
                          <span className="text-xs font-bold text-neutral-700">최소</span>
                          <input
                            type="number"
                            value={rule.qty}
                            onChange={(e) => {
                              const updated = [...newBulkRules];
                              updated[idx].qty = parseInt(e.target.value) || 1;
                              setNewBulkRules(updated);
                            }}
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold"
                          />
                          <span className="text-xs font-bold text-neutral-700">개 이상 구매 시</span>
                          <input
                            type="number"
                            value={rule.rate}
                            onChange={(e) => {
                              const updated = [...newBulkRules];
                              updated[idx].rate = parseInt(e.target.value) || 0;
                              setNewBulkRules(updated);
                            }}
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold"
                          />
                          <span className="text-xs font-bold text-neutral-700">% 추가 할인</span>
                          <button
                            type="button"
                            onClick={() => setNewBulkRules(newBulkRules.filter((_, i) => i !== idx))}
                            className="ml-auto text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewBulkRules([...newBulkRules, { qty: 3, rate: 10 }])}
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-neutral-950 hover:bg-black text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  🚀 상품 등록 완료
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Product Form */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-white sticky top-0 shrink-0 z-10">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-neutral-950 text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  EDIT PRODUCT
                </span>
                <h3 className="text-lg font-bold text-neutral-950">
                  상품 수정 — <span className="text-amber-800">{editTitle}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-neutral-400 hover:text-neutral-950 text-sm p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Single Continuous Form Container */}
            <form onSubmit={handleSaveProductEdit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#FAF9F5]">
              {/* SECTION 1: BASIC PRODUCT INFORMATION */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      STEP 1
                    </span>
                    <h4 className="text-sm font-black text-neutral-950">1. 기본 상품 정보 수정</h4>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400">Basic Details & Images</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      상품 번호 / 코드 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="예: 001, CC-001"
                      value={editProductNoInput}
                      onChange={(e) => setEditProductNoInput(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 font-mono"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 mb-1">상품명 *</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">상품 간단 설명 (상단 제목 밑 노출)</label>
                  <textarea
                    rows={2}
                    placeholder="상품 상단 제목 밑에 표시될 한 줄 간단 설명을 입력하세요."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>제품 상세 사진 (하단 아코디언 '제품 상세 사진' 메뉴 노출)</span>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">하단 드롭다운 연동</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="상세 페이지 하단 '제품 상세 사진' 아코디언 메뉴에 표시될 상세 사진/HTML 코드를 입력하세요."
                    value={editDetailDescription}
                    onChange={(e) => setEditDetailDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (KRW) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={editPrice ? parseInt(String(editPrice).replace(/[^0-9]/g, ""), 10).toLocaleString("ko-KR") : ""}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/[^0-9]/g, "");
                        setEditPrice(rawDigits);
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      대표 및 상세 이미지 업로드 (최대 10개) *
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {editImages.length} / 10개 등록됨
                    </span>
                  </div>

                  {/* Thumbnail Grid List */}
                  {editImages.length > 0 && (
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-3">
                      {editImages.map((url, idx) => (
                        <div
                          key={`${url.slice(0, 20)}-${idx}`}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-neutral-200 bg-neutral-100 group shadow-2xs"
                        >
                          <img src={url} alt={`상품 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                          <span
                            className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              idx === 0
                                ? "bg-amber-500 text-neutral-950 shadow-xs"
                                : "bg-black/60 text-white backdrop-blur-xs"
                            }`}
                          >
                            {idx === 0 ? "대표" : `#${idx + 1}`}
                          </span>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                            <button
                              type="button"
                              onClick={() => setEditImages(editImages.filter((_, i) => i !== idx))}
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
                                    const updated = [...editImages];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx - 1];
                                    updated[idx - 1] = temp;
                                    setEditImages(updated);
                                  }}
                                  className="bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                                  title="왼쪽 이동"
                                >
                                  ←
                                </button>
                              )}
                              {idx < editImages.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editImages];
                                    const temp = updated[idx];
                                    updated[idx] = updated[idx + 1];
                                    updated[idx + 1] = temp;
                                    setEditImages(updated);
                                  }}
                                  className="ml-auto bg-white/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                                  title="오른쪽 이동"
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
                  {editImages.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-[16/9] max-h-[100px] w-full border-2 border-dashed border-neutral-300 hover:border-black bg-neutral-50 hover:bg-neutral-100/80 rounded-2xl cursor-pointer transition-all p-3 text-center group mb-2">
                      <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center mb-1 shadow-xs group-hover:scale-110 transition-transform">
                        <Upload className="w-3.5 h-3.5 text-neutral-600" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800">
                        클릭하여 사진 파일 추가 (복수 파일 가능, 최대 10개)
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        PNG, JPG, WEBP 지원 ({10 - editImages.length}개 더 추가 가능)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleMultiImageFileUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* URL Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editUrlInput}
                      onChange={(e) => setEditUrlInput(e.target.value)}
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="/product_1.webp 또는 이미지 URL 직접 입력"
                    />
                    <button
                      type="button"
                      disabled={editImages.length >= 10 || !editUrlInput.trim()}
                      onClick={() => {
                        if (editUrlInput.trim() && editImages.length < 10) {
                          setEditImages([...editImages, editUrlInput.trim()]);
                          setEditUrlInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      + 이미지 추가
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center justify-between">
                    <span>카테고리 선택 * (복수 선택 가능)</span>
                    <span className="text-[11px] font-mono text-neutral-500 font-bold">{editCategories.length}개 선택됨</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200/80">
                    {categoriesList.map((c) => {
                      const isChecked = editCategories.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (editCategories.length > 1) {
                                setEditCategories(editCategories.filter((id) => id !== c.id));
                              }
                            } else {
                              setEditCategories([...editCategories, c.id]);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-amber-500 text-neutral-950 border-amber-500 shadow-xs font-black"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              isChecked ? "bg-neutral-950 border-neutral-950 text-white" : "border-neutral-300 bg-white"
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
                      const isSelected = editLabel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditLabel(opt.value as any)}
                          className={`relative flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                            isSelected
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
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-black text-neutral-950 flex items-center gap-1.5 uppercase tracking-wider">
                      🧵 원단 정보 설정 (Fabric Details)
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">상세페이지 드롭다운 노출</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">소재 구성 (FABRIC)</label>
                    <input
                      type="text"
                      value={editFabricComposition}
                      onChange={(e) => setEditFabricComposition(e.target.value)}
                      placeholder="예: COTTON 100% (프리미엄 콤마 코튼)"
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">신축성</label>
                      <select
                        value={editElasticity}
                        onChange={(e) => setEditElasticity(e.target.value)}
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
                        value={editSheerness}
                        onChange={(e) => setEditSheerness(e.target.value)}
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
                        value={editThickness}
                        onChange={(e) => setEditThickness(e.target.value)}
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
                        value={editLining}
                        onChange={(e) => setEditLining(e.target.value)}
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
                    {editFabricImage ? (
                      <div className="relative w-full aspect-[16/9] max-h-[140px] rounded-xl overflow-hidden border-2 border-neutral-300 bg-neutral-100 group shadow-2xs">
                        <img src={editFabricImage} alt="원단 실물 이미지" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <button
                            type="button"
                            onClick={() => setEditFabricImage("")}
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
                                  setEditFabricImage(compressed);
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
                      value={editFabricImage}
                      onChange={(e) => setEditFabricImage(e.target.value)}
                      placeholder="또는 원단 이미지 URL 입력"
                      className="w-full mt-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-neutral-800 focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                </div>

                {/* 2. COLOR OPTIONS */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-500" />
                      <span>컬러 (Color) 옵션 선택 및 헥사코드 추가</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {editColors.length}개 컬러 등록됨
                    </span>
                  </div>

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="컬러 직접 입력 (예: KHAKI, RED)"
                      value={editCustomColorInput}
                      onChange={(e) => setEditCustomColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (editCustomColorInput.trim() && !editColors.includes(editCustomColorInput.trim().toUpperCase())) {
                            setEditColors([...editColors, editCustomColorInput.trim().toUpperCase()]);
                            setEditCustomColorInput("");
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editCustomColorInput.trim() && !editColors.includes(editCustomColorInput.trim().toUpperCase())) {
                          setEditColors([...editColors, editCustomColorInput.trim().toUpperCase()]);
                          setEditCustomColorInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-black text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      + 추가
                    </button>
                  </div>

                  {/* Registered Colors Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {editColors.map((color) => {
                      const hexVal = editColorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
                      return (
                        <div
                          key={color}
                          className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="color"
                              value={hexVal}
                              onChange={(e) => {
                                setEditColorHexMap((prev) => ({
                                  ...prev,
                                  [color]: e.target.value.toUpperCase(),
                                }));
                              }}
                              className="w-5 h-5 rounded-full border-0 p-0 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-neutral-900 truncate">{color}</span>
                              <span className="block text-[9px] font-mono text-neutral-400 uppercase">{hexVal}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditColors(editColors.filter((c) => c !== color))}
                            className="text-neutral-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. SIZE OPTIONS */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-blue-500" />
                      <span>사이즈 (Size) 옵션 선택</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      {editSizes.length}개 사이즈 선택됨
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["1", "2", "3", "FREE", "S", "M", "L", "XL"].map((sz) => {
                      const isSelected = editSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (editSizes.length > 1) {
                                setEditSizes(editSizes.filter((s) => s !== sz));
                              }
                            } else {
                              setEditSizes([...editSizes, sz]);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            isSelected
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-indigo-500" />
                      <span>사이즈별 실측 치수 가이드 (Size Chart Measurement Table)</span>
                    </label>
                  </div>

                  {/* Add Custom Measurement Option Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="부위명 입력 (예: SHOULDER, CHEST, SLEEVE, LENGTH, 허리, 총장)"
                      value={editNewMeasurementName}
                      onChange={(e) => setEditNewMeasurementName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (editNewMeasurementName.trim()) {
                            const nameVal = editNewMeasurementName.trim();
                            if (!editSizeMeasurements.some((m) => m.name === nameVal)) {
                              setEditSizeMeasurements([
                                ...editSizeMeasurements,
                                { name: nameVal, values: {} },
                              ]);
                            }
                            setEditNewMeasurementName("");
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editNewMeasurementName.trim()) {
                          const nameVal = editNewMeasurementName.trim();
                          if (!editSizeMeasurements.some((m) => m.name === nameVal)) {
                            setEditSizeMeasurements([
                              ...editSizeMeasurements,
                              { name: nameVal, values: {} },
                            ]);
                          }
                          setEditNewMeasurementName("");
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
                          {editSizes.map((sz) => (
                            <th key={sz} className="py-2.5 px-3 font-extrabold">{sz}</th>
                          ))}
                          <th className="py-2.5 px-1 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {editSizeMeasurements.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="py-2 px-3 text-left">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => {
                                  const updated = [...editSizeMeasurements];
                                  updated[rIdx] = { ...updated[rIdx], name: e.target.value };
                                  setEditSizeMeasurements(updated);
                                }}
                                className="w-full min-w-[100px] bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-bold text-neutral-900 text-xs focus:outline-none focus:border-neutral-950"
                                placeholder="부위명"
                              />
                            </td>
                            {editSizes.map((sz) => (
                              <td key={sz} className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.values[sz] || ""}
                                  onChange={(e) => {
                                    const updated = [...editSizeMeasurements];
                                    updated[rIdx] = {
                                      ...updated[rIdx],
                                      values: {
                                        ...updated[rIdx].values,
                                        [sz]: e.target.value,
                                      },
                                    };
                                    setEditSizeMeasurements(updated);
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
                                  setEditSizeMeasurements(editSizeMeasurements.filter((_, idx) => idx !== rIdx));
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
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-emerald-600" />
                      <span>컬러 · 사이즈 조합별 재고 수량 및 판매 상태</span>
                    </label>
                    <span className="text-[11px] font-mono font-extrabold text-neutral-500">
                      총 재고: {calculateTotalStock(editColors, editSizes, editSizeStock)}개
                    </span>
                  </div>

                  {editColors.length === 0 || editSizes.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-2">컬러와 사이즈를 1개 이상 선택해야 옵션별 재고를 설정할 수 있습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {editColors.map((color) => {
                        const hexVal = editColorHexMap[color] || DEFAULT_COLOR_HEX_MAP[color] || "#000000";
                        return (
                          <div key={color} className="bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shadow-2xs inline-block"
                                style={{ backgroundColor: hexVal }}
                              />
                              <span className="text-xs font-extrabold text-neutral-900">{color}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">({hexVal})</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {editSizes.map((size) => {
                                const comboKey = `${color}-${size}`;
                                const currentQty = editSizeStock[comboKey] !== undefined
                                  ? editSizeStock[comboKey]
                                  : (editSizeStock[size] !== undefined ? editSizeStock[size] : 10);
                                return (
                                  <StockInputItem
                                    key={comboKey}
                                    size={`${color} / ${size}`}
                                    currentStock={currentQty}
                                    onConfirmStock={(sz, val) => {
                                      setEditSizeStock((prev) => ({ ...prev, [comboKey]: val }));
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
                        const total = calculateTotalStock(editColors, editSizes, editSizeStock);
                        const isConfirmed = window.confirm(
                          total > 0
                            ? "전체 컬러/사이즈 재고를 0개(🔴 품절)로 변경하시겠습니까?"
                            : "전체 컬러/사이즈 재고를 각 10개(🟢 판매 중)로 변경하시겠습니까?"
                        );
                        if (!isConfirmed) return;

                        const updated: Record<string, number> = {};
                        const targetQty = total > 0 ? 0 : 10;
                        editColors.forEach((c) => {
                          editSizes.forEach((s) => {
                            updated[`${c}-${s}`] = targetQty;
                          });
                        });
                        setEditSizeStock(updated);
                        triggerToast(total > 0 ? "전체 재고가 🔴 품절(0개)로 변경되었습니다." : "전체 재고가 🟢 판매 중(각 10개)으로 변경되었습니다.");
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer h-10 ${
                        calculateTotalStock(editColors, editSizes, editSizeStock) > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      {calculateTotalStock(editColors, editSizes, editSizeStock) > 0 ? "🟢 전체 판매 중 (In Stock)" : "🔴 전체 품절 (Out of Stock)"}
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
                      onClick={() => setEditIsTimeSale(!editIsTimeSale)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border ${
                        editIsTimeSale
                          ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-xs"
                          : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {editIsTimeSale ? "🔥 타임세일 적용 중" : "일반 상품 (적용 안 함)"}
                    </button>
                  </div>

                  {editIsTimeSale ? (
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
                                value={editTimeSaleDiscountRate}
                                onChange={(e) => setEditTimeSaleDiscountRate(e.target.value)}
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
                                  onClick={() => setEditTimeSaleDiscountRate(String(rate))}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                    editTimeSaleDiscountRate === String(rate)
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
                          const orig = parseFloat(editPrice) || 0;
                          const rate = parseInt(editTimeSaleDiscountRate, 10) || 35;
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
                              value={editTimeSaleStartMonth}
                              onChange={(e) => setEditTimeSaleStartMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleStartDay}
                              onChange={(e) => setEditTimeSaleStartDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleStartAmpm}
                              onChange={(e) => setEditTimeSaleStartAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={editTimeSaleStartHour}
                              onChange={(e) => setEditTimeSaleStartHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleStartMinute}
                              onChange={(e) => setEditTimeSaleStartMinute(e.target.value)}
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
                              value={editTimeSaleEndMonth}
                              onChange={(e) => setEditTimeSaleEndMonth(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                                <option key={m} value={m}>{m}월</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleEndDay}
                              onChange={(e) => setEditTimeSaleEndDay(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                                <option key={d} value={d}>{d}일</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleEndAmpm}
                              onChange={(e) => setEditTimeSaleEndAmpm(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              <option value="오전">오전</option>
                              <option value="오후">오후</option>
                            </select>

                            <select
                              value={editTimeSaleEndHour}
                              onChange={(e) => setEditTimeSaleEndHour(e.target.value)}
                              className="h-9 bg-white border border-neutral-200 rounded-xl px-2 text-xs font-bold font-sans text-neutral-950 focus:outline-none focus:border-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((h) => (
                                <option key={h} value={h}>{h}시</option>
                              ))}
                            </select>

                            <select
                              value={editTimeSaleEndMinute}
                              onChange={(e) => setEditTimeSaleEndMinute(e.target.value)}
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
                          let startH = parseInt(editTimeSaleStartHour, 10) || 9;
                          if (editTimeSaleStartAmpm === "오후" && startH < 12) startH += 12;
                          if (editTimeSaleStartAmpm === "오전" && startH === 12) startH = 0;
                          const startDate = new Date(year, (parseInt(editTimeSaleStartMonth, 10) || 8) - 1, parseInt(editTimeSaleStartDay, 10) || 20, startH, parseInt(editTimeSaleStartMinute, 10) || 0);

                          let endH = parseInt(editTimeSaleEndHour, 10) || 11;
                          if (editTimeSaleEndAmpm === "오후" && endH < 12) endH += 12;
                          if (editTimeSaleEndAmpm === "오전" && endH === 12) endH = 0;
                          const endDate = new Date(year, (parseInt(editTimeSaleEndMonth, 10) || 8) - 1, parseInt(editTimeSaleEndDay, 10) || 27, endH, parseInt(editTimeSaleEndMinute, 10) || 59);

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
                      <span>수량 할인 (대량 구매 할인 설정)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditBulkEnabled((v) => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        editBulkEnabled ? "bg-emerald-500" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          editBulkEnabled ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {editBulkEnabled ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        💡 고객이 지정 수량 이상 구매 시 자동으로 할인이 적용됩니다. 여러 단계를 추가할 수 있습니다.
                      </p>
                      {editBulkRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-2.5">
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg shrink-0">{idx + 1}단계</span>
                          <input
                            type="number"
                            min={2}
                            value={rule.qty}
                            onChange={(e) => {
                              const updated = editBulkRules.map((r, i) =>
                                i === idx ? { ...r, qty: parseInt(e.target.value) || 2 } : r
                              );
                              setEditBulkRules(updated);
                            }}
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-emerald-500 text-center"
                          />
                          <span className="text-[11px] text-neutral-500 font-bold shrink-0">개 이상 구매 →</span>
                          <input
                            type="number"
                            min={1}
                            max={80}
                            value={rule.rate}
                            onChange={(e) => {
                              const updated = editBulkRules.map((r, i) =>
                                i === idx ? { ...r, rate: parseInt(e.target.value) || 1 } : r
                              );
                              setEditBulkRules(updated);
                            }}
                            className="w-14 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-700 focus:outline-none focus:border-emerald-500 text-center"
                          />
                          <span className="text-[11px] text-neutral-500 font-bold shrink-0">% 할인</span>
                          {editBulkRules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditBulkRules(editBulkRules.filter((_, i) => i !== idx))}
                              className="ml-auto text-rose-400 hover:text-rose-600 cursor-pointer text-base leading-none"
                            >×</button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditBulkRules([...editBulkRules, { qty: (editBulkRules[editBulkRules.length - 1]?.qty || 2) + 2, rate: 10 }])}
                        className="w-full py-2 rounded-xl border border-dashed border-emerald-400 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        + 할인 단계 추가
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
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-neutral-950 hover:bg-black text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  💾 수정사항 저장 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* SET ITEM CREATION MODAL */}
        {isSetModalOpen && (
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
                  onClick={() => setIsSetModalOpen(false)}
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
                      {categoriesList.map((c) => (
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
                                    {formatPrice(p.priceRange.minVariantPrice.amount)}
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
                              return sum + parseFloat(p?.priceRange.minVariantPrice.amount || "0") * qty;
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
                              return sum + parseFloat(p?.priceRange.minVariantPrice.amount || "0") * qty;
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
                    onClick={() => setIsSetModalOpen(false)}
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
        )}

        {/* MODAL 1: REGISTER / EDIT HERO CUSTOM IMAGE */}
        {isImageUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl border border-amber-400 animate-in zoom-in-95 duration-200 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-neutral-950 text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                      HERO BANNER IMAGE MANAGER
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-950">
                    🖼️ 메인 대표 이미지 등록 / 변경
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                    상단 대형 메인 슬라이더 영역에 노출할 대표 이미지를 선택 및 변경합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageUploadModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveImageUpload} className="space-y-5">
                {/* 1. Target Product Slot Selection */}
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      🎯 이미지 변경 대상 슬롯 / 상품 선택
                    </label>
                    <span className="text-[10px] font-bold text-amber-700">
                      {targetHeroProduct ? `현재 선택: ${targetHeroProduct.title}` : "상품을 선택해 주세요"}
                    </span>
                  </div>
                  <select
                    value={targetHeroProduct?.id || ""}
                    onChange={(e) => {
                      const p = productsList.find((item) => item.id === e.target.value);
                      if (p) {
                        setTargetHeroProduct(p);
                        setCustomHeroImageUrl(p.heroCustomImage || p.featuredImage?.url || "");
                      }
                    }}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                  >
                    {productsList.map((p, idx) => {
                      const isHero = p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured);
                      return (
                        <option key={p.id} value={p.id}>
                          {isHero ? `🌟 [상단 대표 슬롯 #${idx + 1}] ` : `[일반 상품] `}{p.title} ({formatPrice(p.priceRange?.minVariantPrice?.amount)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Image Upload & Preview Container */}
                <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-neutral-950 uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      메인 대표 노출 이미지 (Custom Image)
                    </label>
                    <span className="text-[11px] font-bold text-neutral-500">권장 비율 4:5</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-32 h-40 rounded-xl bg-neutral-100 border-2 border-dashed border-amber-400 overflow-hidden flex flex-col items-center justify-center relative shrink-0 shadow-xs">
                      {customHeroImageUrl ? (
                        <img
                          src={customHeroImageUrl}
                          alt="Custom Hero Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2 text-neutral-400">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] font-bold block">미리보기</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-3.5 w-full">
                      {/* Prominent Enlarged File Upload Button */}
                      <div>
                        <label className="block text-xs font-black text-neutral-900 mb-1.5 flex items-center gap-1">
                          📁 이미지 파일 업로드 (컴퓨터에서 선택)
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-2xl cursor-pointer bg-amber-50/50 hover:bg-amber-100/70 transition-all group shadow-2xs">
                          <div className="flex items-center gap-2 text-amber-950 font-black text-xs md:text-sm">
                            <Upload className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span>내 컴퓨터에서 이미지 파일 선택 / 업로드</span>
                          </div>
                          <span className="text-[11px] text-neutral-500 mt-1 font-semibold">
                            클릭하여 파일(.jpg, .png, .webp) 선택
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHeroImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Image URL Input */}
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          🌐 또는 이미지 웹 URL 직접 입력
                        </label>
                        <input
                          type="text"
                          placeholder="/model_1.jpg 또는 https://..."
                          value={customHeroImageUrl}
                          onChange={(e) => setCustomHeroImageUrl(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-amber-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImageUploadModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    💾 이미지 저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: SELECT & CONFIGURE LINKED PRODUCT */}
        {isProductLinkModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl border border-emerald-500 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-600 text-white text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                      PRODUCT LINK CONFIGURATION
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-950">
                    🔗 상품 연동 설정 및 변경
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                    상단 대표 이미지를 클릭했을 때 이동할 스토어 상품을 선택하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductLinkModalOpen(false)}
                  className="p-2.5 text-neutral-400 hover:text-neutral-950 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter & Search Controls */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="연동할 상품명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neutral-500" />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">전체 카테고리</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product List Selector Table */}
              <div className="flex-1 overflow-y-auto border border-neutral-200/80 rounded-2xl">
                <table className="w-full text-left text-sm text-neutral-700">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-5">상품 이미지</th>
                      <th className="py-3.5 px-5">상품명</th>
                      <th className="py-3.5 px-5">카테고리</th>
                      <th className="py-3.5 px-5">판매가</th>
                      <th className="py-3.5 px-5 text-right">연동 선택</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                          검색 조건에 일치하는 상품이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isCurrentlyLinked = selectedLinkedProductId === p.id;

                        return (
                          <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="w-16 h-20 rounded-xl bg-white overflow-hidden border border-neutral-200 shadow-2xs flex items-center justify-center p-1">
                                <img
                                  src={p.featuredImage?.url || "/product_1.webp"}
                                  alt={p.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <p className="font-black text-base text-neutral-950">{p.title}</p>
                              <p className="text-xs text-neutral-500 truncate max-w-md mt-0.5">{p.description}</p>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-block px-3 py-1 rounded-md text-xs font-extrabold bg-neutral-100 text-neutral-800 uppercase border border-neutral-200">
                                {p.categoryId}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-black text-base text-neutral-950 font-mono">
                              {formatPrice(p.priceRange?.minVariantPrice?.amount)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleSaveProductLink(p.id)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0 ${
                                  isCurrentlyLinked
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20 font-black"
                                    : "bg-neutral-950 hover:bg-neutral-800 text-white border-neutral-950 font-black"
                                }`}
                              >
                                <span>{isCurrentlyLinked ? "✓ 현재 연동됨" : "🔗 이 상품으로 연동"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-500">
                  선택된 연동 상품:{" "}
                  <span className="text-emerald-700 font-black text-base">
                    {productsList.find((p) => p.id === selectedLinkedProductId)?.title || "선택 안됨"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setIsProductLinkModalOpen(false)}
                  className="px-6 py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
                >
                  설정 완료 및 닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: SELECT & REGISTER MAIN DISPLAY PRODUCTS (SEPARATED HERO / BOTTOM) */}
        {isMainSelectModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/65 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl border border-amber-300 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-neutral-950 text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                      {mainSelectMode === "hero" ? "🌟 TOP HERO MAIN PRODUCT SELECTOR" : "🛍️ BOTTOM SUB PRODUCT SELECTOR"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-950">
                    {mainSelectMode === "hero" ? "상단 메인 대표 상품 선택 및 지정" : "하단 상품 선택 및 지정"}
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                    {mainSelectMode === "hero"
                      ? "쇼핑몰 메인 상단 대형 히어로 슬라이더 영역에 대표로 노출할 상품을 선택하세요."
                      : "메인 화면 하단 3열 그리드 영역에 노출할 상품을 선택하세요."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMainSelectModalOpen(false)}
                  className="p-2.5 text-neutral-400 hover:text-neutral-950 rounded-2xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter & Search */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="상품명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-neutral-500" />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">전체 카테고리</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products List Table */}
              <div className="flex-1 overflow-y-auto border border-neutral-200/80 rounded-2xl">
                <table className="w-full text-left text-sm text-neutral-700">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3.5 px-5">상품 이미지</th>
                      <th className="py-3.5 px-5">상품명</th>
                      <th className="py-3.5 px-5">카테고리</th>
                      <th className="py-3.5 px-5">판매가</th>
                      <th className="py-3.5 px-5 text-right">
                        {mainSelectMode === "hero" ? "상단 대표 지정" : "하단 상품 지정"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                          검색 조건에 일치하는 상품이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, index) => {
                        const isSelectedInCurrentMode =
                          mainSelectMode === "hero"
                            ? p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)
                            : p.isBottomFeatured;

                        return (
                          <tr key={`${p.id}-${index}`} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="w-16 h-20 md:w-20 md:h-24 rounded-xl bg-white overflow-hidden border border-neutral-200 shadow-2xs flex items-center justify-center p-1">
                                <img
                                  src={p.featuredImage?.url || "/product_1.webp"}
                                  alt={p.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <p className="font-black text-base text-neutral-950">{p.title}</p>
                              <p className="text-xs md:text-sm text-neutral-500 truncate max-w-sm mt-0.5">{p.description}</p>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-block px-2.5 py-1 rounded-md text-xs font-extrabold bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase">
                                {p.categoryId}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-black text-base text-neutral-950 font-mono">
                              {formatPrice(p.priceRange?.minVariantPrice?.amount)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  mainSelectMode === "hero"
                                    ? handleToggleHeroProduct(p.id)
                                    : handleToggleBottomProduct(p.id)
                                }
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs inline-flex items-center gap-1.5 shrink-0 ${
                                  isSelectedInCurrentMode
                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                    : mainSelectMode === "hero"
                                    ? "bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-600 shadow-amber-500/20 font-black"
                                    : "bg-neutral-950 text-white border-neutral-900 hover:bg-neutral-800 font-black"
                                }`}
                              >
                                <span>{isSelectedInCurrentMode ? "선택 해제" : "선택"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <p className="text-xs md:text-sm font-bold text-neutral-500">
                  {mainSelectMode === "hero" ? (
                    <>
                      상단 대표 메인 상품 수:{" "}
                      <span className="text-amber-600 font-black text-base">
                        {productsList.filter((p) => p.isHeroFeatured || (p.isMainFeatured && !p.isBottomFeatured)).length}개
                      </span>
                    </>
                  ) : (
                    <>
                      하단 상품 수:{" "}
                      <span className="text-neutral-950 font-black text-base">
                        {productsList.filter((p) => p.isBottomFeatured).length}개
                      </span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setIsMainSelectModalOpen(false)}
                  className="px-6 py-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs md:text-sm shadow-md transition-all cursor-pointer"
                >
                  설정 완료 및 닫기
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ADD CUSTOMER MODAL */}
        {isAddCustomerModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">신규 회원 등록</h3>
                    <p className="text-xs text-neutral-500">관리자가 직접 회원 계정을 새로 생성합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">회원 이름 *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">이메일 주소 *</label>
                  <input
                    type="email"
                    required
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="hong@example.com"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">전화번호</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">배송지 주소</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="(우편번호) 주소 상세주소"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">초기 회원 등급</label>
                    <select
                      value={newCustGrade}
                      onChange={(e) => setNewCustGrade(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    >
                      <option value="REGULAR">REGULAR (일반)</option>
                      <option value="SILVER VIP">SILVER VIP</option>
                      <option value="GOLD VIP">GOLD VIP</option>
                      <option value="BLACK VIP">BLACK VIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">초기 적립금 (₩)</label>
                    <input
                      type="number"
                      value={newCustPoints}
                      onChange={(e) => setNewCustPoints(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>회원 등록 완료</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT CUSTOMER MODAL */}
        {editingCustomer && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">회원 정보 / 등급 수정</h3>
                    <p className="text-xs text-neutral-500 font-mono">{editingCustomer.name} ({editingCustomer.email})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">회원 등급 변경</label>
                  <select
                    value={editCustGrade}
                    onChange={(e) => setEditCustGrade(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  >
                    <option value="REGULAR">REGULAR (일반 회원)</option>
                    <option value="SILVER VIP">SILVER VIP</option>
                    <option value="GOLD VIP">GOLD VIP</option>
                    <option value="BLACK VIP">BLACK VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">배송지 주소 수정</label>
                  <input
                    type="text"
                    value={editCustAddress}
                    onChange={(e) => setEditCustAddress(e.target.value)}
                    placeholder="(우편번호) 주소 상세주소"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    적립금 추가 / 차감 (현재: ₩{editingCustomer.points.toLocaleString()})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editCustPointsDelta}
                      onChange={(e) => setEditCustPointsDelta(e.target.value)}
                      placeholder="예: 5000 또는 -2000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                    <span className="text-xs font-bold text-neutral-500 shrink-0">원</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">양수(+) 입력 시 지급, 음수(-) 입력 시 차감됩니다.</p>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    변경사항 저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD SHIPMENT MODAL */}
        {isAddShipmentModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                    <Truck className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">신규 배송건 / 운송장 등록</h3>
                    <p className="text-xs text-neutral-500">배송 정보 및 택배사 운송장 등록</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddShipmentModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddShipmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">수령인 성명 *</label>
                  <input
                    type="text"
                    required
                    value={newShipmentRecipient}
                    onChange={(e) => setNewShipmentRecipient(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">연락처</label>
                  <input
                    type="text"
                    value={newShipmentPhone}
                    onChange={(e) => setNewShipmentPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">배송지 주소</label>
                  <input
                    type="text"
                    value={newShipmentAddress}
                    onChange={(e) => setNewShipmentAddress(e.target.value)}
                    placeholder="(우편번호) 주소 상세주소"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">주문 상품 명칭</label>
                  <input
                    type="text"
                    value={newShipmentItems}
                    onChange={(e) => setNewShipmentItems(e.target.value)}
                    placeholder="예: 클래식 울 재킷 x 1"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">택배사 선택</label>
                    <select
                      value={newShipmentCarrier}
                      onChange={(e) => setNewShipmentCarrier(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    >
                      <option value="CJ대한통운">CJ대한통운</option>
                      <option value="우체국택배">우체국택배</option>
                      <option value="한진택배">한진택배</option>
                      <option value="로젠택배">로젠택배</option>
                      <option value="롯데택배">롯데택배</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">운송장 번호</label>
                    <input
                      type="text"
                      value={newShipmentTracking}
                      onChange={(e) => setNewShipmentTracking(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                      placeholder="숫자 입력 (미입력시 자동생성)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">초기 배송 상태</label>
                  <select
                    value={newShipmentStatus}
                    onChange={(e) => setNewShipmentStatus(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  >
                    <option value="Pending">배송 준비 중</option>
                    <option value="In Transit">배송 중 (In Transit)</option>
                    <option value="Delivered">배송 완료 (Delivered)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddShipmentModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4 text-sky-400" />
                    <span>배송 등록 완료</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT SHIPMENT MODAL */}
        {editingShipment && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">운송장 / 배송 상태 변경</h3>
                    <p className="text-xs text-neutral-500 font-mono">{editingShipment.id} ({editingShipment.recipient}님)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditShipment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">택배사 선택</label>
                  <select
                    value={editShipmentCarrier}
                    onChange={(e) => setEditShipmentCarrier(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  >
                    <option value="CJ대한통운">CJ대한통운</option>
                    <option value="우체국택배">우체국택배</option>
                    <option value="한진택배">한진택배</option>
                    <option value="로젠택배">로젠택배</option>
                    <option value="롯데택배">롯데택배</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">운송장 번호</label>
                  <input
                    type="text"
                    value={editShipmentTracking}
                    onChange={(e) => setEditShipmentTracking(e.target.value)}
                    placeholder="운송장 번호 입력"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">배송 상태 변경</label>
                  <select
                    value={editShipmentStatus}
                    onChange={(e) => setEditShipmentStatus(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  >
                    <option value="Pending">배송 준비 중 (Pending)</option>
                    <option value="In Transit">배송 중 (In Transit)</option>
                    <option value="Delivered">배송 완료 (Delivered)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditingShipment(null)}
                    className="px-5 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                  >
                    변경사항 저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CJ LOGISTICS API CONFIG MODAL */}
        {isCjConfigModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-950 text-white rounded-2xl shadow-sm">
                    <Truck className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">CJ대한통운 API 연동 설정</h3>
                    <p className="text-xs text-neutral-500">CJ대한통운 고객사 코드 및 Open API 키</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCjConfigModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsCjConfigModalOpen(false);
                  triggerToast("CJ대한통운 API 연동 정보가 설정되었습니다.");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">고객사 코드 (Client Code) *</label>
                  <input
                    type="text"
                    required
                    value={cjClientCode}
                    onChange={(e) => setCjClientCode(e.target.value)}
                    placeholder="예: CJ-882910"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">계약 고객 번호 (Contract No) *</label>
                  <input
                    type="text"
                    required
                    value={cjContractNo}
                    onChange={(e) => setCjContractNo(e.target.value)}
                    placeholder="예: 30291049"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Open API Secret Key</label>
                  <input
                    type="password"
                    value={cjApiKey}
                    onChange={(e) => setCjApiKey(e.target.value)}
                    placeholder="cj_live_sk_..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">출고 주소지 (기본 발송지)</label>
                  <input
                    type="text"
                    value={cjSenderAddress}
                    onChange={(e) => setCjSenderAddress(e.target.value)}
                    placeholder="출고 물류센터 주소"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-semibold space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-sky-950">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    CJ대한통운 (LoIS e-Flex / CNPlus) 연동 완료
                  </p>
                  <p className="text-[11px] text-sky-700 font-normal">
                    운송장 자동 채번, 택배 집하 요청 및 실시간 배송 추적 조회가 정상 연동되어 있습니다.
                  </p>
                </div>

                <div className="pt-3 flex justify-between items-center border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={async () => {
                      triggerToast("CJ대한통운 API 통신 상태 점검 중...");
                      const res = await fetch("/api/admin/shipping/cj-logistics", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "test_connection", config: { clientCode: cjClientCode, contractNo: cjContractNo } }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        triggerToast(data.message);
                      } else {
                        triggerToast(data.message || "연동 테스트 실패");
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 font-bold text-xs hover:bg-sky-100 transition-colors cursor-pointer border border-sky-200"
                  >
                    API 연동 테스트
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCjConfigModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-neutral-950 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                    >
                      설정 저장
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD INBOUND SCHEDULE MODAL */}
        {isAddInboundModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-950">신규 입고 일정 등록</h3>
                    <p className="text-xs text-neutral-500">입고 예정 상품과 날짜, 수량 및 공급업체를 등록합니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddInboundModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddInboundSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">입고 예정 일자 *</label>
                  <input
                    type="date"
                    required
                    value={newInboundDate}
                    onChange={(e) => setNewInboundDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">입고 상품명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 클래식 울 블렌드 트위드 재킷"
                    value={newInboundTitle}
                    onChange={(e) => setNewInboundTitle(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">입고 수량 (개) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newInboundQuantity}
                      onChange={(e) => setNewInboundQuantity(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">입고 상태</label>
                    <select
                      value={newInboundStatus}
                      onChange={(e) => setNewInboundStatus(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Scheduled">📦 입고 대기</option>
                      <option value="In Progress">⏳ 검수 진행 중</option>
                      <option value="Completed">🟢 입고 완료</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">공급업체 (발주처)</label>
                    <input
                      type="text"
                      placeholder="예: (주)한진방직 / 성수공장"
                      value={newInboundSupplier}
                      onChange={(e) => setNewInboundSupplier(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">도착 창고 / 구역</label>
                    <select
                      value={newInboundWarehouse}
                      onChange={(e) => setNewInboundWarehouse(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-950 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="제1물류센터 A구역">제1물류센터 A구역</option>
                      <option value="제2물류센터 B구역">제2물류센터 B구역</option>
                      <option value="제1물류센터 C구역">제1물류센터 C구역</option>
                      <option value="제3물류센터 (잡화)">제3물류센터 (잡화)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">특이사항 / 입고 메모</label>
                  <textarea
                    rows={2}
                    placeholder="검수 수량, 패키징 사양, 비고 메모 등"
                    value={newInboundNotes}
                    onChange={(e) => setNewInboundNotes(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-950 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddInboundModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4 text-emerald-200" />
                    <span>입고 일정 등록</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INBOUND ITEM DETAIL & EDIT MODAL */}
        {selectedInboundItem && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-neutral-950">입고 상세 정보</h3>
                    <p className="text-xs text-neutral-500 font-mono">{selectedInboundItem.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInboundItem(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">입고 일자:</span>
                    <span className="font-mono font-extrabold text-neutral-950">{selectedInboundItem.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">입고 상품명:</span>
                    <span className="font-extrabold text-neutral-950">{selectedInboundItem.productTitle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">입고 예정 수량:</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">+{selectedInboundItem.quantity.toLocaleString()} 개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">공급업체 (발주처):</span>
                    <span className="font-bold text-neutral-900">{selectedInboundItem.supplier}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">도착 창고:</span>
                    <span className="font-bold text-neutral-900">{selectedInboundItem.warehouse}</span>
                  </div>
                  {selectedInboundItem.notes && (
                    <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-600">
                      <span className="font-bold text-neutral-500 block mb-0.5">메모 / 특이사항:</span>
                      {selectedInboundItem.notes}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">입고 진행 상태 원클릭 변경</label>
                  <button
                    type="button"
                    onClick={() => handleUpdateInboundStatus(selectedInboundItem.id, selectedInboundItem.status)}
                    className={`w-full py-3 rounded-2xl font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                      selectedInboundItem.status === "Completed"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                        : selectedInboundItem.status === "In Progress"
                        ? "bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100"
                        : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <span>
                      {selectedInboundItem.status === "Completed"
                        ? "🟢 입고 완료 상태 (클릭하여 📦 대기 상태로 변경)"
                        : selectedInboundItem.status === "In Progress"
                        ? "⏳ 검수 진행 중 (클릭하여 🟢 입고 완료로 변경)"
                        : "📦 입고 대기 상태 (클릭하여 ⏳ 검수 진행으로 변경)"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteInboundSchedule(selectedInboundItem.id)}
                  className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer border border-rose-200 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>일정 삭제</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInboundItem(null)}
                  className="px-5 py-2 rounded-xl bg-neutral-950 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TIMESALE DIRECT PRODUCT SELECTION MODAL */}
        {isTimeSaleItemModalOpen && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 rounded-2xl shadow-sm">
                    <Sparkles className="w-5 h-5 text-neutral-950" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-neutral-950">타임세일 적용 상품 직접 지정</h3>
                    <p className="text-xs text-neutral-500">
                      타임세일 특가 이벤트에 포함할 상품을 직접 선택하세요. ({adminTimeSaleProductIds.length}개 선택됨)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimeSaleItemModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-950 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="상품명 또는 상품ID 검색..."
                    value={timeSaleItemSearchQuery}
                    onChange={(e) => setTimeSaleItemSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-950 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <select
                    value={timeSaleItemCategoryFilter}
                    onChange={(e) => setTimeSaleItemCategoryFilter(e.target.value)}
                    className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">전체 카테고리</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const filteredIds = productsList
                        .filter((p) => {
                          const matchesQuery =
                            p.title.toLowerCase().includes(timeSaleItemSearchQuery.toLowerCase()) ||
                            p.id.toLowerCase().includes(timeSaleItemSearchQuery.toLowerCase());
                          const matchesCat =
                            timeSaleItemCategoryFilter === "all" || p.categoryId === timeSaleItemCategoryFilter;
                          return matchesQuery && matchesCat;
                        })
                        .map((p) => p.id);

                      const allSelected = filteredIds.every((id) => adminTimeSaleProductIds.includes(id));
                      if (allSelected) {
                        setAdminTimeSaleProductIds(adminTimeSaleProductIds.filter((id) => !filteredIds.includes(id)));
                      } else {
                        const merged = Array.from(new Set([...adminTimeSaleProductIds, ...filteredIds]));
                        setAdminTimeSaleProductIds(merged);
                      }
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    현재 목록 전체 선택/해제
                  </button>
                </div>
              </div>

              {/* Product Grid List */}
              <div className="overflow-y-auto grow pr-1 space-y-2 max-h-[50vh] scrollbar-thin">
                {productsList
                  .filter((p) => {
                    const matchesQuery =
                      p.title.toLowerCase().includes(timeSaleItemSearchQuery.toLowerCase()) ||
                      p.id.toLowerCase().includes(timeSaleItemSearchQuery.toLowerCase());
                    const matchesCat =
                      timeSaleItemCategoryFilter === "all" || p.categoryId === timeSaleItemCategoryFilter;
                    return matchesQuery && matchesCat;
                  })
                  .map((product) => {
                    const isSelected = adminTimeSaleProductIds.includes(product.id);
                    const originalPriceNum = parseFloat(product.priceRange?.minVariantPrice?.amount || "0");
                    const discountRate = parseInt(adminTimeSaleDiscount) || 35;
                    const discountedPrice = Math.round(originalPriceNum * (1 - discountRate / 100));

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleToggleTimeSaleProduct(product.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-400 shadow-2xs"
                            : "bg-white border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                          />
                          <img
                            src={product.featuredImage?.url || "/product_1.webp"}
                            alt={product.title}
                            className="w-12 h-14 object-cover rounded-xl border border-neutral-200/80 bg-neutral-100"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-neutral-900">{product.title}</h4>
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded-full uppercase">
                                {product.categoryId}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">ID: {product.id}</p>
                          </div>
                        </div>

                        <div className="text-right pl-3">
                          <span className="block text-[11px] text-neutral-400 line-through font-medium">
                            {formatPrice(String(originalPriceNum), "KRW")}
                          </span>
                          <span className="font-black text-xs text-amber-800">
                            {formatPrice(String(discountedPrice), "KRW")}{" "}
                            <span className="text-[10px] text-amber-600 font-bold">({discountRate}% OFF)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-neutral-600">
                  총 <strong className="text-amber-700">{adminTimeSaleProductIds.length}개</strong> 상품 지정됨
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimeSaleItemModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveTimeSaleDetailSettings();
                      setIsTimeSaleItemModalOpen(false);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-black text-xs shadow-md transition-all cursor-pointer border border-amber-400/50"
                  >
                    지정 완료 및 저장 ({adminTimeSaleProductIds.length}개)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
