"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Home,
  LogOut,
  Mail,
  Search,
  Settings,
  ShoppingBag,
  User2,
  Package,
  Heart,
  Sparkles,
  ChevronRight,
  Plus,
  PlusCircle,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  Truck,
  ExternalLink,
  Tag,
  Gift,
  Ticket,
  Copy,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-context";
import { mockProducts } from "@/lib/sfcc/mock/products";
import { formatPrice } from "@/lib/sfcc/utils";
import { SetBundleSection } from "@/components/products/set-bundle-section";

function MembershipContent() {
  const { cart, updateCartItem } = useCart();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "dashboard";

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "coupons" | "points" | "tiers" | "profile"
  >(
    ["dashboard", "orders", "coupons", "points", "tiers", "profile"].includes(initialTab)
      ? initialTab
      : "dashboard"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Update tab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["dashboard", "orders", "coupons", "points", "tiers", "profile"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // User Profile & Grade State (Synced with localStorage & Admin)
  const [userName, setUserName] = useState("홍길동");
  const [userEmail, setUserEmail] = useState("customer@choicomma.com");
  const [userPhone, setUserPhone] = useState("010-1234-5678");
  const [userPostcode, setUserPostcode] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userAddressDetail, setUserAddressDetail] = useState("");
  const [userGrade, setUserGrade] = useState<"GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP">("GENERAL");

  // Load Daum Postcode Script
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).daum) {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleOpenPostcode = () => {
    if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let fullAddress = data.address;
          let extraAddress = "";

          if (data.addressType === "R") {
            if (data.bname !== "") {
              extraAddress += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
          }

          setUserPostcode(data.zonecode || "06306");
          setUserAddress(fullAddress);
          toast.success(`주소가 선택되었습니다: ${fullAddress}`);
        },
      }).open();
    } else {
      toast.info("우편번호 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // Points (적립금) State (Default 0 P, Empty History)
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  // Available Coupons State (Empty by default)
  const [couponsList, setCouponsList] = useState<any[]>([]);

  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Orders State (Synced from admin_shipments & user session)
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Shipping Policy
  const [shippingPolicy, setShippingPolicy] = useState({
    baseFee: 3000,
    freeShippingThreshold: 100000,
    islandExtraFee: 3000,
    returnExchangeFee: 6000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  const loadData = () => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("membership_user_name");
      if (savedName) setUserName(savedName);
      const savedEmail = localStorage.getItem("membership_user_email");
      if (savedEmail) setUserEmail(savedEmail);
      const savedPhone = localStorage.getItem("membership_user_phone");
      if (savedPhone) setUserPhone(savedPhone);
      const savedPostcode = localStorage.getItem("membership_user_postcode");
      setUserPostcode(savedPostcode || "");
      const savedAddress = localStorage.getItem("membership_user_address");
      setUserAddress(savedAddress || "");
      const savedDetail = localStorage.getItem("membership_user_address_detail");
      setUserAddressDetail(savedDetail || "");

      const savedPoints = localStorage.getItem("membership_user_points");
      if (savedPoints && !isNaN(parseInt(savedPoints))) {
        setUserPoints(parseInt(savedPoints));
      } else {
        localStorage.setItem("membership_user_points", "0");
        setUserPoints(0);
      }

      // Sync User Grade from admin_customers or localStorage (5 Tiers: GENERAL, SILVER, GOLD, PLATINUM, VVIP)
      let currentGrade: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP" = "GENERAL";
      const savedGrade = localStorage.getItem("user_grade") || localStorage.getItem("user_role");
      if (savedGrade) {
        const up = savedGrade.toUpperCase();
        if (up.includes("VVIP") || up.includes("BLACK")) currentGrade = "VVIP";
        else if (up.includes("PLATINUM") || up.includes("플래티넘")) currentGrade = "PLATINUM";
        else if (up.includes("GOLD") || up.includes("골드")) currentGrade = "GOLD";
        else if (up.includes("SILVER") || up.includes("실버")) currentGrade = "SILVER";
        else currentGrade = "GENERAL";
      }

      const adminCustomersRaw = localStorage.getItem("admin_customers");
      if (adminCustomersRaw) {
        try {
          const list: any[] = JSON.parse(adminCustomersRaw);
          const currentEmail = (savedEmail || userEmail || "").toLowerCase().trim();
          const currentName = savedName || userName;
          const isAdminSession = sessionStorage.getItem("choicomma_admin_authenticated") === "true";
          
          const found = list.find((c) => {
            const cEmail = (c.email || "").toLowerCase().trim();
            const cName = c.name || "";
            if (isAdminSession && (c.isAdmin || cEmail === "admin@choicomma.com")) return true;
            return (currentEmail && cEmail === currentEmail) || (currentName && cName === currentName);
          });

          if (found) {
            if (found.name) setUserName(found.name);
            if (found.email && found.email !== "-") setUserEmail(found.email);
            if (found.phone && found.phone !== "-") setUserPhone(found.phone);
            if (found.address && found.address !== "-") {
              setUserAddress(found.address);
            }
            if (found.addressDetail !== undefined) {
              setUserAddressDetail(found.addressDetail);
            }
            if (found.postcode) {
              setUserPostcode(found.postcode);
            }
            if (found.points !== undefined) {
              setUserPoints(found.points);
            }
            if (found.grade) {
              const fg = String(found.grade).toUpperCase();
              if (fg.includes("VVIP") || fg.includes("BLACK")) currentGrade = "VVIP";
              else if (fg.includes("PLATINUM") || fg.includes("플래티넘")) currentGrade = "PLATINUM";
              else if (fg.includes("GOLD") || fg.includes("골드")) currentGrade = "GOLD";
              else if (fg.includes("SILVER") || fg.includes("실버")) currentGrade = "SILVER";
              else currentGrade = "GENERAL";
            }
          }
        } catch (e) {}
      }
      setUserGrade(currentGrade);
      localStorage.setItem("user_grade", currentGrade);

      const savedPolicy = localStorage.getItem("shipping_policy");
      if (savedPolicy) {
        try {
          setShippingPolicy(JSON.parse(savedPolicy));
        } catch (e) {}
      }

      // Load user orders from admin_shipments
      const savedShipments = localStorage.getItem("admin_shipments");
      if (savedShipments) {
        try {
          const list: any[] = JSON.parse(savedShipments);
          const currentEmail = (savedEmail || userEmail || "").toLowerCase().trim();
          const currentName = savedName || userName;

          const matched = list.filter((s) => {
            const shipEmail = (s.recipientEmail || s.email || "").toLowerCase().trim();
            const shipName = s.recipient || s.name || "";
            return (currentEmail && shipEmail === currentEmail) || (currentName && shipName === currentName);
          });

          if (matched.length > 0) {
            setUserOrders(matched);
          } else {
            // Default sample orders
            setUserOrders(list.slice(0, 3));
          }
        } catch (e) {}
      } else {
        // Fallback demo orders
        setUserOrders([
          {
            id: "ORD-20260801-0982",
            orderId: "ORD-20260801-0982",
            recipient: userName,
            orderDate: "2026-08-01",
            status: "In Transit",
            carrier: "CJ대한통운",
            trackingNumber: "5892049102",
            items: "프리미엄 콤마 테일러드 재킷 (BLACK / 2) 외 1건",
            amount: 189000,
            address: userAddress || "서울특별시 강남구 개포로22길 12 6층",
          },
          {
            id: "ORD-20260725-0412",
            orderId: "ORD-20260725-0412",
            recipient: userName,
            orderDate: "2026-07-25",
            status: "Delivered",
            carrier: "CJ대한통운",
            trackingNumber: "1092837461",
            items: "미니멀 울 와이드 슬랙스 (CHARCOAL / 1)",
            amount: 129000,
            address: userAddress || "서울특별시 강남구 개포로22길 12 6층",
          },
        ]);
      }
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    window.addEventListener("shipping_policy_updated", loadData);
    window.addEventListener("admin_shipments_updated", loadData);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("shipping_policy_updated", loadData);
      window.removeEventListener("admin_shipments_updated", loadData);
    };
  }, []);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    toast.success(`쿠폰 코드 [${code}]가 클립보드에 복사되었습니다. 결제 시 사용하세요!`);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const handleSaveProfile = () => {
    localStorage.setItem("membership_user_postcode", userPostcode);
    localStorage.setItem("membership_user_address", userAddress);
    localStorage.setItem("membership_user_address_detail", userAddressDetail);
    toast.success(`${userName} 회원님의 기본 배송지 주소가 안전하게 저장되었습니다.`);
  };

  const handleDeleteAccount = () => {
    const isConfirmed = window.confirm(
      "정말로 choicomma 회원 탈퇴를 진행하시겠습니까?\n\n탈퇴 시 회원 정보, 적립금(포인트), 주문 내역 연결이 삭제되며 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    if (typeof window !== "undefined") {
      const cleanPhone = (userPhone || "").replace(/[^0-9]/g, "");
      const cleanEmail = (userEmail || "").trim().toLowerCase();

      // 1. Remove Membership session keys
      localStorage.removeItem("membership_user_name");
      localStorage.removeItem("membership_user_email");
      localStorage.removeItem("membership_user_phone");
      localStorage.removeItem("membership_user_postcode");
      localStorage.removeItem("membership_user_address");
      localStorage.removeItem("membership_user_address_detail");
      localStorage.removeItem("membership_user_points");
      localStorage.removeItem("user_grade");
      localStorage.removeItem("user_role");
      localStorage.removeItem("is_logged_in");
      sessionStorage.removeItem("choicomma_admin_authenticated");

      // 2. Remove saved password keys
      if (cleanEmail) {
        localStorage.removeItem(`user_pwd_${cleanEmail}`);
      }
      if (cleanPhone) {
        localStorage.removeItem(`user_pwd_${cleanPhone}`);
        localStorage.removeItem(`user_pwd_${userPhone.trim()}`);
      }

      // 3. Remove customer from admin_customers
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const list: any[] = JSON.parse(savedCustomers);
          const filtered = list.filter((c) => {
            const cEmail = (c.email || "").trim().toLowerCase();
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            const cName = (c.name || "").trim();

            if (cleanEmail && cEmail === cleanEmail) return false;
            if (cleanPhone && cPhone === cleanPhone) return false;
            if (userName && cName === userName.trim()) return false;
            return true;
          });
          localStorage.setItem("admin_customers", JSON.stringify(filtered));
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("auth_changed"));
      window.dispatchEvent(new CustomEvent("admin_customers_updated"));
    }

    toast.success("회원 탈퇴가 성공적으로 완료되었습니다. 그동안 choicomma를 이용해 주셔서 감사합니다.");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("membership_user_name");
      localStorage.removeItem("membership_user_email");
      localStorage.removeItem("membership_user_phone");
      localStorage.removeItem("membership_user_postcode");
      localStorage.removeItem("membership_user_address");
      localStorage.removeItem("membership_user_address_detail");
      localStorage.removeItem("membership_user_points");
      localStorage.removeItem("user_grade");
      localStorage.removeItem("user_role");
      localStorage.removeItem("is_logged_in");
      sessionStorage.removeItem("choicomma_admin_authenticated");
      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("auth_changed"));
    }
    toast.info("성공적으로 로그아웃되었습니다.");
    window.location.href = "/login";
  };

  const popularCollection = mockProducts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#FAF9F5] text-neutral-900 font-sans items-start">
      {/* Left Sidebar */}
      <aside className="w-52 xl:w-56 border-r border-neutral-200/80 bg-white/60 backdrop-blur-md px-3.5 xl:px-4 py-8 flex flex-col justify-between max-md:hidden shrink-0 sticky top-0 h-screen">
        <div>
          {/* Brand Logo Header */}
          <div className="mb-6 pl-1">
            <Link href="/" className="inline-block">
              <span className="font-extrabold text-xl xl:text-2xl tracking-tighter text-black">
                choicomma
              </span>
              <span className="block text-[9px] tracking-widest text-neutral-400 font-medium uppercase mt-0.5">
                My Account
              </span>
            </Link>
          </div>

          {/* User Card & Logout */}
          <div className="space-y-2 mb-6 pb-4 border-b border-neutral-200/80">
            <div className="flex items-center gap-2.5 p-2.5 bg-neutral-100/80 rounded-2xl border border-neutral-200/60 shadow-2xs">
              <Avatar className="w-8 h-8 border border-neutral-300">
                <AvatarFallback className="bg-neutral-950 text-white font-extrabold text-[10px]">
                  MY
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-extrabold text-neutral-950 truncate">{userName} 님</p>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded font-mono ${
                      userGrade === "VVIP"
                        ? "bg-neutral-950 text-white border border-neutral-800"
                        : userGrade === "PLATINUM"
                        ? "bg-neutral-800 text-white border border-neutral-700"
                        : userGrade === "GOLD"
                        ? "bg-neutral-200 text-neutral-900 border border-neutral-300"
                        : userGrade === "SILVER"
                        ? "bg-neutral-100 text-neutral-800 border border-neutral-200"
                        : "bg-white text-neutral-600 border border-neutral-300"
                    }`}
                  >
                    {userGrade}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <Home className="h-4 w-4 shrink-0" />
              대시보드 홈
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0" />
                <span>주문내역 / 배송조회</span>
              </div>
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "orders" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
              }`}>
                {userOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("coupons")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "coupons"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <Ticket className="h-4 w-4 shrink-0" />
                <span>쿠폰함</span>
              </div>
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "coupons" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
              }`}>
                {couponsList.filter((c) => !c.isUsed).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("points")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "points"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 shrink-0" />
                <span>적립금 내역</span>
              </div>
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "points" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
              }`}>
                {userPoints.toLocaleString()} P
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tiers")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "tiers"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-neutral-900" />
                <span>회원 등급 혜택</span>
              </div>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-300">
                {userGrade}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <User2 className="h-4 w-4 shrink-0" />
              회원 정보 관리
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-10 py-8">
        {/* Header bar */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950">
                반갑습니다, {userName} 님!
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-900 text-white font-mono whitespace-nowrap">
                {userGrade} 등급
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              초이콤마의 회원 등급 혜택, 주문 내역, 보유 쿠폰 및 적립금을 간편하게 확인하세요.
            </p>
          </div>

          {/* Clean Quick Summary (No Card Borders) */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setActiveTab("tiers")}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-neutral-500">회원 등급</span>
              <span className="font-bold text-neutral-950 font-mono">{userGrade}</span>
            </button>

            <span className="text-neutral-300">|</span>

            <button
              onClick={() => setActiveTab("points")}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-neutral-500">적립금</span>
              <span className="font-bold text-neutral-950 font-mono">{userPoints.toLocaleString()} P</span>
            </button>

            <span className="text-neutral-300">|</span>

            <button
              onClick={() => setActiveTab("orders")}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-neutral-500">배송 현황</span>
              <span className="font-bold text-neutral-950 font-mono">{userOrders.length}건</span>
            </button>
          </div>
        </header>

        {/* Tab 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quick 3-Card Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab("orders")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-3xl p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                  <span>최근 주문 / 배송</span>
                  <Package className="w-4 h-4 text-neutral-900" />
                </div>
                <p className="text-2xl font-black text-neutral-950">{userOrders.length} 건</p>
                <p className="text-xs text-neutral-400">CJ대한통운 배송 실시간 추적 가능</p>
              </div>

              <div
                onClick={() => setActiveTab("coupons")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-3xl p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                  <span>사용 가능 쿠폰</span>
                  <Ticket className="w-4 h-4 text-neutral-900" />
                </div>
                <p className="text-2xl font-black text-neutral-950">
                  {couponsList.filter((c) => !c.isUsed).length} 장
                </p>
                <p className="text-xs text-neutral-400">결제 시 쿠폰 코드 즉시 적용</p>
              </div>

              <div
                onClick={() => setActiveTab("points")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-3xl p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                  <span>보유 적립금 (Point)</span>
                  <Gift className="w-4 h-4 text-neutral-900" />
                </div>
                <p className="text-2xl font-black text-neutral-950">
                  {userPoints.toLocaleString()} P
                </p>
                <p className="text-xs text-neutral-400">주문서 작성 시 100원 단위 사용</p>
              </div>
            </div>

            {/* Set Bundle / Recommended Products Section */}
            <SetBundleSection products={popularCollection} />
          </div>
        )}

        {/* Tab 2: ORDERS & TRACKING */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-neutral-950">주문내역 및 실시간 배송조회</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  고객님께서 주문하신 상품의 발송 상태와 CJ대한통운 실시간 배송 현황을 확인하실 수 있습니다.
                </p>
              </div>
            </div>

            {userOrders.length === 0 ? (
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-12 text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-neutral-900">주문 내역이 없습니다.</h3>
                <p className="text-xs text-neutral-500">초이콤마의 다양한 컬렉션 상품을 둘러보고 첫 주문을 시작해보세요!</p>
                <Link
                  href="/shop"
                  className="inline-block bg-neutral-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  쇼핑하러 가기
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((ord: any) => {
                  const trackingNumClean = String(ord.trackingNumber || "").replace(/[^0-9]/g, "");
                  const hasTracking = Boolean(trackingNumClean && trackingNumClean.length >= 8 && ord.trackingNumber !== "-");

                  return (
                    <div
                      key={ord.id || ord.orderId}
                      className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all"
                    >
                      {/* Order Card Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold text-neutral-950">
                              주문번호: {ord.orderId || ord.id}
                            </span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-xs text-neutral-500">
                              {ord.orderDate || ord.shippedDate || "2026-08-01"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                              ord.status === "Delivered"
                                ? "bg-neutral-950 text-white border-neutral-950"
                                : ord.status === "In Transit"
                                ? "bg-neutral-100 text-neutral-900 border-neutral-300"
                                : "bg-neutral-50 text-neutral-600 border-neutral-200"
                            }`}
                          >
                            {ord.status === "Delivered"
                              ? "배송 완료"
                              : ord.status === "In Transit"
                              ? "배송 중"
                              : "배송 준비 중"}
                          </span>
                        </div>
                      </div>

                      {/* Order Card Body */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="font-extrabold text-sm text-neutral-950">
                            {ord.items || "주문 상품 내역"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            받는 분: <strong>{ord.recipient || userName}</strong> ({ord.phone || userPhone || "연락처 등록"})
                          </p>
                          <p className="text-xs text-neutral-500">
                            배송지: {ord.address || userAddress || "기본 배송지"}
                          </p>
                        </div>

                        {/* Tracking Link & Carrier */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 shrink-0">
                          <div className="text-xs space-y-0.5">
                            <span className="text-[11px] font-bold text-neutral-500 block">
                              {ord.carrier || "CJ대한통운"}
                            </span>
                            {hasTracking ? (
                              <span className="font-mono font-extrabold text-neutral-900 block">
                                송장번호: {ord.trackingNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-400 font-bold block">
                                운송장 등록 대기 중
                              </span>
                            )}
                          </div>

                          {hasTracking ? (
                            <a
                              href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${trackingNumClean}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
                            >
                              <span>CJ대한통운 실시간 배송조회</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-neutral-500 bg-white px-3 py-1.5 rounded-xl border border-neutral-200">
                              출고 준비 중
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: COUPONS */}
        {activeTab === "coupons" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-neutral-950">보유 쿠폰함</h2>
              <p className="text-xs text-neutral-500 mt-1">
                주문서 작성 시 쿠폰 코드를 입력하시면 결제 금액에서 즉시 할인 혜택이 적용됩니다.
              </p>
            </div>

            {couponsList.length === 0 ? (
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                  <Ticket className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-neutral-900">현재 보유 중인 쿠폰이 없습니다.</h3>
                <p className="text-xs text-neutral-500 max-w-sm">
                  새로운 이벤트 및 할인 프로모션 진행 시 쿠폰이 자동으로 발급됩니다.
                </p>
                <Link
                  href="/shop"
                  className="mt-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  상품 둘러보기
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {couponsList.map((coupon) => {
                  const isCopied = copiedCoupon === coupon.code;
                  return (
                    <div
                      key={coupon.id}
                      className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="bg-neutral-950 text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            DISCOUNT COUPON
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            ~ {coupon.validUntil}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-neutral-950">{coupon.title}</h3>
                        <p className="text-2xl font-black text-neutral-950 font-mono">{coupon.discount}</p>
                        <p className="text-xs text-neutral-500">{coupon.condition}</p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <div className="bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200 font-mono text-xs font-black text-neutral-900 truncate">
                          {coupon.code}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCoupon(coupon.code)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            isCopied
                              ? "bg-neutral-950 text-white"
                              : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200"
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "복사완료" : "코드 복사"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: POINTS (적립금) */}
        {activeTab === "points" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-neutral-950">적립금(Point) 내역</h2>
              <p className="text-xs text-neutral-500 mt-1">
                적립된 포인트는 상품 주문 결제 시 현금처럼 자유롭게 사용하실 수 있습니다. (1P = 1원)
              </p>
            </div>

            {/* Current Points Balance Banner */}
            <div className="bg-neutral-950 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-800">
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  현재 사용 가능한 적립금
                </span>
                <p className="text-3xl sm:text-4xl font-black font-mono">
                  {userPoints.toLocaleString()} P
                </p>
              </div>
              <Link
                href="/shop"
                className="bg-white text-neutral-950 hover:bg-neutral-100 font-bold text-xs px-5 py-3 rounded-2xl transition-all text-center shrink-0"
              >
                적립금 사용하러 가기
              </Link>
            </div>

            {/* Points History Card */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-neutral-950 pb-3 border-b border-neutral-100">
                적립 / 사용 상세 내역
              </h3>

              <div className="space-y-3">
                {pointsHistory.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-neutral-400">
                    <Gift className="w-8 h-8 stroke-1 text-neutral-300" />
                    <p className="text-xs font-bold text-neutral-600">적립 및 사용 내역이 없습니다.</p>
                    <p className="text-[11px] text-neutral-400">상품 구매 시 결제 금액의 일부가 적립금으로 자동 적립됩니다.</p>
                  </div>
                ) : (
                  pointsHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-neutral-50 text-xs"
                    >
                      <div>
                        <p className="font-extrabold text-neutral-900">{item.label}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{item.date}</p>
                      </div>
                      <span
                        className={`font-mono font-black text-sm ${
                          item.amount > 0 ? "text-neutral-950" : "text-neutral-500"
                        }`}
                      >
                        {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} P
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: TIERS (회원 등급 혜택) */}
        {activeTab === "tiers" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-neutral-950">choicomma 멤버십 등급 & 혜택 안내</h2>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                초이콤마의 5단계 회원 등급(일반, 실버, 골드, 플래티넘, VVIP)별 차별화된 할인, 적립 및 프리미엄 VIP 혜택을 확인하세요.
              </p>
            </div>

            {/* Current Tier Status Hero Banner */}
            <div className="bg-neutral-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-800 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                      MY MEMBERSHIP STATUS
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                    {userName} 님의 등급은{" "}
                    <span className="px-3 py-0.5 rounded-xl font-mono text-xl sm:text-2xl font-black bg-white text-neutral-950 shadow-md">
                      {userGrade}
                    </span>{" "}
                    입니다
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-medium">
                    {userGrade === "VVIP" && "최상위 VVIP 회원님만을 위한 전 상품 10% 추가할인, 5% 적립, 상시 무료배송 및 전용 빠른 출고 혜택이 적용됩니다."}
                    {userGrade === "PLATINUM" && "플래티넘 회원님을 위한 전 상품 5% 추가할인, 3% 적립 및 전 주문 무료배송 혜택이 적용됩니다."}
                    {userGrade === "GOLD" && "골드 회원님을 위한 전 상품 3% 추가할인 및 2% 적립 혜택이 적용됩니다."}
                    {userGrade === "SILVER" && "실버 우수 회원님을 위한 1% 상시 적립 및 첫 구매 지원 혜택이 적용됩니다."}
                    {userGrade === "GENERAL" && "일반 회원님을 위한 기본 혜택과 신규 가입 웰컴 적립금 혜택이 적용됩니다."}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl sm:text-right shrink-0">
                  <span className="text-[11px] font-bold text-neutral-400 block">보유 적립금</span>
                  <span className="text-2xl font-black font-mono text-white">{userPoints.toLocaleString()} P</span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">결제 시 현금처럼 즉시 사용 가능</span>
                </div>
              </div>
            </div>

            {/* 5 Tier Cards Grid - Monochromatic Black & White Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* 1. GENERAL (일반) */}
              <div className={`rounded-3xl p-5 transition-all flex flex-col justify-between border bg-white ${
                userGrade === "GENERAL"
                  ? "border-2 border-neutral-950 shadow-lg ring-4 ring-neutral-200 relative"
                  : "border-neutral-200 hover:border-neutral-950 shadow-xs"
              }`}>
                {userGrade === "GENERAL" && (
                  <span className="absolute -top-3 left-5 bg-neutral-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    현재 회원 등급
                  </span>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                      GENERAL
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">신규 가입</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-neutral-950">일반 회원</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">가입 즉시 적용되는 기본 등급</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>신규 가입 웰컴 혜택</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>구매 후기 작성 적립금</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>10만원 이상 무료배송</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-medium text-neutral-400">
                    승급 기준: <strong>가입 즉시 부여</strong>
                  </p>
                </div>
              </div>

              {/* 2. SILVER */}
              <div className={`rounded-3xl p-5 transition-all flex flex-col justify-between border bg-white ${
                userGrade === "SILVER"
                  ? "border-2 border-neutral-950 shadow-lg ring-4 ring-neutral-200 relative"
                  : "border-neutral-200 hover:border-neutral-950 shadow-xs"
              }`}>
                {userGrade === "SILVER" && (
                  <span className="absolute -top-3 left-5 bg-neutral-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    현재 회원 등급
                  </span>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                      SILVER
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">100만원 이상</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-neutral-950">실버 등급</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">상시 1% 적립금 지원</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>구매금액 <strong>1% 적립금</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>실버 전용 할인 이벤트</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>10만원 이상 무료배송</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-medium text-neutral-400">
                    승급 기준: <strong>누적 100만원 이상</strong>
                  </p>
                </div>
              </div>

              {/* 3. GOLD */}
              <div className={`rounded-3xl p-5 transition-all flex flex-col justify-between border bg-white ${
                userGrade === "GOLD"
                  ? "border-2 border-neutral-950 shadow-lg ring-4 ring-neutral-200 relative"
                  : "border-neutral-200 hover:border-neutral-950 shadow-xs"
              }`}>
                {userGrade === "GOLD" && (
                  <span className="absolute -top-3 left-5 bg-neutral-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    현재 회원 등급
                  </span>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                      GOLD
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">500만원 이상</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-neutral-950">골드 등급</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">본격적인 추가할인 혜택</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>전 상품 <strong>3% 추가할인</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>구매금액 <strong>2% 적립금</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>생일 축하 5% 할인 쿠폰</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-medium text-neutral-400">
                    승급 기준: <strong>누적 500만원 이상</strong>
                  </p>
                </div>
              </div>

              {/* 4. PLATINUM */}
              <div className={`rounded-3xl p-5 transition-all flex flex-col justify-between border bg-white ${
                userGrade === "PLATINUM"
                  ? "border-2 border-neutral-950 shadow-lg ring-4 ring-neutral-200 relative"
                  : "border-neutral-200 hover:border-neutral-950 shadow-xs"
              }`}>
                {userGrade === "PLATINUM" && (
                  <span className="absolute -top-3 left-5 bg-neutral-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    현재 회원 등급
                  </span>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                      PLATINUM
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">1,000만원 이상</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-neutral-950">플래티넘 등급</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">상시 무료배송 지원</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>전 상품 <strong>5% 추가할인</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>구매금액 <strong>3% 적립금</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>전 주문 <strong>상시 무료배송</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-medium text-neutral-400">
                    승급 기준: <strong>누적 1,000만원 이상</strong>
                  </p>
                </div>
              </div>

              {/* 5. VVIP */}
              <div className={`rounded-3xl p-5 transition-all flex flex-col justify-between border bg-white ${
                userGrade === "VVIP"
                  ? "border-2 border-neutral-950 shadow-lg ring-4 ring-neutral-200 relative"
                  : "border-neutral-200 hover:border-neutral-950 shadow-xs"
              }`}>
                {userGrade === "VVIP" && (
                  <span className="absolute -top-3 left-5 bg-neutral-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    현재 회원 등급
                  </span>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
                      VVIP
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">2,000만원 이상</span>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-neutral-950">
                      VVIP 등급
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">최상위 프리미엄 혜택</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>전 상품 <strong>10% 추가할인</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>구매금액 <strong>5% 적립금</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span><strong>상시 무료배송 + 빠른 출고</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <p className="text-[10px] font-medium text-neutral-400">
                    승급 기준: <strong>누적 2,000만원 이상</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Tier Guide Note */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs space-y-2 text-xs text-neutral-600">
              <h4 className="font-extrabold text-sm text-neutral-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-900" />
                등급 산정 및 혜택 이용 안내
              </h4>
              <ul className="list-disc list-inside space-y-1 text-neutral-500 pl-1 leading-relaxed">
                <li>회원 등급은 최근 12개월간의 누적 실결제 금액을 기준으로 매월 1일 자동 갱신 및 반영됩니다.</li>
                <li>관리자(어드민) 페이지에서 고객 등급이 조정되는 경우 멤버십 페이지에 즉시 실시간으로 동기화됩니다.</li>
                <li>할인 혜택 및 적립금은 주문서 결제 시 중복 적용이 가능합니다.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 6: PROFILE */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
            <h3 className="text-xl font-bold tracking-tight text-neutral-950">회원 정보 관리</h3>
            <Card className="border border-neutral-200/80 bg-white rounded-3xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                <Avatar className="w-14 h-14 border-2 border-neutral-300">
                  <AvatarFallback className="bg-neutral-950 text-white font-extrabold text-base">
                    MY
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-neutral-950">{userName} 님</h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                        userGrade === "VVIP"
                          ? "bg-neutral-950 text-white border border-neutral-800"
                          : userGrade === "PLATINUM"
                          ? "bg-neutral-800 text-white border border-neutral-700"
                          : userGrade === "GOLD"
                          ? "bg-neutral-200 text-neutral-900 border border-neutral-300"
                          : userGrade === "SILVER"
                          ? "bg-neutral-100 text-neutral-800 border border-neutral-200"
                          : "bg-white text-neutral-600 border border-neutral-300"
                      }`}
                    >
                      {userGrade}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">{userEmail}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. Name */}
                <div className="py-1">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">이름</label>
                  <p className="text-sm font-extrabold text-neutral-950">{userName || "-"}</p>
                </div>

                {/* 2. Email */}
                <div className="py-1 border-t border-neutral-100">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">이메일 주소</label>
                  <p className="text-sm font-bold text-neutral-950 font-mono">{userEmail || "-"}</p>
                </div>

                {/* 3. Phone */}
                <div className="py-1 border-t border-neutral-100">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">연락처</label>
                  <p className="text-sm font-bold text-neutral-950 font-mono">{userPhone || "-"}</p>
                </div>

                {/* 4. Grade Info Card */}
                <div className="py-2.5 px-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-neutral-900 block">회원 등급 상태</span>
                    <span className="text-[11px] text-neutral-500">
                      현재 <strong>{userGrade}</strong> 등급 혜택이 적용 중입니다.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("tiers")}
                    className="text-xs font-bold text-neutral-900 underline hover:text-black cursor-pointer"
                  >
                    등급 혜택 보기 →
                  </button>
                </div>

                {/* 5. Delivery Address with Daum Postcode Open API */}
                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <div>
                    <label className="text-xs font-extrabold text-neutral-900 block">
                      📍 기본 배송지 주소
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={userPostcode}
                      readOnly
                      placeholder="우편번호"
                      className="w-32 rounded-xl font-mono text-xs font-extrabold bg-neutral-50 text-center"
                    />
                    <button
                      type="button"
                      onClick={handleOpenPostcode}
                      className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>우편번호 검색</span>
                    </button>
                  </div>

                  <Input
                    value={userAddress}
                    readOnly
                    onClick={handleOpenPostcode}
                    className="rounded-xl bg-neutral-50 cursor-pointer text-xs font-bold text-neutral-900"
                    placeholder="우편번호 검색 버튼을 눌러 기본 도로명 주소를 입력하세요"
                  />

                  <Input
                    value={userAddressDetail}
                    onChange={(e) => setUserAddressDetail(e.target.value)}
                    className="rounded-xl text-xs font-medium"
                    placeholder="상세 주소 (동/호수, 층수, 상세 위치 입력)"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl font-bold py-3.5 mt-4 cursor-pointer shadow-md text-xs"
              >
                배송지 정보 저장하기
              </Button>
            </Card>

            <Card className="border border-neutral-200/80 bg-white rounded-3xl p-6 shadow-sm">
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  회원 탈퇴 (Account Withdrawal)
                </h5>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  회원 탈퇴 시 보유 중인 적립금 포인트, 쿠폰 및 주문 내역 연결 정보가 즉시 삭제됩니다.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteAccount}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl font-bold py-3 text-xs transition-colors cursor-pointer mt-1"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  choicomma 회원 탈퇴하기
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Right Sidebar: Real-time Cart Summary */}
      <aside className="w-64 xl:w-72 border-l border-neutral-200/80 bg-white/80 backdrop-blur-md px-4 py-6 flex flex-col justify-between max-lg:hidden shrink-0 sticky top-0 h-screen z-30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black" />
            <h3 className="text-base font-extrabold tracking-tight">
              My Cart ({cart?.totalQuantity || 0})
            </h3>
          </div>
          <Link
            href="/shop"
            className="text-xs text-neutral-500 hover:text-black font-semibold underline"
          >
            쇼핑 계속하기
          </Link>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
            담긴 상품 목록 ({cart?.lines?.length || 0})
          </p>
          {cart?.lines && cart.lines.length > 0 ? (
            cart.lines.map((line) => (
              <div
                key={line.id}
                className="flex gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/60 shadow-2xs items-center"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
                  <Image
                    src={line.merchandise.product.featuredImage.url}
                    alt={line.merchandise.product.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate">
                    {line.merchandise.product.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {line.merchandise.title}
                  </p>
                  <p className="font-extrabold text-xs mt-1 text-black">
                    {formatPrice(
                      line.cost.totalAmount.amount,
                      line.cost.totalAmount.currencyCode
                    )}
                  </p>
                </div>
                {/* Quantity Controls */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    onClick={() => line.id && updateCartItem(line.id, "delete")}
                    className="text-neutral-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-1.5 py-0.5">
                    <button
                      onClick={() => line.id && updateCartItem(line.id, "minus")}
                      className="text-neutral-500 hover:text-black font-bold text-xs px-1 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-3 text-center">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => line.id && updateCartItem(line.id, "plus")}
                      className="text-neutral-500 hover:text-black font-bold text-xs px-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 px-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
              <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-500">
                장바구니가 비어 있습니다
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                원하는 상품을 담아보세요!
              </p>
            </div>
          )}
        </div>

        {/* Order Price & Checkout */}
        {(() => {
          const hasItems = cart?.lines && cart.lines.length > 0;
          const itemSubtotal = hasItems ? parseFloat(cart?.cost?.subtotalAmount?.amount || cart?.cost?.totalAmount?.amount || "0") : 0;
          const freeThresh = shippingPolicy.freeShippingThreshold !== undefined ? shippingPolicy.freeShippingThreshold : 100000;
          const baseFee = shippingPolicy.baseFee !== undefined ? shippingPolicy.baseFee : 3000;
          const currentShipFee = !hasItems || itemSubtotal === 0 || baseFee === 0 || (freeThresh > 0 && itemSubtotal >= freeThresh) ? 0 : baseFee;
          const grandTotal = itemSubtotal + currentShipFee;

          return (
            <div className="mt-auto space-y-3 bg-neutral-50 border border-neutral-200/80 p-4 rounded-2xl shadow-xs shrink-0">
              <div className="flex justify-between text-xs text-neutral-500 font-medium">
                <span>상품 금액</span>
                <span className="font-bold text-neutral-800">
                  {formatPrice(itemSubtotal, cart?.cost?.subtotalAmount?.currencyCode || "KRW")}
                </span>
              </div>
              <div className="flex justify-between text-xs text-neutral-500 font-medium">
                <span>배송비</span>
                <span className={currentShipFee === 0 ? "text-neutral-950 font-bold" : "font-bold text-neutral-800"}>
                  {currentShipFee === 0 ? "무료배송" : formatPrice(currentShipFee)}
                </span>
              </div>
              <Separator className="bg-neutral-200" />
              <div className="flex justify-between text-sm font-extrabold text-black">
                <span>총 결제예정금액</span>
                <span className="text-base font-black text-neutral-950">
                  {formatPrice(grandTotal, cart?.cost?.totalAmount?.currencyCode || "KRW")}
                </span>
              </div>

              <Link href="/checkout" className="block w-full pt-1">
                <Button
                  disabled={!hasItems}
                  className="w-full bg-black hover:bg-neutral-800 text-white rounded-xl font-bold py-3 text-xs flex items-center justify-between px-4 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>주문하기</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          );
        })()}
      </aside>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-neutral-500">페이지를 불러오는 중입니다...</div>}>
      <MembershipContent />
    </Suspense>
  );
}
