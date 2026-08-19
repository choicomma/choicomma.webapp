"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { formatPrice } from "@/lib/sfcc/utils";
import { mockProducts } from "@/lib/sfcc/mock/products";
import { LogoSvg } from "@/components/layout/header/logo-svg";
import { getRegisteredSetProducts } from "@/lib/sfcc/set-products-helper";
const initialCustomers: any[] = [];
import importedMonthlyRevenue from "@/lib/sfcc/monthly-revenue-data.json";
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
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "inbound" | "timesale" | "sales" | "revenue" | "main" | "customers" | "inquiries" | "settings">("overview");

  // VIP Customer Inquiry State
  const [inquiriesList, setInquiriesList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_customer_inquiries");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });
  const [zoomedInquiryImage, setZoomedInquiryImage] = useState<string | null>(null);
  const [inquiriesFilter, setInquiriesFilter] = useState<"all" | "pending" | "completed">("all");

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

  React.useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      localStorage.setItem("admin_inbound_schedules", JSON.stringify(inboundSchedulesList));
    }
  }, [inboundSchedulesList, isMounted]);

  const [calendarDate, setCalendarDate] = useState(new Date(2026, 7, 1));
  const [inboundSearchQuery, setInboundSearchQuery] = useState("");
  const [inboundStatusFilter, setInboundStatusFilter] = useState("all");
  const [isAddInboundModalOpen, setIsAddInboundModalOpen] = useState(false);
  const [selectedInboundItem, setSelectedInboundItem] = useState<any | null>(null);

  const [newInboundDate, setNewInboundDate] = useState("2026-08-03");
  const [newInboundTitle, setNewInboundTitle] = useState("");
  const [newInboundQuantity, setNewInboundQuantity] = useState(100);
  const [newInboundSupplier, setNewInboundSupplier] = useState("");
  const [newInboundWarehouse, setNewInboundWarehouse] = useState("제1물류센터 A구역");
  const [newInboundNotes, setNewInboundNotes] = useState("");
  const [newInboundStatus, setNewInboundStatus] = useState("Scheduled");
  
  // State for products, orders, search, notifications
  const [productsList, setProductsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_products");
      if (saved !== null) {
        try {
          const parsed: any[] = JSON.parse(saved);
          return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

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
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("admin_products_updated"));
    } catch (e) {
      console.warn("QuotaExceededError in localStorage, attempting cleanup save...", e);
      try {
        localStorage.removeItem("admin_products");
        localStorage.setItem("admin_products", JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_products_updated"));
      } catch (err) {
        console.error("Failed to write to localStorage after retry", err);
      }
    }
  };

  // Sync productsList with localStorage safely
  React.useEffect(() => {
    saveProductsToStorage(productsList);
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

    setInboundSchedulesList(
      inboundSchedulesList.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      )
    );
    triggerToast(`입고 상태가 [${nextText}] (으)로 변경되었습니다.`);
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
  const [productSortOrder, setProductSortOrder] = useState<"productNoDesc" | "productNoAsc" | "nameAsc" | "priceDesc" | "priceAsc">("productNoDesc");
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

  const getProductNo = React.useCallback((product: any): number => {
    if (product.productNo !== undefined && !isNaN(Number(product.productNo))) {
      return Number(product.productNo);
    }
    const match = String(product.id || "").match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 0;
  }, []);

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

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
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
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const totalStock = calculateTotalStock(editColors, editSizes, editSizeStock);

    const finalImages = editImages.length > 0 ? editImages : ["/product_1.webp"];

    const updatedList = productsList.map((p) => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
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
        };
      }
      return p;
    });

    setProductsList(updatedList);
    saveProductsToStorage(updatedList);
    setEditingProduct(null);

    // Save or remove Time Sale settings for this product
    if (editIsTimeSale) {
      if (!adminTimeSaleProductIds.includes(editingProduct.id)) {
        const updatedIds = [...adminTimeSaleProductIds, editingProduct.id];
        setAdminTimeSaleProductIds(updatedIds);
        if (typeof window !== "undefined") {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
        }
      }
      const h = parseInt(editTimeSaleHours) || 0;
      const m = parseInt(editTimeSaleMinutes) || 0;
      handleUpdateProductTimeSetting(editingProduct.id, h, m);
    } else {
      if (adminTimeSaleProductIds.includes(editingProduct.id)) {
        const updatedIds = adminTimeSaleProductIds.filter((id) => id !== editingProduct.id);
        setAdminTimeSaleProductIds(updatedIds);
        if (typeof window !== "undefined") {
          localStorage.setItem("secret_timesale_product_ids", JSON.stringify(updatedIds));
          window.dispatchEvent(new CustomEvent("storage"));
        }
      }
    }

    triggerToast(`"${editTitle}" 상품 정보(총 재고 ${totalStock}개, 라벨: ${editLabel || "없음"}, 사이즈: ${editSizes.join("/")})가 수정되었습니다!`);
  };

  // Set Item Sale Admin State
  const [setSalesList, setSetSalesList] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_set_sales");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return initialSetSales;
  });

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


  const [adminTimeSaleHours, setAdminTimeSaleHours] = useState("14");
  const [adminTimeSaleMinutes, setAdminTimeSaleMinutes] = useState("55");
  const [adminTimeSaleDiscount, setAdminTimeSaleDiscount] = useState("35");
  const [adminTimeSaleTitle, setAdminTimeSaleTitle] = useState("VIP 회원만을 위해 준비된 파격 할인 한정 단독 시크릿 타임세일");
  const [adminTimeSaleStatus, setAdminTimeSaleStatus] = useState("active");
  const [adminTimeSaleCategory, setAdminTimeSaleCategory] = useState("all");
  const [adminTimeSaleProductIds, setAdminTimeSaleProductIds] = useState<string[]>([]);

  // Live Time Sale Countdown Remaining Ticker State
  const [nowTick, setNowTick] = useState(Date.now());
  const [productTimeSaleSettings, setProductTimeSaleSettings] = useState<Record<string, { hours: number; minutes: number }>>(() => {
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
  const [chatSessionsList, setChatSessionsList] = useState<any[]>([
    {
      id: "vip@choicomma.com",
      name: "최상위 VIP 회원님",
      email: "vip@choicomma.com",
      tier: "VIP",
      badgeColor: "bg-amber-400 text-neutral-950 font-black",
      status: "online",
    },
    {
      id: "minji.kim@gmail.com",
      name: "김민지 회원님",
      email: "minji.kim@gmail.com",
      tier: "GOLD",
      badgeColor: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
      status: "online",
    },
    {
      id: "seojun.park@naver.com",
      name: "박서준 회원님",
      email: "seojun.park@naver.com",
      tier: "SILVER",
      badgeColor: "bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold",
      status: "online",
    },
  ]);

  const [demoSessionMessages, setDemoSessionMessages] = useState<Record<string, any[]>>({
    "minji.kim@gmail.com": [
      {
        id: "msg-m1",
        sender: "user",
        senderName: "김민지 회원님",
        text: "안녕하세요! 지난 주 주문건 배송 시작되었을까요?",
        timestamp: "14:20",
      },
      {
        id: "msg-m2",
        sender: "admin",
        senderName: "choicomma VIP 케어팀",
        text: "안녕하세요 김민지 회원님! CJ대한통운 송장번호 5839201948로 어제 발송되었습니다. 🚚",
        timestamp: "14:22",
      },
    ],
    "seojun.park@naver.com": [
      {
        id: "msg-s1",
        sender: "user",
        senderName: "박서준 회원님",
        text: "코스탈 워시드 트위드 베스트 L사이즈 재입고 문의드립니다.",
        timestamp: "15:05",
      },
    ],
  });
  const activeSessionMessages = activeSessionId === "vip@choicomma.com"
    ? adminLiveChatMessages
    : (demoSessionMessages[activeSessionId] || []);

  const syncAdminLiveChat = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("site_live_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdminLiveChatMessages(parsed);
          return;
        }
      } catch (e) {}
    }
    const defaultMsgs = [
      {
        id: "welcome-1",
        sender: "admin",
        senderName: "choicomma VIP 케어팀",
        text: "안녕하세요! 초이콤마 오리지널 1:1 라이브 전담 케어 팀입니다. 💫\n상품 문의, 주문/배송, 커스텀 사이즈 등 어떤 내용이든 편하게 말씀해 주세요.",
        timestamp: "방금 전",
      },
    ];
    setAdminLiveChatMessages(defaultMsgs);
  };

  useEffect(() => {
    syncAdminLiveChat();
    window.addEventListener("storage", syncAdminLiveChat);
    window.addEventListener("live_chat_updated", syncAdminLiveChat);
    return () => {
      window.removeEventListener("storage", syncAdminLiveChat);
      window.removeEventListener("live_chat_updated", syncAdminLiveChat);
    };
  }, []);

  const handleAdminSendLiveChat = (presetText?: string) => {
    const textToSend = presetText || adminLiveInput;
    if (!textToSend.trim()) return;

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

    if (activeSessionId === "vip@choicomma.com") {
      const updated = [...adminLiveChatMessages, newReply];
      setAdminLiveChatMessages(updated);
      localStorage.setItem("site_live_chat_messages", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    } else {
      setDemoSessionMessages((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), newReply],
      }));
    }
    setAdminLiveInput("");
    triggerToast("💬 고객 라이브 채팅방으로 답변이 성공적으로 전송되었습니다!");
  };

  const handleAdminEndLiveChat = (sessionIdTarget?: string) => {
    const targetId = sessionIdTarget || activeSessionId;
    const targetSession = chatSessionsList.find((s) => s.id === targetId);
    const sessionName = targetSession?.name || "고객";

    const isConfirmed = window.confirm(
      `정말로 '${sessionName}'님과의 1:1 라이브 상담을 종료하시겠습니까?\n해당 고객의 채팅창으로 상담 종료 안내가 전달됩니다.`
    );
    if (!isConfirmed) return;

    const dateNow = new Date();
    const hours = String(dateNow.getHours()).padStart(2, "0");
    const mins = String(dateNow.getMinutes()).padStart(2, "0");

    const closingMsg = {
      id: `admin-close-${Date.now()}`,
      sender: "admin",
      senderName: "choicomma VIP 케어팀",
      text: `🔒 [안내] ${sessionName}님과의 1:1 상담이 종료되었습니다. 추가 문의 사항이 있으시면 언제든지 편하게 새 메시지를 남겨주세요. 이용해 주셔서 감사합니다! 💫`,
      timestamp: `${hours}:${mins}`,
    };

    if (targetId === "vip@choicomma.com") {
      const updated = [...adminLiveChatMessages, closingMsg];
      setAdminLiveChatMessages(updated);
      localStorage.setItem("site_live_chat_messages", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("live_chat_updated"));
    } else {
      setDemoSessionMessages((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), closingMsg],
      }));
    }

    setChatSessionsList((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, status: "ended" } : s))
    );
    triggerToast(`🔒 '${sessionName}'님과의 1:1 라이브 상담이 성공적으로 종료되었습니다.`);
  };

  const handleAdminClearLiveChat = () => {
    const isConfirmed = window.confirm(
      "정말로 라이브 채팅 대화 기록을 전체 초기화하시겠습니까?\n이 작업은 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    localStorage.removeItem("site_live_chat_messages");
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

  const handleUpdateProductTimeSetting = (productId: string, hours: number, minutes: number) => {
    const updatedSettings = {
      ...productTimeSaleSettings,
      [productId]: { hours, minutes },
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
  const [customersList, setCustomersList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const isCleared = localStorage.getItem("admin_customers_cleared_v2");
      if (!isCleared) {
        localStorage.setItem("admin_customers", JSON.stringify([]));
        localStorage.setItem("admin_customers_cleared_v2", "true");
        return [];
      }
      const saved = localStorage.getItem("admin_customers");
      if (saved) {
        try {
          const parsed: any[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return [];
  });



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
      const pNoStr = String(getProductNo(p));
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        pNoStr.includes(searchQuery.replace("#", ""));
      const matchesCategory =
        selectedCategoryFilter === "all" ||
        p.categoryId === selectedCategoryFilter ||
        (Array.isArray(p.categoryIds) && p.categoryIds.includes(selectedCategoryFilter));
      return matchesSearch && matchesCategory;
    });

    list.sort((a, b) => {
      const pNoA = getProductNo(a);
      const pNoB = getProductNo(b);

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
      // Default: productNoDesc (상품번호 내림차순 / 높은순 - 최신순)
      return pNoB - pNoA;
    });

    return list;
  }, [productsList, searchQuery, selectedCategoryFilter, productSortOrder, getProductNo]);

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
  const [shipmentsList, setShipmentsList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_shipments");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return initialShipments;
  });

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

    const newProd = {
      id: `custom-prod-${Date.now()}`,
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
      
      const updatedSettings = {
        ...productTimeSaleSettings,
        [newProd.id]: { hours: h, minutes: m },
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
        window.dispatchEvent(new CustomEvent("storage"));
      }
    }

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

  const handleClearAllProducts = () => {
    const isConfirmed = window.confirm(
      "정말로 상품관리에 있는 전체 상품을 일괄 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    setProductsList([]);
    saveProductsToStorage([]);
    triggerToast("상품관리에 등록된 전체 상품이 모두 삭제되었습니다.");
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
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex flex-col font-sans">
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
            className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-200"
          >
            <ArrowLeft className="w-4 h-4" />
            스토어 바로가기
          </Link>
          <div className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center gap-3">
            <Link href="/">
              <LogoSvg className="h-5 w-auto text-neutral-950" />
            </Link>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded-full">
              ADMIN v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
          {/* Dashboard Overview */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "overview"
                ? "bg-neutral-950 text-white font-bold shadow-md"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            대시보드 개요
          </button>

          {/* 1. 회원관리 */}
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

          {/* 2. 주문 및 배송 관리 */}
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

          {/* 9. 1:1 라이브 채팅 콘솔 */}
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
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "overview" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              대시보드
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
              onClick={() => setActiveTab("orders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                activeTab === "orders" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              주문
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
                          const stockCount = getProductStock(p);
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
                                {formatPrice(p.priceRange.minVariantPrice.amount)}
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
          )}



          {/* TAB: SALES MANAGEMENT */}
          {activeTab === "sales" && (
            <div className="space-y-8 animate-in fade-in duration-300">
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

                            {/* Products preview with generous padding */}
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

                          {/* Pricing & Actions */}
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
          )}

          {/* TAB: OVERVIEW / DASHBOARD REVAMPED */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Top Header & Store Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-neutral-950 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                      CHOICOMMA STORE CONTROL CENTER
                    </span>
                    <h1 className="text-2xl font-black text-neutral-950">대시보드 개요</h1>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 font-medium">
                    실시간 스토어 운영 지표, 주문/배송 현황, 1:1 라이브 채팅 문의, 매출 통계를 종합 관리합니다.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    스토어 상태: 100% 정상 가동 중
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-neutral-950 hover:bg-black text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    신규 상품 등록
                  </button>
                </div>
              </div>

              {/* 4 Stat KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* KPI 1: August Revenue */}
                <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 text-white border border-neutral-800 rounded-3xl p-6 shadow-md space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">
                      8월 매출
                    </span>
                    <div className="p-2.5 rounded-2xl bg-white/10 text-amber-400 backdrop-blur-md">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white font-mono tracking-tight">
                      0 KRW
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-extrabold mt-1 flex items-center gap-1">
                      현재 신규 판매 내역 없음
                    </p>
                  </div>
                </div>

                {/* KPI 2: Live Orders */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                      통합 주문 내역
                    </span>
                    <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-950 font-mono tracking-tight" suppressHydrationWarning>
                      {ordersList.length} 건
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-bold mt-1" suppressHydrationWarning>
                      신규 주문 {ordersList.filter((o: any) => o.status === "결제 완료" || o.status === "배송 준비 중").length}건 대기 중
                    </p>
                  </div>
                </div>

                {/* KPI 3: Total Products & Timesale */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                      등록 상품 / TIMESALE
                    </span>
                    <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-950 font-mono tracking-tight" suppressHydrationWarning>
                      {productsList.length} 개
                    </h3>
                    <p className="text-[11px] text-amber-800 font-bold mt-1" suppressHydrationWarning>
                      타임세일 {adminTimeSaleProductIds.length}개 적용 중
                    </p>
                  </div>
                </div>

                {/* KPI 4: 1:1 Live Chat Status */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider">
                      1:1 라이브 채팅
                    </span>
                    <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-neutral-950 font-mono tracking-tight" suppressHydrationWarning>
                      {chatSessionsList.filter((s) => s.status !== "ended").length} 개 활성 세션
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 실시간 멀티 상담 가동 중
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Action Control Hub */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <h3 className="text-sm font-black text-neutral-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    주요 기능 빠른 바로가기 (Quick Hub)
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-medium">관리자 전용 단축 메뉴</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-950 hover:text-white transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-5 h-5 text-neutral-800 group-hover:text-white" />
                    <p className="text-xs font-extrabold">상품 등록</p>
                    <p className="text-[10px] text-neutral-500 group-hover:text-neutral-300 font-medium">새 상품 추가</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("sales")}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-amber-500 hover:text-neutral-950 transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <Percent className="w-5 h-5 text-amber-600 group-hover:text-neutral-950" />
                    <p className="text-xs font-extrabold">세트 할인 설정</p>
                    <p className="text-[10px] text-neutral-500 group-hover:text-neutral-900 font-medium">TIMESALE 패키지</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("inquiries")}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-emerald-600 hover:text-white transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:text-white" />
                    <p className="text-xs font-extrabold">1:1 라이브 채팅</p>
                    <p className="text-[10px] text-neutral-500 group-hover:text-emerald-100 font-medium">고객 답변 관리</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("inbound")}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-sky-600 hover:text-white transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <Calendar className="w-5 h-5 text-sky-600 group-hover:text-white" />
                    <p className="text-xs font-extrabold">입고 일정 관리</p>
                    <p className="text-[10px] text-neutral-500 group-hover:text-sky-100 font-medium">캘린더 관리</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("revenue")}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-purple-600 hover:text-white transition-all text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <TrendingUp className="w-5 h-5 text-purple-600 group-hover:text-white" />
                    <p className="text-xs font-extrabold">매출 상세 분석</p>
                    <p className="text-[10px] text-neutral-500 group-hover:text-purple-100 font-medium">월별 리포트</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REVENUE MANAGEMENT */}
          {activeTab === "revenue" && (() => {
            let revList = importedMonthlyRevenue;

            if (revenueSelectedMonth !== "all") {
              revList = revList.filter((item: any) => item.일자 === revenueSelectedMonth);
            } else if (revenueSelectedYear !== "all") {
              revList = revList.filter((item: any) => item.일자.startsWith(revenueSelectedYear));
            }

            if (revenueSearchQuery.trim()) {
              const q = revenueSearchQuery.trim().toLowerCase();
              revList = revList.filter((item: any) => item.일자.toLowerCase().includes(q));
            }

            // Monthly Calculations
            const totalNetRevenue = revList.reduce((sum: number, r: any) => sum + (Number(r["매출"]) || 0), 0);
            const totalOrders = revList.reduce((sum: number, r: any) => sum + (Number(r["주문건수"]) || 0), 0);
            const totalItems = revList.reduce((sum: number, r: any) => sum + (Number(r["품목건수"]) || 0), 0);
            const totalProductSales = revList.reduce((sum: number, r: any) => sum + (Number(r["상품금액"]) || 0), 0);
            const totalRefunds = revList.reduce((sum: number, r: any) => sum + (Number(r["환불금액"]) || 0), 0);
            const totalDiscounts = revList.reduce((sum: number, r: any) => sum + (Number(r["할인금액"]) || 0), 0);
            const averageOrderValue = Math.round(totalNetRevenue / (totalOrders || 1));
            const refundRate = ((totalRefunds / (totalProductSales || 1)) * 100).toFixed(1);

            const monthlyAvgRevenue = Math.round(totalNetRevenue / (revList.length || 1));
            const monthlyAvgOrders = Math.round(totalOrders / (revList.length || 1));

            // Peak Month
            const sortedByNet = [...revList].sort((a: any, b: any) => (Number(b["매출"]) || 0) - (Number(a["매출"]) || 0));
            const peakMonthItem = sortedByNet[0];

            const allAvailableMonths = Array.from(new Set(importedMonthlyRevenue.map((r: any) => r.일자)));

            const handleExportRevenueCSV = () => {
              const headers = ["정산월", "주문건수", "품목건수", "상품금액(원)", "배송비(원)", "할인금액(원)", "결제금액(원)", "환불금액(원)", "최종순매출(원)"];
              const rows = revList.map((r: any) => [
                r["일자"],
                r["주문건수"],
                r["품목건수"],
                r["상품금액"],
                r["배송비"],
                r["할인금액"],
                r["결제금액"],
                r["환불금액"],
                r["매출"],
              ]);

              const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              const suffix = revenueSelectedMonth !== "all" ? revenueSelectedMonth : (revenueSelectedYear !== "all" ? `${revenueSelectedYear}년` : "전체월");
              link.setAttribute("download", `초이콤마_월별_매출_정산_리포트_${suffix}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              triggerToast("월별 매출 정산 리포트(CSV) 다운로드가 완료되었습니다.");
            };

            return (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Header & Export Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        📊 REAL MONTHLY REVENUE DATA INTEGRATED
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-neutral-950">
                      월별 매출 관리 & 정산 분석
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
                      <strong>월별 실시간 매출 실적 엑셀 데이터</strong> 기반의 월별 정산 내역입니다. 월별 매출액, 주문건수, 평균 객단가(AOV) 및 환불율을 월 단위로 상세 정산·분석합니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportRevenueCSV}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer shrink-0 border border-emerald-500 self-start sm:self-auto hover:scale-[1.02] active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    월별 매출 정산 리포트 (CSV) 다운로드
                  </button>
                </div>

                {/* Filter & Month Selector Control Bar */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Quick Month / Year Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500 px-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> 월별 범위 필터:
                      </span>
                      {[
                        { key: "all", monthKey: "all", label: "전체 월별 데이터" },
                        { key: "2026", monthKey: "all", label: "2026년 월별 (1~7월)" },
                        { key: "2025", monthKey: "all", label: "2025년 월별 (12개월)" },
                        { key: "2024", monthKey: "all", label: "2024년 월별 (12개월)" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setRevenueSelectedYear(item.key);
                            setRevenueSelectedMonth("all");
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            revenueSelectedYear === item.key && revenueSelectedMonth === "all"
                              ? "bg-neutral-950 text-white shadow-xs"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Specific Month Dropdown Select */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-neutral-600 shrink-0">특정 월 선택:</span>
                      <select
                        value={revenueSelectedMonth}
                        onChange={(e) => {
                          setRevenueSelectedMonth(e.target.value);
                          if (e.target.value !== "all") {
                            setRevenueSelectedYear("all");
                          }
                        }}
                        className="bg-neutral-50 border border-neutral-300 text-neutral-950 text-xs font-black px-3.5 py-2 rounded-xl focus:outline-none focus:border-neutral-950 shadow-2xs"
                      >
                        <option value="all">전체 월 (전체 목록)</option>
                        {allAvailableMonths.map((m: string) => (
                          <option key={m} value={m}>
                            {m} ({m.replace("-", "년 ")}월)
                          </option>
                        ))}
                      </select>

                      {/* Search input */}
                      <div className="relative w-44 sm:w-52">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="월 검색 (예: 2026-05)..."
                          value={revenueSearchQuery}
                          onChange={(e) => setRevenueSearchQuery(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Financial KPI Cards (Monthly Focused) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* KPI 1: Net Revenue */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                        {revenueSelectedMonth !== "all"
                          ? `${revenueSelectedMonth}월 순매출액`
                          : revenueSelectedYear !== "all"
                          ? `${revenueSelectedYear}년 월별 총 순매출`
                          : "선택 기간 총 순매출액"}
                      </span>
                      <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
                        {formatPrice(totalNetRevenue.toString())}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-extrabold text-emerald-700">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>월별 정산 {revList.length}개 월 집계됨</span>
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Total Orders */}
                  <div className="bg-gradient-to-br from-sky-50 to-sky-100/40 border border-sky-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-sky-900 uppercase tracking-wide">
                        월별 결제 주문 건수
                      </span>
                      <div className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-xs">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-sky-950 font-mono tracking-tight">
                        {totalOrders.toLocaleString()} <span className="text-base font-bold text-sky-800">건</span>
                      </div>
                      <div className="text-[11px] font-bold text-sky-700 mt-1">
                        월별 총 판매 품목 수: <strong className="font-black text-sky-950">{totalItems.toLocaleString()}개</strong>
                      </div>
                    </div>
                  </div>

                  {/* KPI 3: AOV */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                        월별 평균 객단가 (AOV)
                      </span>
                      <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-amber-950 font-mono tracking-tight">
                        {formatPrice(averageOrderValue.toString())}
                      </div>
                      <div className="text-[11px] font-bold text-amber-800 mt-1">
                        주문 1건당 평균 순 결제금액
                      </div>
                    </div>
                  </div>

                  {/* KPI 4: Refund Amount */}
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100/40 border border-rose-300/80 rounded-3xl p-5 shadow-2xs space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wide">
                        월별 환불 & 취소액
                      </span>
                      <div className="p-2.5 bg-rose-500 text-white rounded-2xl shadow-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-rose-950 font-mono tracking-tight">
                        {formatPrice(totalRefunds.toString())}
                      </div>
                      <div className="text-[11px] font-bold text-rose-700 mt-1">
                        전체 상품금액 대비 환불율 <strong className="font-black">{refundRate}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Performance Highlights Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-2 border-emerald-400/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full uppercase">
                        월 평균 순매출액
                      </span>
                      <p className="text-xl font-black text-neutral-950 font-mono mt-1.5">
                        {formatPrice(monthlyAvgRevenue.toString())}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      월 단위 평균
                    </span>
                  </div>

                  <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded-full uppercase">
                        최고 매출 달성 월 (PEAK MONTH)
                      </span>
                      <p className="text-xl font-black text-neutral-950 font-mono mt-1.5 flex items-center gap-2">
                        <span>{peakMonthItem?.일자 || "-"}</span>
                        <span className="text-xs text-amber-700 font-extrabold">({formatPrice((peakMonthItem?.매출 || 0).toString())})</span>
                      </p>
                    </div>
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
                      최고 실적 🔥
                    </span>
                  </div>

                  <div className="bg-white border-2 border-sky-400/80 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black bg-sky-600 text-white px-2.5 py-0.5 rounded-full uppercase">
                        월 평균 주문건수
                      </span>
                      <p className="text-xl font-black text-neutral-950 font-mono mt-1.5">
                        {monthlyAvgOrders.toLocaleString()} 건 / 월
                      </p>
                    </div>
                    <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg">
                      월평균 주문량
                    </span>
                  </div>
                </div>

                {/* Complete Monthly Settlement Ledger Table */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                    <div>
                      <span className="bg-amber-500/10 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        MONTHLY FINANCIAL LEDGER
                      </span>
                      <h3 className="text-xl font-extrabold text-neutral-950 mt-1 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        월별 정산 상세 내역표 ({revList.length}개 월)
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        24년, 25년, 26년 월별 실적 데이터 원본을 월별로 정산하여 표로 제공합니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500">
                        총 항목: <strong className="text-neutral-950 font-black">{revList.length}건</strong>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
                    <table className="w-full text-left text-xs text-neutral-800">
                      <thead className="bg-neutral-50 text-neutral-600 uppercase text-[11px] font-extrabold border-b border-neutral-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-3.5 px-4">정산월 (일자)</th>
                          <th className="py-3.5 px-4 text-right">주문건수</th>
                          <th className="py-3.5 px-4 text-right">품목건수</th>
                          <th className="py-3.5 px-4 text-right">총 상품금액</th>
                          <th className="py-3.5 px-4 text-right">배송비</th>
                          <th className="py-3.5 px-4 text-right">할인금액</th>
                          <th className="py-3.5 px-4 text-right">결제금액</th>
                          <th className="py-3.5 px-4 text-right text-rose-600">환불금액</th>
                          <th className="py-3.5 px-4 text-right text-emerald-700 font-black">최종 순매출액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60 font-medium">
                        {revList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-neutral-500 text-sm">
                              검색 조건과 일치하는 월별 매출 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          revList.map((row: any, idx: number) => {
                            const netRev = Number(row["매출"]) || 0;
                            const isPeak = netRev >= 150000000;

                            return (
                              <tr
                                key={`${row["일자"]}-${idx}`}
                                className={`hover:bg-amber-50/50 transition-colors ${
                                  isPeak ? "bg-amber-50/30" : ""
                                }`}
                              >
                                <td className="py-3.5 px-4 font-mono font-black text-neutral-950 flex items-center gap-2">
                                  <span>{row["일자"]}</span>
                                  {isPeak && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 shadow-2xs">
                                      PEAK 🔥
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold">
                                  {Number(row["주문건수"]).toLocaleString()}건
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-neutral-600">
                                  {Number(row["품목건수"]).toLocaleString()}개
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">
                                  {formatPrice(row["상품금액"])}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-neutral-500">
                                  {Number(row["배송비"]) > 0 ? formatPrice(row["배송비"]) : "0"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-amber-800">
                                  {Number(row["할인금액"]) > 0 ? `-${formatPrice(row["할인금액"])}` : "0"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold">
                                  {formatPrice(row["결제금액"])}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-bold">
                                  {Number(row["환불금액"]) > 0 ? `-${formatPrice(row["환불금액"])}` : "0"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                                  {formatPrice(row["매출"])}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {/* Table Footer Summary Row */}
                      <tfoot className="bg-neutral-950 text-white font-extrabold text-xs">
                        <tr>
                          <td className="py-4 px-4 uppercase tracking-wider">
                            선택 구간 총계 ({revList.length}개 월)
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-amber-400">
                            {totalOrders.toLocaleString()}건
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-neutral-300">
                            {totalItems.toLocaleString()}개
                          </td>
                          <td className="py-4 px-4 text-right font-mono">
                            {formatPrice(totalProductSales.toString())}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-neutral-400">
                            -
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-amber-300">
                            -{formatPrice(totalDiscounts.toString())}
                          </td>
                          <td className="py-4 px-4 text-right font-mono">
                            -
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-rose-300">
                            -{formatPrice(totalRefunds.toString())}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-emerald-400 text-base font-black">
                            {formatPrice(totalNetRevenue.toString())}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

            {/* TAB: HERO SLIDER MANAGEMENT */}
            {activeTab === "main" && (
              <div className="space-y-8 animate-in fade-in duration-300">
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
                {(() => {
                  const heroProducts = productsList.filter(
                    (p) => p.isHeroFeatured === true
                  );

                  return (
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
                  );
                })()}
                </div>
              </div>
            )}

          {/* TAB: CUSTOMER MANAGEMENT */}
          {activeTab === "customers" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    스토어 회원 관리
                  </h1>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    회원 목록 조회, 신규 회원 등록, 회원 등급 및 적립금(포인트) 통합 관리
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllCustomers}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>전체 회원 삭제</span>
                  </button>
                  <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>엑셀 파일 업로드 (.xls / .xlsx)</span>
                    <input
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={handleExcelFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ 신규 회원 직접 등록</span>
                  </button>
                </div>
              </div>

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>전체 회원</span>
                    <Users className="w-4 h-4 text-neutral-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-neutral-950 mt-2">{customersList.length.toLocaleString()} 명</p>
                  <p className="text-xs text-neutral-500 mt-1">스토어 회원 데이터 관리 중</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>VIP 회원 수</span>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-neutral-950 mt-2">
                    {customersList.filter(c => c.grade.includes("VIP")).length.toLocaleString()} 명
                  </p>
                  <p className="text-xs text-amber-600 font-bold mt-1">BLACK / GOLD / SILVER VIP</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>총 보관 적립금</span>
                    <Gift className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-neutral-950 mt-2">
                    ₩ {customersList.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">평균 보유 포인트: ₩ {Math.round(customersList.reduce((sum, c) => sum + (c.points || 0), 0) / (customersList.length || 1)).toLocaleString()}</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>이달의 신규 가입</span>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-neutral-950 mt-2">
                    {newCustomersThisMonth > 0 ? `+ ${newCustomersThisMonth.toLocaleString()} 명` : "0 명"}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${newCustomersThisMonth > 0 ? "text-emerald-600" : "text-neutral-400"}`}>
                    {newCustomersThisMonth > 0 ? `이번 달(${new Date().getMonth() + 1}월) 신규 회원` : "이번 달 신규 가입자 없음"}
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="회원 이름, 이메일, 전화번호, 주소 검색..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                  </div>

                  {/* Clear Filter */}
                  {(customerSearchQuery || customerGradeFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery("");
                        setCustomerGradeFilter("all");
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>

                {/* Grade Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                  <span className="text-xs font-bold text-neutral-500 mr-1">회원 등급:</span>
                  {[
                    { id: "all", label: "전체 등급" },
                    { id: "BLACK VIP", label: "BLACK VIP" },
                    { id: "GOLD VIP", label: "GOLD VIP" },
                    { id: "SILVER VIP", label: "SILVER VIP" },
                    { id: "REGULAR", label: "일반 회원" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCustomerGradeFilter(g.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        customerGradeFilter === g.id
                          ? "bg-neutral-950 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Table */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-700">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-3.5 px-5">회원 정보</th>
                        <th className="py-3.5 px-5">연락처 / 배송지 주소</th>
                        <th className="py-3.5 px-5">회원 등급</th>
                        <th className="py-3.5 px-5">누적 구매금액</th>
                        <th className="py-3.5 px-5">보유 적립금</th>
                        <th className="py-3.5 px-5">가입일</th>
                        <th className="py-3.5 px-5 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-neutral-500">
                            검색 조건에 해당되는 회원 정보가 존재하지 않습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomers.map((cust) => (
                          <tr key={cust.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-4 px-5">
                              <div>
                                <p className="font-extrabold text-neutral-950 text-sm flex items-center gap-1.5">
                                  {cust.name}
                                  <span className="text-[10px] font-mono text-neutral-400 font-normal truncate max-w-[120px]">({cust.id})</span>
                                </p>
                                <p className="text-xs text-neutral-500">{cust.email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <p className="font-mono text-xs text-neutral-900 font-bold">{cust.phone}</p>
                              {cust.address && cust.address !== "-" ? (
                                <p className="text-[11px] text-neutral-500 font-sans mt-0.5 truncate max-w-[240px]" title={cust.address}>
                                  {cust.address}
                                </p>
                              ) : (
                                <p className="text-[11px] text-neutral-400 italic mt-0.5">주소 미등록</p>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                                  cust.grade.includes("BLACK")
                                    ? "bg-neutral-950 text-amber-300 border border-neutral-800"
                                    : cust.grade.includes("GOLD")
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : cust.grade.includes("SILVER")
                                    ? "bg-slate-100 text-slate-800 border border-slate-300"
                                    : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                }`}
                              >
                                {cust.grade.includes("VIP") && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                {cust.grade}
                              </span>
                            </td>
                            <td className="py-4 px-5 font-bold font-mono text-neutral-950">
                              ₩ {cust.totalSpent.toLocaleString()}
                            </td>
                            <td className="py-4 px-5 font-bold font-mono text-emerald-700">
                              ₩ {cust.points.toLocaleString()}
                            </td>
                            <td className="py-4 px-5 text-xs text-neutral-500 font-mono">
                              {cust.joinedDate}
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCustomer(cust)}
                                  className="p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                                  title="회원 정보/등급/포인트 수정"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                  title="회원 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer & Pagination */}
                <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span>
                    총 {filteredCustomers.length.toLocaleString()}명 중 {filteredCustomers.length > 0 ? ((customerPage - 1) * CUSTOMERS_PER_PAGE + 1).toLocaleString() : 0} - {Math.min(customerPage * CUSTOMERS_PER_PAGE, filteredCustomers.length).toLocaleString()}명 표시 중
                  </span>
                  {totalCustomerPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={customerPage === 1}
                        onClick={() => setCustomerPage((prev) => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        이전
                      </button>
                      <span className="font-extrabold text-neutral-950 px-2 font-mono">
                        {customerPage} / {totalCustomerPages} 페이지
                      </span>
                      <button
                        type="button"
                        disabled={customerPage >= totalCustomerPages}
                        onClick={() => setCustomerPage((prev) => Math.min(totalCustomerPages, prev + 1))}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS & SHIPMENTS INTEGRATED MANAGEMENT */}
          {activeTab === "orders" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-sky-600" />
                    주문 및 배송 통합 관리
                  </h1>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    고객 주문 내역, CJ대한통운 API 연동, 운송장 발급 및 배송 상태(발송준비/배송중/배송완료) 통합 관리
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddShipmentModalOpen(true)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-sky-400" />
                  <span>+ 신규 주문/배송건 등록</span>
                </button>
              </div>

              {/* CJ Logistics Integration Banner */}
              <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-sky-950 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-sky-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-white">CJ대한통운 (CJ Logistics) API 실시간 연동 시스템</h2>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ● API 연동 정상 (Active)
                      </span>
                    </div>
                    <p className="text-xs text-sky-200/80 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                      <span>고객사코드: <strong className="text-white">{cjClientCode}</strong></span>
                      <span>계약고객번호: <strong className="text-white">{cjContractNo}</strong></span>
                      <span>출고물류센터: <strong className="text-white">choicomma 남대문센터</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleIssueCjLogisticsTracking}
                    className="bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <span>🚀 CJ대한통운 운송장 일괄 자동 발급</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCjExcel}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
                  >
                    <span>📥 e-Flex 엑셀 다운로드</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCjConfigModalOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold p-2 rounded-xl text-xs border border-white/20 transition-all cursor-pointer"
                    title="CJ대한통운 API 설정"
                  >
                    <Settings className="w-4 h-4 text-sky-200" />
                  </button>
                </div>
              </div>

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>전체 주문/배송 건수</span>
                    <ShoppingBag className="w-4 h-4 text-neutral-400" />
                  </div>
                  <p className="text-2xl font-extrabold text-neutral-950 mt-2">{shipmentsList.length.toLocaleString()} 건</p>
                  <p className="text-xs text-neutral-500 mt-1">스토어 전체 주문 통합 관리</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>배송 대기 / 발송 준비</span>
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-amber-600 mt-2">
                    {shipmentsList.filter(s => s.status === "Pending").length.toLocaleString()} 건
                  </p>
                  <p className="text-xs text-amber-700 font-bold mt-1">운송장 등록 대기 목록</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>배송 중 (In Transit)</span>
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-sky-600 mt-2">
                    {shipmentsList.filter(s => s.status === "In Transit").length.toLocaleString()} 건
                  </p>
                  <p className="text-xs text-sky-700 font-bold mt-1">실시간 배송 진행 중</p>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <span>배송 완료 (Delivered)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-2">
                    {shipmentsList.filter(s => s.status === "Delivered").length.toLocaleString()} 건
                  </p>
                  <p className="text-xs text-emerald-700 font-bold mt-1">고객 인수 완료</p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="수령인, 주문번호, 운송장번호, 배송지 주소 검색..."
                      value={shipmentSearchQuery}
                      onChange={(e) => setShipmentSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                  </div>

                  {/* Clear Filter */}
                  {(shipmentSearchQuery || shipmentStatusFilter !== "all" || shipmentCarrierFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setShipmentSearchQuery("");
                        setShipmentStatusFilter("all");
                        setShipmentCarrierFilter("all");
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                  <span className="text-xs font-bold text-neutral-500 mr-1">진행 상태:</span>
                  {[
                    { id: "all", label: "전체 상태" },
                    { id: "Pending", label: "배송 준비 중" },
                    { id: "In Transit", label: "배송 중" },
                    { id: "Delivered", label: "배송 완료" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setShipmentStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        shipmentStatusFilter === st.id
                          ? "bg-neutral-950 text-white shadow-xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Integrated Orders & Shipments Table */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-700">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-3.5 px-5">주문/배송번호</th>
                        <th className="py-3.5 px-5">수령인 / 배송지 주소</th>
                        <th className="py-3.5 px-5">주문 상품</th>
                        <th className="py-3.5 px-5">택배사 / 운송장 번호</th>
                        <th className="py-3.5 px-5">발송일 / 배송예정일</th>
                        <th className="py-3.5 px-5">진행 상태</th>
                        <th className="py-3.5 px-5 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {filteredShipments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-neutral-500">
                            검색 조건에 해당되는 주문/배송 정보가 존재하지 않습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedShipments.map((ship) => (
                          <tr key={ship.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-4 px-5">
                              <div>
                                <p className="font-extrabold text-neutral-950 text-xs font-mono">
                                  {ship.orderId}
                                </p>
                                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{ship.id}</p>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div>
                                <p className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                                  {ship.recipient}
                                  <span className="text-xs text-neutral-500 font-normal font-mono">({ship.phone})</span>
                                </p>
                                <p className="text-[11px] text-neutral-500 font-sans mt-0.5 truncate max-w-[240px]" title={ship.address}>
                                  {ship.address}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-xs text-neutral-800 font-medium max-w-[200px] truncate" title={ship.items}>
                              {ship.items}
                            </td>
                            <td className="py-4 px-5">
                              <div>
                                <span className="text-xs font-bold text-neutral-900 block">{ship.carrier}</span>
                                {ship.carrier === "CJ대한통운" || ship.trackingNumber.startsWith("68") ? (
                                  <a
                                    href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${ship.trackingNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-mono text-sky-600 hover:underline font-bold inline-flex items-center gap-1 mt-0.5"
                                    title="CJ대한통운 공식 실시간 배송추적 열기"
                                  >
                                    {ship.trackingNumber}
                                    <ExternalLink className="w-3 h-3 text-sky-500" />
                                  </a>
                                ) : (
                                  <span className="text-xs font-mono text-neutral-600 font-semibold">{ship.trackingNumber}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-xs text-neutral-500 font-mono">
                              <p>발송: {ship.shippedDate}</p>
                              <p className="text-[11px] text-neutral-400">예정: {ship.estimatedDelivery}</p>
                            </td>
                            <td className="py-4 px-5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  ship.status === "Delivered"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : ship.status === "In Transit"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    ship.status === "Delivered"
                                      ? "bg-emerald-500"
                                      : ship.status === "In Transit"
                                      ? "bg-sky-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                                {ship.status === "Delivered"
                                  ? "배송 완료"
                                  : ship.status === "In Transit"
                                  ? "배송 중"
                                  : "배송 준비 중"}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditShipment(ship)}
                                  className="p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                                  title="운송장 번호 / 택배사 / 배송 상태 변경"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteShipment(ship.id)}
                                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                  title="배송/주문 건 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer & Pagination */}
                <div className="p-4 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span>
                    총 {filteredShipments.length.toLocaleString()}건 중 {filteredShipments.length > 0 ? ((shipmentPage - 1) * SHIPMENTS_PER_PAGE + 1).toLocaleString() : 0} - {Math.min(shipmentPage * SHIPMENTS_PER_PAGE, filteredShipments.length).toLocaleString()}건 표시 중
                  </span>
                  {totalShipmentPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={shipmentPage === 1}
                        onClick={() => setShipmentPage((prev) => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        이전
                      </button>
                      <span className="font-extrabold text-neutral-950 px-2 font-mono">
                        {shipmentPage} / {totalShipmentPages} 페이지
                      </span>
                      <button
                        type="button"
                        disabled={shipmentPage >= totalShipmentPages}
                        onClick={() => setShipmentPage((prev) => Math.min(totalShipmentPages, prev + 1))}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: INBOUND STOCK MANAGEMENT (CALENDAR) */}
          {activeTab === "inbound" && (() => {
            const currentYear = calendarDate.getFullYear();
            const currentMonth = calendarDate.getMonth();
            const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
            const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

            const calendarCells = [];
            for (let i = 0; i < firstDayOfWeek; i++) {
              calendarCells.push(null);
            }
            for (let d = 1; d <= totalDaysInMonth; d++) {
              const monthStr = String(currentMonth + 1).padStart(2, "0");
              const dayStr = String(d).padStart(2, "0");
              calendarCells.push({
                day: d,
                dateStr: `${currentYear}-${monthStr}-${dayStr}`,
              });
            }

            const monthTotalQty = inboundSchedulesList.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
            const todayCount = inboundSchedulesList.filter(s => s.date === "2026-08-03").length;
            const inProgressCount = inboundSchedulesList.filter(s => s.status === "In Progress").length;
            const completedCount = inboundSchedulesList.filter(s => s.status === "Completed").length;

            const filteredInboundList = inboundSchedulesList.filter((item) => {
              const matchesSearch =
                item.productTitle.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
                item.supplier.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
                item.warehouse.toLowerCase().includes(inboundSearchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(inboundSearchQuery.toLowerCase());
              const matchesStatus =
                inboundStatusFilter === "all" || item.status === inboundStatusFilter;
              return matchesSearch && matchesStatus;
            });

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-emerald-600" />
                      재고 관리 & 입고 캘린더 (Stock Management Calendar)
                    </h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      공급업체 발주 상품의 월별/일별 입고 일정 시각화, 물류 입고 검수 진행 현황 및 재고 수량 동기화
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewInboundDate("2026-08-03");
                      setIsAddInboundModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-200" />
                    <span>+ 신규 입고 일정 등록</span>
                  </button>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <span>이번 달 총 입고 수량</span>
                      <Box className="w-4 h-4 text-neutral-400" />
                    </div>
                    <p className="text-2xl font-extrabold text-neutral-950 mt-2">{monthTotalQty.toLocaleString()} 개</p>
                    <p className="text-xs text-neutral-500 mt-1">입고 예정 및 완료 총합계</p>
                  </div>

                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <span>오늘 입고 예정 (8/3)</span>
                      <Clock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">{todayCount} 건</p>
                    <p className="text-xs text-emerald-700 font-bold mt-1">금일 물류 창고 도착 예정</p>
                  </div>

                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <span>입고 검수 진행 중</span>
                      <Archive className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-sky-600 mt-2">{inProgressCount} 건</p>
                    <p className="text-xs text-sky-700 font-bold mt-1">창고 하차 및 검수 작업 중</p>
                  </div>

                  <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <span>입고 완료 (이번달)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">{completedCount} 건</p>
                    <p className="text-xs text-emerald-700 font-bold mt-1">재고 수량 등록 완료</p>
                  </div>
                </div>

                {/* Calendar View Card */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                  {/* Calendar Header Navigation */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/80">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-extrabold text-neutral-950 font-mono">
                        {currentYear}년 {currentMonth + 1}월 입고 일정 캘린더
                      </h2>
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        LIVE CALENDAR
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                        <button
                          type="button"
                          onClick={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                          className="p-1.5 hover:bg-white rounded-lg text-neutral-700 transition-colors cursor-pointer"
                          title="이전 달"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarDate(new Date(2026, 7, 1))}
                          className="px-3 py-1 text-xs font-bold text-neutral-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          오늘 (2026.08)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                          className="p-1.5 hover:bg-white rounded-lg text-neutral-700 transition-colors cursor-pointer"
                          title="다음 달"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Legend */}
                      <div className="hidden lg:flex items-center gap-3 text-xs font-bold ml-4 pl-4 border-l border-neutral-200">
                        <span className="flex items-center gap-1.5 text-amber-800">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> 입고 대기
                        </span>
                        <span className="flex items-center gap-1.5 text-sky-800">
                          <span className="w-2 h-2 rounded-full bg-sky-500" /> 검수 진행 중
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> 입고 완료
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-neutral-600 pb-2">
                    <div className="text-rose-600">일 (Sun)</div>
                    <div>월 (Mon)</div>
                    <div>화 (Tue)</div>
                    <div>수 (Wed)</div>
                    <div>목 (Thu)</div>
                    <div>금 (Fri)</div>
                    <div className="text-sky-600">토 (Sat)</div>
                  </div>

                  {/* Calendar Grid Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarCells.map((cell, idx) => {
                      if (!cell) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="min-h-[110px] bg-neutral-50/50 border border-neutral-100 rounded-2xl p-2"
                          />
                        );
                      }

                      const itemsOnDay = inboundSchedulesList.filter((s) => s.date === cell.dateStr);
                      const isToday = cell.dateStr === "2026-08-03";

                      return (
                        <div
                          key={cell.dateStr}
                          className={`min-h-[110px] p-2 rounded-2xl border transition-all flex flex-col justify-between group ${
                            isToday
                              ? "bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/30"
                              : "bg-white border-neutral-200/80 hover:border-neutral-400 hover:shadow-xs"
                          }`}
                        >
                          <div>
                            {/* Day Number Header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`text-xs font-mono font-black w-6 h-6 rounded-full flex items-center justify-center ${
                                  isToday
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-neutral-800"
                                }`}
                              >
                                {cell.day}
                              </span>
                              {isToday && (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                                  TODAY
                                </span>
                              )}
                            </div>

                            {/* Inbound Schedule Badges inside Cell */}
                            <div className="space-y-1">
                              {itemsOnDay.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedInboundItem(item)}
                                  className={`p-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-2xs border ${
                                    item.status === "Completed"
                                      ? "bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100"
                                      : item.status === "In Progress"
                                      ? "bg-sky-50 text-sky-950 border-sky-300 hover:bg-sky-100"
                                      : "bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100"
                                  }`}
                                  title={`[${item.id}] ${item.productTitle} (${item.quantity}개) - ${item.supplier}`}
                                >
                                  <div className="flex items-center justify-between gap-1 leading-tight">
                                    <span className="truncate font-extrabold">{item.productTitle}</span>
                                    <span className="font-mono text-[10px] shrink-0 bg-white/80 px-1 rounded font-black">
                                      +{item.quantity}개
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] mt-1 opacity-90 font-mono">
                                    <span>
                                      {item.status === "Completed"
                                        ? "● 완료"
                                        : item.status === "In Progress"
                                        ? "⏳ 검수중"
                                        : "📦 대기"}
                                    </span>
                                    <span className="truncate max-w-[65px]">{item.warehouse.split(" ")[0]}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Add Button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNewInboundDate(cell.dateStr);
                                setIsAddInboundModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-neutral-400 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-emerald-50 rounded-md cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              입고추가
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inbound Schedule Table Section */}
                <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm space-y-4 p-5">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div>
                      <span>입고 예정 & 완료 상세 목록</span>
                      <p className="text-xs text-neutral-500">입고 일자별 수량, 공급업체 정보 및 입고 상태를 한눈에 관리합니다.</p>
                    </div>

                    {/* Search & Status Filter */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="상품명, 공급업체, 창고 검색..."
                          value={inboundSearchQuery}
                          onChange={(e) => setInboundSearchQuery(e.target.value)}
                          className="bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-950 w-52 md:w-64"
                        />
                      </div>

                      <select
                        value={inboundStatusFilter}
                        onChange={(e) => setInboundStatusFilter(e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none"
                      >
                        <option value="all">전체 상태</option>
                        <option value="Scheduled">📦 입고 대기</option>
                        <option value="In Progress">⏳ 검수 진행 중</option>
                        <option value="Completed">🟢 입고 완료</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-neutral-200/70">
                    <table className="w-full text-left text-sm text-neutral-700">
                      <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-3.5 px-4">입고 일자</th>
                          <th className="py-3.5 px-4">입고 번호</th>
                          <th className="py-3.5 px-4">상품명 / 메모</th>
                          <th className="py-3.5 px-4">입고 예정 수량</th>
                          <th className="py-3.5 px-4">공급업체 / 물류 창고</th>
                          <th className="py-3.5 px-4">진행 상태 (클릭시 전환)</th>
                          <th className="py-3.5 px-4 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60">
                        {filteredInboundList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-neutral-500 text-xs">
                              검색 조건에 일치하는 입고 일정이 존재하지 않습니다.
                            </td>
                          </tr>
                        ) : (
                          filteredInboundList.map((item) => (
                            <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-neutral-950 text-xs">
                                {item.date}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-neutral-500">
                                {item.id}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-neutral-900 text-sm">{item.productTitle}</p>
                                <p className="text-[11px] text-neutral-500 truncate max-w-xs">{item.notes}</p>
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-emerald-700 font-mono">
                                +{item.quantity.toLocaleString()} 개
                              </td>
                              <td className="py-3.5 px-4 text-xs">
                                <p className="font-bold text-neutral-900">{item.supplier}</p>
                                <p className="text-[11px] text-neutral-500">{item.warehouse}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInboundStatus(item.id, item.status)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105 ${
                                    item.status === "Completed"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : item.status === "In Progress"
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {item.status === "Completed"
                                    ? "🟢 입고 완료 ↺"
                                    : item.status === "In Progress"
                                    ? "⏳ 검수 진행 중 ↺"
                                    : "📦 입고 대기 ↺"}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInboundItem(item)}
                                    className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                    title="상세 정보 및 수정"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInboundSchedule(item.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
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

          {/* TAB: 1:1 SITE LIVE CHAT CONSOLE MANAGEMENT */}
          {activeTab === "inquiries" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-neutral-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-neutral-950 fill-neutral-950" />
                      REALTIME IN-SITE LIVE CHAT CONSOLE
                    </span>
                    <h2 className="text-xl font-black text-neutral-950">사이트 내 1:1 라이브 채팅 관리</h2>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 font-medium">
                    쇼핑몰 우측 하단 둥근 라이브 채팅 팝업으로 고객이 전송한 메시지를 실시간 확인하고 관리자 전담 답변을 즉시 전송합니다.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-900">실시간 연동 중 ({adminLiveChatMessages.length}개 메시지 수신됨)</span>
                  </div>
                </div>
              </div>

              {/* Main 2-Column Console Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Session Card List */}
                <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                    <span className="text-xs font-black text-neutral-950 uppercase tracking-wider">
                      라이브 대화 세션 목록 ({chatSessionsList.filter(s => s.status !== "ended").length}개 온라인)
                    </span>
                    <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
                      실시간 분리 세션
                    </span>
                  </div>

                  {/* Customer Sessions Stack */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {chatSessionsList.map((session) => {
                      const isSelected = activeSessionId === session.id;
                      const isEnded = session.status === "ended" || (session.id === "vip@choicomma.com" && isLiveChatSessionEnded);
                      return (
                        <div
                          key={session.id}
                          onClick={() => setActiveSessionId(session.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? "bg-neutral-950 text-white border-neutral-900 shadow-md"
                              : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border-neutral-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Crown className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400 fill-amber-400" : "text-amber-600"}`} />
                              <span className="text-xs font-black">{session.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${session.badgeColor}`}>
                                {session.tier}
                              </span>
                            </div>
                            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                              isEnded
                                ? "bg-neutral-200 text-neutral-600"
                                : "bg-emerald-500 text-neutral-950"
                            }`}>
                              {isEnded ? "종료됨" : "ONLINE"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className={isSelected ? "text-neutral-400 font-mono" : "text-neutral-500 font-mono"}>
                              {session.email}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminEndLiveChat(session.id);
                              }}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              🔒 상담 종료
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Preset Reply Quick Chips */}
                  <div className="space-y-2 pt-2 border-t border-neutral-200">
                    <label className="text-[11px] font-black text-neutral-700 block">
                      ⚡ 원클릭 간편 빠른 답장 템플릿
                    </label>
                    <div className="space-y-1.5">
                      {[
                        "안녕하세요! 초이콤마 VIP 전담 케어팀입니다. 무엇을 도와드릴까요? 💫",
                        "주문하신 상품 및 배송 정보를 확인 중입니다. 잠시만 기다려 주세요!",
                        "요청하신 커스텀 사이즈/옵션 지정이 반영 완료되었습니다. 🛍️",
                        "추가로 도움이 필요하신 사항이 있으시면 언제든 편하게 말씀해 주세요!",
                      ].map((tmpl, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => handleAdminSendLiveChat(tmpl)}
                          className="w-full text-left bg-neutral-50 hover:bg-amber-50 hover:border-amber-300 border border-neutral-200 p-2.5 rounded-xl text-[11px] font-bold text-neutral-800 transition-all cursor-pointer leading-snug"
                        >
                          {tmpl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Chat History & Input Area */}
                <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col h-[580px]">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200 shrink-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-black text-neutral-950">
                        실시간 대화 내역 ({chatSessionsList.find(s => s.id === activeSessionId)?.name || "선택된 고객"})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdminEndLiveChat(activeSessionId)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="선택한 고객과의 1:1 라이브 상담을 종료합니다"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        상담 종료
                      </button>
                      <button
                        type="button"
                        onClick={handleAdminClearLiveChat}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 font-bold px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="라이브 채팅 대화 기록을 전체 초기화합니다"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        대화 내역 초기화
                      </button>
                    </div>
                  </div>

                  {/* Conversation Bubbles Container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F5]/70 rounded-2xl border border-neutral-200/60">
                    {activeSessionMessages.map((msg: any) => {
                      const isAdmin = msg.sender === "admin";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} space-y-1`}
                        >
                          <span className="text-[10px] font-extrabold text-neutral-400 px-1">
                            {msg.senderName} • {msg.timestamp}
                          </span>
                          <div
                            className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                              isAdmin
                                ? "bg-amber-500 text-neutral-950 font-black rounded-tr-xs"
                                : "bg-white text-neutral-900 border border-neutral-200 font-bold rounded-tl-xs"
                            }`}
                          >
                            {msg.text}

                            {Array.isArray(msg.images) && msg.images.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 border-t border-neutral-200/40">
                                {msg.images.map((img: string, i: number) => (
                                  <img key={i} src={img} alt="첨부 이미지" className="w-full aspect-square object-cover rounded-xl border border-neutral-300 bg-neutral-100" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Reply Input Bar */}
                  <div className="pt-2 shrink-0 flex gap-2">
                    <input
                      type="text"
                      value={adminLiveInput}
                      onChange={(e) => setAdminLiveInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAdminSendLiveChat();
                        }
                      }}
                      placeholder="고객에게 전달할 답변 메세지를 입력하세요..."
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-extrabold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdminSendLiveChat()}
                      disabled={!adminLiveInput.trim()}
                      className="bg-neutral-950 hover:bg-black text-white px-5 py-3 rounded-xl font-black text-xs transition-all cursor-pointer disabled:opacity-40 shrink-0 shadow-md flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      답변 전송
                    </button>
                  </div>
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

                <div>
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
                    <span>디자이너 설명 (하단 아코디언 '디자이너 설명' 메뉴 노출)</span>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">하단 드롭다운 연동</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="상세 페이지 하단 '디자이너 설명' 아코디언 메뉴에 표시될 상세 설명 및 노트를 입력하세요."
                    value={newDetailDescription}
                    onChange={(e) => setNewDetailDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (KRW) *</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                    placeholder="예: 499000"
                  />
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

                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-neutral-800">타임세일 진행 시간 설정</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="720"
                              value={newTimeSaleHours}
                              onChange={(e) => setNewTimeSaleHours(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-8 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="24"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">시간</span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={newTimeSaleMinutes}
                              onChange={(e) => setNewTimeSaleMinutes(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-7 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">분</span>
                          </div>
                        </div>

                        {/* Preset quick buttons */}
                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                          {[
                            { label: "12시간", h: "12", m: "0" },
                            { label: "24시간", h: "24", m: "0" },
                            { label: "48시간", h: "48", m: "0" },
                            { label: "72시간", h: "72", m: "0" },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setNewTimeSaleHours(preset.h);
                                setNewTimeSaleMinutes(preset.m);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all shrink-0 ${
                                newTimeSaleHours === preset.h && newTimeSaleMinutes === preset.m
                                  ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Real-time Ticking Remaining Time Display Box */}
                        {(() => {
                          const h = parseInt(newTimeSaleHours) || 0;
                          const m = parseInt(newTimeSaleMinutes) || 0;
                          const totalSec = h * 3600 + m * 60;
                          
                          const hours = Math.floor(totalSec / 3600);
                          const mins = Math.floor((totalSec % 3600) / 60);
                          const secs = totalSec % 60;

                          const formattedHH = String(hours).padStart(2, "0");
                          const formattedMM = String(mins).padStart(2, "0");
                          const formattedSS = String(secs).padStart(2, "0");

                          const expiryDate = new Date(nowTick + totalSec * 1000);
                          const year = expiryDate.getFullYear();
                          const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
                          const day = String(expiryDate.getDate()).padStart(2, "0");
                          const hoursStr = String(expiryDate.getHours()).padStart(2, "0");
                          const minsStr = String(expiryDate.getMinutes()).padStart(2, "0");
                          const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
                          const dayOfWeek = weekDays[expiryDate.getDay()];
                          const expiryFormatted = `${year}-${month}-${day} ${hoursStr}:${minsStr} (${dayOfWeek}요일)`;

                          return (
                            <div className="bg-neutral-950 text-white p-3.5 rounded-2xl border border-neutral-800 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-xs font-black text-white">
                                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                  <Clock className="w-4 h-4 text-amber-400" /> 실시간 잔여 남은 시간:
                                </span>
                                <div className="flex items-center gap-1 font-mono">
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedHH}시간
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
                              <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between font-mono pt-1.5 border-t border-neutral-800">
                                <span>타임세일 종료 예정 시각:</span>
                                <span className="text-amber-300 font-black bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">{expiryFormatted}</span>
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

                {/* 2. BULK DISCOUNT RULES */}
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

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">상품명 *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-950 font-bold focus:outline-none focus:border-neutral-950"
                  />
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
                    <span>디자이너 설명 (하단 아코디언 '디자이너 설명' 메뉴 노출)</span>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">하단 드롭다운 연동</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="상세 페이지 하단 '디자이너 설명' 아코디언 메뉴에 표시될 상세 설명 및 노트를 입력하세요."
                    value={editDetailDescription}
                    onChange={(e) => setEditDetailDescription(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-950 focus:outline-none focus:border-neutral-950 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">판매가 (KRW) *</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-neutral-950 focus:outline-none focus:border-neutral-950"
                  />
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

                {/* 1.5. TIME SALE CONFIGURATION */}
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

                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-neutral-800">타임세일 진행 시간 설정</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="720"
                              value={editTimeSaleHours}
                              onChange={(e) => setEditTimeSaleHours(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-8 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="24"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">시간</span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editTimeSaleMinutes}
                              onChange={(e) => setEditTimeSaleMinutes(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-7 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">분</span>
                          </div>
                        </div>

                        {/* Preset quick buttons */}
                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                          {[
                            { label: "12시간", h: "12", m: "0" },
                            { label: "24시간", h: "24", m: "0" },
                            { label: "48시간", h: "48", m: "0" },
                            { label: "72시간", h: "72", m: "0" },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setEditTimeSaleHours(preset.h);
                                setEditTimeSaleMinutes(preset.m);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all shrink-0 ${
                                editTimeSaleHours === preset.h && editTimeSaleMinutes === preset.m
                                  ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Real-time Ticking Remaining Time Display Box */}
                        {(() => {
                          let totalSec = (parseInt(editTimeSaleHours) || 0) * 3600 + (parseInt(editTimeSaleMinutes) || 0) * 60;
                          if (editingProduct && productTimeSaleExpiries[editingProduct.id]) {
                            const exp = productTimeSaleExpiries[editingProduct.id];
                            if (exp > nowTick) {
                              totalSec = Math.max(0, Math.floor((exp - nowTick) / 1000));
                            }
                          }

                          const hours = Math.floor(totalSec / 3600);
                          const mins = Math.floor((totalSec % 3600) / 60);
                          const secs = totalSec % 60;

                          const formattedHH = String(hours).padStart(2, "0");
                          const formattedMM = String(mins).padStart(2, "0");
                          const formattedSS = String(secs).padStart(2, "0");

                          const expiryDate = new Date(nowTick + totalSec * 1000);
                          const year = expiryDate.getFullYear();
                          const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
                          const day = String(expiryDate.getDate()).padStart(2, "0");
                          const hoursStr = String(expiryDate.getHours()).padStart(2, "0");
                          const minsStr = String(expiryDate.getMinutes()).padStart(2, "0");
                          const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
                          const dayOfWeek = weekDays[expiryDate.getDay()];
                          const expiryFormatted = `${year}-${month}-${day} ${hoursStr}:${minsStr} (${dayOfWeek}요일)`;

                          return (
                            <div className="bg-neutral-950 text-white p-3.5 rounded-2xl border border-neutral-800 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-xs font-black text-white">
                                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                  <Clock className="w-4 h-4 text-amber-400" /> 실시간 잔여 남은 시간:
                                </span>
                                <div className="flex items-center gap-1 font-mono">
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedHH}시간
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
                              <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between font-mono pt-1.5 border-t border-neutral-800">
                                <span>타임세일 종료 예정 시각:</span>
                                <span className="text-amber-300 font-black bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">{expiryFormatted}</span>
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

                      <div className="space-y-2">
                        <label className="text-[11px] font-extrabold text-neutral-800">타임세일 진행 시간 설정</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="720"
                              value={editTimeSaleHours}
                              onChange={(e) => setEditTimeSaleHours(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-8 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="24"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">시간</span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={editTimeSaleMinutes}
                              onChange={(e) => setEditTimeSaleMinutes(e.target.value)}
                              className="w-full h-9 bg-white border border-neutral-200 rounded-xl pl-3 pr-7 text-xs font-black font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-500">분</span>
                          </div>
                        </div>

                        {/* Preset quick buttons */}
                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                          {[
                            { label: "12시간", h: "12", m: "0" },
                            { label: "24시간", h: "24", m: "0" },
                            { label: "48시간", h: "48", m: "0" },
                            { label: "72시간", h: "72", m: "0" },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setEditTimeSaleHours(preset.h);
                                setEditTimeSaleMinutes(preset.m);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all shrink-0 ${
                                editTimeSaleHours === preset.h && editTimeSaleMinutes === preset.m
                                  ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Real-time Ticking Remaining Time Display Box */}
                        {(() => {
                          let totalSec = (parseInt(editTimeSaleHours) || 0) * 3600 + (parseInt(editTimeSaleMinutes) || 0) * 60;
                          if (editingProduct && productTimeSaleExpiries[editingProduct.id]) {
                            const exp = productTimeSaleExpiries[editingProduct.id];
                            if (exp > nowTick) {
                              totalSec = Math.max(0, Math.floor((exp - nowTick) / 1000));
                            }
                          }

                          const hours = Math.floor(totalSec / 3600);
                          const mins = Math.floor((totalSec % 3600) / 60);
                          const secs = totalSec % 60;

                          const formattedHH = String(hours).padStart(2, "0");
                          const formattedMM = String(mins).padStart(2, "0");
                          const formattedSS = String(secs).padStart(2, "0");

                          const expiryDate = new Date(nowTick + totalSec * 1000);
                          const year = expiryDate.getFullYear();
                          const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
                          const day = String(expiryDate.getDate()).padStart(2, "0");
                          const hoursStr = String(expiryDate.getHours()).padStart(2, "0");
                          const minsStr = String(expiryDate.getMinutes()).padStart(2, "0");
                          const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
                          const dayOfWeek = weekDays[expiryDate.getDay()];
                          const expiryFormatted = `${year}-${month}-${day} ${hoursStr}:${minsStr} (${dayOfWeek}요일)`;

                          return (
                            <div className="bg-neutral-950 text-white p-3.5 rounded-2xl border border-neutral-800 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-xs font-black text-white">
                                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                  <Clock className="w-4 h-4 text-amber-400" /> 실시간 잔여 남은 시간:
                                </span>
                                <div className="flex items-center gap-1 font-mono">
                                  <span className="bg-white text-neutral-950 text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                                    {formattedHH}시간
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
                              <div className="text-[11px] font-bold text-neutral-300 flex items-center justify-between font-mono pt-1.5 border-t border-neutral-800">
                                <span>타임세일 종료 예정 시각:</span>
                                <span className="text-amber-300 font-black bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">{expiryFormatted}</span>
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

                {/* 2. BULK PURCHASE DISCOUNT */}
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
