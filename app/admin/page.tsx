"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useInquiries } from "@/hooks/admin/useInquiries";
import { useRevenue } from "@/hooks/admin/useRevenue";
import { useInboundSchedules } from "@/hooks/admin/useInboundSchedules";
import { useLiveChat } from "@/hooks/admin/useLiveChat";
import { useCustomers } from "@/hooks/admin/useCustomers";
import { useTimesale } from "@/hooks/admin/useTimesale";
import { useProducts } from "@/hooks/admin/useProducts";
import { useShipments } from "@/hooks/admin/useShipments";
import {
  LayoutDashboard,
  LayoutTemplate,
  Package,
  ShoppingBag,
  FolderTree,
  Settings,
  Plus,
  Minus,
  Search,
  ArrowUp,
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
  Activity,
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
  User2,
  Ticket,
} from "lucide-react";

import { ProductsManagement } from "./components/products-management";
import { ProductFormModal } from "./components/product-form-modal";
import { TimesaleManagement } from "./components/timesale-management";
import { RevenueManagement } from "./components/revenue-management";
import { MainPageManagement } from "./components/main-page-management";
import { SetBundleModal } from "./components/set-bundle-modal";
import { CustomersManagement } from "./components/customers-management";
import { CouponsManagement } from "./components/coupons-management";
import { OrdersManagement } from "./components/orders-management";
import { InboundStockManagement } from "./components/inbound-stock-management";
import { InquiriesManagement } from "./components/inquiries-management";
import { GlobalSalesManagement } from "./components/global-sales-management";
import { PopupManagement } from "./components/popup-management";
import { VisitorsManagement } from "./components/visitors-management";
import { LanguageSelector } from "@/components/layout/header/language-selector";
import { getAllUserCoupons, syncAdminCouponsFromSupabase } from "@/lib/membership/coupons";

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "inbound" | "timesale" | "sales" | "popup" | "visitors" | "revenue" | "main" | "customers" | "coupons" | "inquiries" | "settings" | "global_sales">("orders");

  // Admin Coupons Count State
  const [adminCouponsCount, setAdminCouponsCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        return getAllUserCoupons().length;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });

  useEffect(() => {
    let isMounted = true;

    const updateCount = () => {
      if (typeof window !== "undefined") {
        setAdminCouponsCount(getAllUserCoupons().length);
      }
    };

    updateCount();

    // Supabase 원격 DB로부터 최신 쿠폰 목록 즉시 동기화하여 사이드바 배지에 즉시 반영
    syncAdminCouponsFromSupabase().then((list) => {
      if (isMounted && Array.isArray(list)) {
        setAdminCouponsCount(list.length);
      }
    });

    window.addEventListener("coupons_updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      isMounted = false;
      window.removeEventListener("coupons_updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  // Scroll to Top Floating Button State
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 250);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // VIP Customer Inquiry State
  const {
    inquiriesList, setInquiriesList,
    zoomedInquiryImage, setZoomedInquiryImage,
    inquiriesFilter, setInquiriesFilter,
    handleReplyToInquiry
  } = useInquiries(triggerToast);
  // Revenue Management State
  const {
    revenueSelectedYear, setRevenueSelectedYear,
    revenueSelectedMonth, setRevenueSelectedMonth,
    revenueFilterPeriod, setRevenueFilterPeriod,
    revenueStatusFilter, setRevenueStatusFilter,
    revenueSearchQuery, setRevenueSearchQuery
  } = useRevenue();
  // Inbound Management State
  const {
    inboundSchedulesList, setInboundSchedulesList,
    selectedInboundItem, setSelectedInboundItem,
    isInboundModalOpen, setIsInboundModalOpen,
    isAddInboundModalOpen, setIsAddInboundModalOpen,
    calendarDate, setCalendarDate,
    inboundSearchQuery, setInboundSearchQuery,
    newInboundTitle, setNewInboundTitle,
    newInboundWarehouse, setNewInboundWarehouse,
    newInboundDate, setNewInboundDate,
    handleUpdateInboundStatus,
    handleAddInboundSchedule,
    inboundItemSearchQuery, setInboundItemSearchQuery,
    inboundStatusFilter, setInboundStatusFilter,
    
    newInboundSupplier, setNewInboundSupplier,
    
    
    
    
    
    
    newInboundQuantity, setNewInboundQuantity,
    
    newInboundNotes, setNewInboundNotes,
    newInboundStatus, setNewInboundStatus,
    handleDeleteInboundSchedule
  } = useInboundSchedules(triggerToast);

  const [ordersList, setOrdersList] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_orders");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) { }
      }
    }
    return initialOrders;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time sale states
  const {
    adminTimeSaleHours, setAdminTimeSaleHours,
    adminTimeSaleMinutes, setAdminTimeSaleMinutes,
    adminTimeSaleDiscount, setAdminTimeSaleDiscount,
    adminTimeSaleTitle, setAdminTimeSaleTitle,
    adminTimeSaleStatus, setAdminTimeSaleStatus,
    adminTimeSaleCategory, setAdminTimeSaleCategory,
    adminTimeSaleProductIds, setAdminTimeSaleProductIds,
    secretSalesList, setSecretSalesList,
    newIsTimeSale, setNewIsTimeSale,
    newTimeSaleHours, setNewTimeSaleHours,
    newTimeSaleMinutes, setNewTimeSaleMinutes,
    newTimeSaleDiscountRate, setNewTimeSaleDiscountRate,
    newTimeSaleDiscountPrice, setNewTimeSaleDiscountPrice,
    timeSaleRemainingSec, setTimeSaleRemainingSec,
    isTimeSaleItemModalOpen, setIsTimeSaleItemModalOpen,
    timeSaleItemSearchQuery, setTimeSaleItemSearchQuery,
    timeSaleItemCategoryFilter, setTimeSaleItemCategoryFilter,
    productTimeSaleSettings, setProductTimeSaleSettings,
    productTimeSaleExpiries, setProductTimeSaleExpiries,
    formatRemainingTimeDisplay,
    
    
    handleDeleteTimeSale
  } = useTimesale(triggerToast);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }

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

  const {
    productsList,
    setProductsList,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedCategoryForProducts,
    setSelectedCategoryForProducts,
    productSortOrder,
    setProductSortOrder,
    saveProductsToStorage,
    getProductNoNum,
    getProductNo,
    filteredProducts,
    categoryProducts,
    actualProductsCount,
    getProductStock,
    toggleStock,
    toggleProductPurchasable,
    toggleMainFeatured,
    handleDeleteProduct,
    handleBulkUpdateMainFeatured,
    handleBulkUpdateStock,
    handleBulkDeleteProducts,
    handleReorderProducts,
    handleClearAllProducts,
    handleRestoreDefaultProducts,
    handleBulkAddProducts,
    handleMoveProduct,
    handleMoveProductToTop,
    handleBulkMoveToTop,
    handleSortOrderChange,
    handleQuickUpdateReleaseSchedule,
    handleQuickUpdateCategory,
    handleQuickUpdatePrice,
    handleQuickUpdateStock,
  } = useProducts({
    triggerToast,
    adminTimeSaleProductIds,
    setAdminTimeSaleProductIds,
    adminTimeSaleHours,
    adminTimeSaleMinutes,
    adminTimeSaleDiscount,
    handleUpdateProductTimeSetting,
  });

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
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
        } catch (e) { }
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
  // Live Time Sale Countdown Remaining Ticker State
  const [nowTick, setNowTick] = useState(Date.now());
  // Live Chat Admin State & Storage Sync
  const {
    adminLiveChatMessages, setAdminLiveChatMessages,
    adminLiveInput, setAdminLiveInput,
    activeSessionId, setActiveSessionId,
    chatSessionsList, setChatSessionsList,
    handleAdminSendLiveChat,
    
    demoSessionMessages, setDemoSessionMessages,
    handleAdminClearLiveChat,
    isLiveChatSessionEnded,
    activeSessionMessages,
    handleAdminEndLiveChat
  } = useLiveChat(triggerToast);

  // Ticker interval every 1 second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  


  // Main Home Page Admin Control State
  const [mainBadgeText, setMainBadgeText] = useState("latest drop");
  const [mainNoticeBanner, setMainNoticeBanner] = useState("전 상품 무료배송 & VIP 회원 추가 10% 할인이 진행 중입니다.");
  const [isMainNoticeActive, setIsMainNoticeActive] = useState(true);

  // Default Admin Account
  const DEFAULT_ADMIN_CUSTOMER = {
    id: "ADMIN-001",
    name: "최고관리자 (Admin)",
    email: "admin@choicomma.com",
    phone: "02-579-1171",
    postcode: "06306",
    address: "서울특별시 강남구 개포로22길 12",
    detailAddress: "6층 (주)초이콤마 본사",
    grade: "VVIP",
    totalSpent: 25000000,
    points: 100000,
    couponsCount: 0,
    joinedDate: "2026-01-01",
    status: "Active",
    role: "ADMIN",
    isAdmin: true,
  };

  // Customer Management Admin State
  const {
    customersList, setCustomersList,
    customerSearchQuery, setCustomerSearchQuery,
    customerGradeFilter, setCustomerGradeFilter,
    customerStatusFilter, setCustomerStatusFilter,
    isAddCustomerModalOpen, setIsAddCustomerModalOpen,
    newCustName, setNewCustName,
    newCustEmail, setNewCustEmail,
    newCustPhone, setNewCustPhone,
    newCustAddress, setNewCustAddress,
    newCustGrade, setNewCustGrade,
    newCustPoints, setNewCustPoints,
    newCustStatus, setNewCustStatus,
    editingCustomer, setEditingCustomer,
    editCustGrade, setEditCustGrade,
    editCustAddress, setEditCustAddress,
    editCustPointsDelta, setEditCustPointsDelta,
    editCustPointAction, setEditCustPointAction,
    editCustPointAmount, setEditCustPointAmount,
    editCustStatus, setEditCustStatus,
    handleAddCustomerSubmit,
    handleOpenEditCustomer,
    handleApplyCustomerPoints,
    handleSaveEditCustomer,
    handleDeleteCustomer,
    handleExcelFileUpload,
    handleResetCustomerData,
    handleClearAllCustomers,
    newCustomersThisMonth,
    isCustomersLoaded,
  } = useCustomers(triggerToast);
  // Shipment Management State & Handlers
  const {
    shipmentsList, setShipmentsList,
    shipmentSearchQuery, setShipmentSearchQuery,
    shipmentStatusFilter, setShipmentStatusFilter,
    shipmentCarrierFilter, setShipmentCarrierFilter,
    shipmentPage, setShipmentPage,
    SHIPMENTS_PER_PAGE,
    isAddShipmentModalOpen, setIsAddShipmentModalOpen,
    newShipmentOrderId, setNewShipmentOrderId,
    newShipmentRecipient, setNewShipmentRecipient,
    newShipmentPhone, setNewShipmentPhone,
    newShipmentAltPhone, setNewShipmentAltPhone,
    newShipmentZipCode, setNewShipmentZipCode,
    newShipmentAddress, setNewShipmentAddress,
    newShipmentDetailAddress, setNewShipmentDetailAddress,
    newShipmentItems, setNewShipmentItems,
    newShipmentQuantity, setNewShipmentQuantity,
    newShipmentShippingMemo, setNewShipmentShippingMemo,
    newShipmentCarrier, setNewShipmentCarrier,
    newShipmentTracking, setNewShipmentTracking,
    newShipmentStatus, setNewShipmentStatus,
    editingShipment, setEditingShipment,
    editShipmentCarrier, setEditShipmentCarrier,
    editShipmentTracking, setEditShipmentTracking,
    editShipmentStatus, setEditShipmentStatus,
    isCjConfigModalOpen, setIsCjConfigModalOpen,
    configModalTab, setConfigModalTab,
    shippingPolicy, setShippingPolicy,
    cjClientCode, setCjClientCode,
    cjContractNo, setCjContractNo,
    cjApiKey, setCjApiKey,
    cjSenderAddress, setCjSenderAddress,
    handleOpenSenderPostcode,
    handleIssueCjLogisticsTracking,
    handleExportCjExcel,
    handleAddShipmentSubmit,
    handleSaveShipmentDetails,
    handleDeleteShipment,
    filteredShipments,
    totalShipmentPages,
    paginatedShipments,
    handleOpenNewShipmentPostcode,
    handleOpenEditShipment,
    handleSaveEditShipment,
    cjPrintData,
    setCjPrintData
  } = useShipments(triggerToast);

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
      } catch (e) { }
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

  const handleAdminLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("choicomma_admin_authenticated");
      localStorage.removeItem("user_role");
      localStorage.removeItem("membership_user_email");
      localStorage.removeItem("membership_user_name");
      localStorage.removeItem("is_logged_in");
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("auth_changed"));
      window.location.replace("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-neutral-900 flex flex-col font-sans" suppressHydrationWarning>
      {/* Toast Notification (Top Center Floating - White Card Design) */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-neutral-950 font-bold text-xs sm:text-[13px] px-5 py-3.5 rounded-2xl shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)] border border-neutral-200/90 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[90vw] w-auto">
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
            aria-label="알림 닫기"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
          <div className="w-4 h-4 rounded-full bg-neutral-950 text-white flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </div>
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
            <Link href="/" onClick={() => { if (typeof window !== "undefined") window.location.href = "/"; }} className="font-extrabold text-base tracking-tight text-neutral-950 hover:text-black">
              CHOICOMMA
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
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "orders"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <ShoppingBag className="w-4 h-4 text-neutral-900" />
            주문 및 배송 관리
          </button>

          {/* 매출 관리 (주문 및 배송 관리 바로 밑) */}
          <button
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeTab === "revenue"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <TrendingUp className="w-4 h-4 text-neutral-900" />
            매출 관리
          </button>

          {/* CS 관리 (고객 문의 및 라이브 채팅) */}
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeTab === "inquiries"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <MessageSquare className="w-4 h-4 text-neutral-900" />
            CS
          </button>

          {/* 2. 회원 관리 */}
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "customers"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Users className="w-4 h-4 text-neutral-900" />
            회원 관리
          </button>

          {/* 방문자 관리 (쿠폰 관리와 위치 교환) */}
          <button
            onClick={() => setActiveTab("visitors")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeTab === "visitors"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Activity className="w-4 h-4 text-neutral-900" />
            방문자 관리
          </button>

          {/* 3. 메인 이미지 관리 */}
          <button
            onClick={() => setActiveTab("main")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "main"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Layers className="w-4 h-4 text-neutral-900" />
            메인 이미지 관리
          </button>

          {/* 4. 재고 및 입고 캘린더 */}
          <button
            onClick={() => setActiveTab("inbound")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "inbound"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Calendar className="w-4 h-4 text-neutral-900" />
            재고 및 입고 캘린더
          </button>

          {/* 5. 상품관리 */}
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "products"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Package className="w-4 h-4 text-neutral-900" />
            상품 관리
          </button>

          {/* 7. 프로모션 */}
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "sales"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Percent className="w-4 h-4 text-neutral-900" />
            프로모션
          </button>

          {/* 7-1. 팝업 관리 */}
          <button
            onClick={() => setActiveTab("popup")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "popup"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <LayoutTemplate className="w-4 h-4 text-neutral-900" />
            팝업 관리
          </button>

          {/* 쿠폰 관리 (방문자 관리와 위치 교환) */}
          <button
            onClick={() => setActiveTab("coupons")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "coupons"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Ticket className="w-4 h-4 text-neutral-900" />
            쿠폰 관리
          </button>

          {/* 9. 해외 판매가 */}
          <button
            onClick={() => setActiveTab("global_sales")}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeTab === "global_sales"
                ? "bg-neutral-100 text-neutral-950 font-extrabold"
                : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
              }`}
          >
            <Globe className="w-4 h-4 text-neutral-900" />
            해외 판매가
          </button>


          <div className="mt-auto pt-4 border-t border-neutral-200 space-y-1.5">
            <Link
              href="/membership"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("membership_user_name", "최고관리자 (Admin)");
                  localStorage.setItem("membership_user_email", "admin@choicomma.com");
                  localStorage.setItem("membership_user_phone", "010-1234-5678");
                  localStorage.setItem("membership_user_postcode", "06306");
                  localStorage.setItem("membership_user_address", "서울특별시 강남구 개포로22길 12");
                  localStorage.setItem("membership_user_address_detail", "6층 (주)초이콤마 본사");
                  localStorage.setItem("user_grade", "VVIP");
                  localStorage.setItem("user_role", "admin");
                  localStorage.setItem("is_logged_in", "true");
                  const adminCust = customersList.find((c: any) => c.id === "ADMIN-001");
                  const currentAdminPts = adminCust?.points !== undefined ? String(adminCust.points) : (localStorage.getItem("membership_user_points") || "100000");
                  localStorage.setItem("membership_user_points", currentAdminPts);
                  window.dispatchEvent(new CustomEvent("storage"));
                  window.dispatchEvent(new CustomEvent("auth_changed"));
                }
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-all border border-neutral-200/80 bg-white"
            >
              <User2 className="w-4 h-4 text-neutral-900" />
              <span>마이페이지 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-neutral-400" />
            </Link>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeTab === "settings"
                  ? "bg-neutral-100 text-neutral-950 font-extrabold"
                  : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 font-medium"
                }`}
            >
              <Settings className="w-4 h-4 text-neutral-900" />
              스토어 설정
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 mx-auto w-full ${
          activeTab === "products" || activeTab === "orders" || activeTab === "inbound" || activeTab === "revenue" || activeTab === "global_sales" || activeTab === "visitors"
            ? "max-w-[1850px]"
            : "max-w-7xl"
        }`}>
          {/* Mobile Horizontal Tab Navigation */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-neutral-200/80 scrollbar-thin">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "orders" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              주문 및 배송
            </button>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "revenue" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              매출 관리
            </button>
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${activeTab === "inquiries"
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-100 text-neutral-600"
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-neutral-900" />
              CS 관리
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "customers" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              회원
            </button>
            <button
              onClick={() => setActiveTab("visitors")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "visitors" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              방문자 관리
            </button>
            <button
              onClick={() => setActiveTab("timesale")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1 ${activeTab === "timesale" ? "bg-amber-500 text-neutral-950 shadow-xs" : "bg-amber-100/70 text-amber-900"
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950" />
              타임세일
            </button>
            <button
              onClick={() => setActiveTab("main")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "main" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              메인
            </button>
            <button
              onClick={() => setActiveTab("inbound")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "inbound" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              재고
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "products" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              상품
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "sales" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              프로모션
            </button>
            <button
              onClick={() => setActiveTab("popup")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === "popup" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              팝업 관리
            </button>
            <button
              onClick={() => setActiveTab("coupons")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${activeTab === "coupons" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"
                }`}
            >
              <Ticket className="w-3.5 h-3.5 text-neutral-900" />
              쿠폰 관리
          </button>
            <button
              onClick={() => setActiveTab("global_sales")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${activeTab === "global_sales"
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-100 text-neutral-600"
                }`}
            >
              <Globe className="w-3.5 h-3.5 text-neutral-900" />
              해외 판매가
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
              setProductSortOrder={handleSortOrderChange}
              categoriesList={categoriesList}
              getProductStock={getProductStock}
              getProductNo={getProductNo}
              handleClearAllProducts={handleClearAllProducts}
              handleOpenEditModal={handleOpenEditModal}
              handleDeleteProduct={handleDeleteProduct}
              toggleStock={toggleStock}
              toggleMainFeatured={toggleMainFeatured}
              setIsAddModalOpen={setIsAddModalOpen}
              handleBulkAddProducts={handleBulkAddProducts}
              handleMoveProduct={handleMoveProduct}
              handleMoveProductToTop={handleMoveProductToTop}
              handleBulkMoveToTop={handleBulkMoveToTop}
              handleBulkDeleteProducts={handleBulkDeleteProducts}
              handleBulkUpdateMainFeatured={handleBulkUpdateMainFeatured}
              handleBulkUpdateStock={handleBulkUpdateStock}
              toggleProductPurchasable={toggleProductPurchasable}
              handleReorderProducts={handleReorderProducts}
              handleQuickUpdateReleaseSchedule={handleQuickUpdateReleaseSchedule}
              handleQuickUpdateCategory={handleQuickUpdateCategory}
              handleQuickUpdatePrice={handleQuickUpdatePrice}
              handleQuickUpdateStock={handleQuickUpdateStock}
            />
          )}

          {/* TAB: TIMESALE & PROMOTION (SECRET TIME SALE) */}
          {activeTab === "sales" && (
            <TimesaleManagement
              productsList={productsList}
              customersList={customersList}
              secretSalesList={secretSalesList}
              setSecretSalesList={setSecretSalesList}
              triggerToast={triggerToast}
            />
          )}

          {/* TAB: POPUP MANAGEMENT */}
          {activeTab === "popup" && (
            <PopupManagement triggerToast={triggerToast} />
          )}

          {/* TAB: VISITORS MANAGEMENT */}
          {activeTab === "visitors" && (
            <VisitorsManagement triggerToast={triggerToast} />
          )}

          {/* TAB: REVENUE MANAGEMENT (VISITORS & NET SALES ANALYTICS) */}
          {activeTab === "revenue" && (
            <RevenueManagement
              revenueSelectedMonth={revenueSelectedMonth}
              setRevenueSelectedMonth={setRevenueSelectedMonth}
              revenueSelectedYear={revenueSelectedYear}
              setRevenueSelectedYear={setRevenueSelectedYear}
              revenueSearchQuery={revenueSearchQuery}
              setRevenueSearchQuery={setRevenueSearchQuery}
              triggerToast={triggerToast}
              productsList={productsList}
              shipmentsList={shipmentsList}
            />
          )}

          {/* TAB: MAIN PAGE CONTROL */}
          {activeTab === "main" && (
            <MainPageManagement
              productsList={productsList}
              setProductsList={setProductsList}
              saveProductsToStorage={saveProductsToStorage}
              triggerToast={triggerToast}
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
              handleResetCustomerData={handleResetCustomerData}
              isCustomersLoaded={isCustomersLoaded}
            />
          )}

          {/* TAB: COUPONS MANAGEMENT */}
          {activeTab === "coupons" && (
            <CouponsManagement
              customersList={customersList}
              triggerToast={triggerToast}
            />
          )}

          {/* TAB: ORDERS & SHIPMENTS INTEGRATED MANAGEMENT */}
          {activeTab === "orders" && (
            <OrdersManagement
              productsList={productsList}
              customersList={customersList}
              setCustomersList={setCustomersList}
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
              cjPrintData={cjPrintData}
              setCjPrintData={setCjPrintData}
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

      {/* Unified Product Form Modal (Add & Edit) */}
      <ProductFormModal
        isOpen={isAddModalOpen || Boolean(editingProduct)}
        mode={editingProduct ? "edit" : "add"}
        initialProduct={editingProduct}
        categoriesList={categoriesList}
        productsList={productsList}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={(savedProduct, isNew) => {
          let updatedList: any[];
          if (isNew) {
            updatedList = [savedProduct, ...productsList];
            triggerToast(`신규 상품 '${savedProduct.title}'이 성공적으로 등록되었습니다.`);
          } else {
            updatedList = productsList.map((p) => String(p.id) === String(savedProduct.id) ? savedProduct : p);
            triggerToast(`'${savedProduct.title}' 상품 정보가 성공적으로 수정되었습니다.`);
          }
          setProductsList(updatedList);
          saveProductsToStorage(updatedList);
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        triggerToast={triggerToast}
      />

      {/* SET ITEM CREATION MODAL */}
      <SetBundleModal
        isOpen={isSetModalOpen}
        onClose={() => setIsSetModalOpen(false)}
        productsList={productsList}
        setSalesList={setSalesList}
        setSetSalesList={setSetSalesList}
        setAdminTimeSaleProductIds={setAdminTimeSaleProductIds}
        triggerToast={triggerToast}
      />



      
          {/* FLOATING TOP SCROLL BUTTON */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-neutral-950 text-white shadow-2xl hover:bg-neutral-800 transition-all cursor-pointer flex items-center justify-center border border-neutral-700 animate-in fade-in zoom-in-75 duration-200 group"
          title="페이지 최상단으로 이동 (TOP)"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
</div>
  );
}
