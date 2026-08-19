"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Crown,
  Clock,
  CheckCircle2,
  Truck,
  ExternalLink,
  Image as ImageIcon,
  X,
  Upload,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-context";
import { mockProducts } from "@/lib/sfcc/mock/products";
import { formatPrice } from "@/lib/sfcc/utils";
import { QuickOptionModal } from "@/components/products/quick-option-modal";
import { SetBundleSection } from "@/components/products/set-bundle-section";
import { CartItem } from "@/lib/sfcc/types";

export default function MembershipPage() {
  const { cart, updateCartItem, addCartItem } = useCart();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "wishlist" | "profile" | "support"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // User Profile State (Synced with localStorage)
  const [userName, setUserName] = useState("최상위");
  const [userEmail, setUserEmail] = useState("vip@choicomma.com");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [inquiryImages, setInquiryImages] = useState<string[]>([]);
  const [inquiryType, setInquiryType] = useState("");
  const [inquiryContent, setInquiryContent] = useState("");
  const [userInquiries, setUserInquiries] = useState<any[]>([]);

  useEffect(() => {
    const loadInquiries = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("admin_customer_inquiries");
        if (saved) {
          try {
            setUserInquiries(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    loadInquiries();
    window.addEventListener("storage", loadInquiries);
    const interval = setInterval(loadInquiries, 2000);
    return () => {
      window.removeEventListener("storage", loadInquiries);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("membership_user_email");
      const isAdminAuth = sessionStorage.getItem("choicomma_admin_authenticated");
      if (savedEmail === "admin" || savedEmail === "admin@choicomma.com" || isAdminAuth === "true") {
        toast.error("관리자 계정은 마이페이지에 접근할 수 없습니다. 관리자 페이지로 이동합니다.");
        window.location.href = "/admin";
        return;
      }
    }

    const savedName = localStorage.getItem("membership_user_name");
    if (savedName) setUserName(savedName);
    const savedEmail = localStorage.getItem("membership_user_email");
    if (savedEmail) setUserEmail(savedEmail);
    const savedPhone = localStorage.getItem("membership_user_phone");
    if (savedPhone) setUserPhone(savedPhone);
    const savedAddress = localStorage.getItem("membership_user_address");
    if (savedAddress) setUserAddress(savedAddress);
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("membership_user_name", userName);
    localStorage.setItem("membership_user_email", userEmail);
    localStorage.setItem("membership_user_phone", userPhone);
    localStorage.setItem("membership_user_address", userAddress);
    toast.success(`${userName} 회원님의 정보가 성공적으로 수정되었습니다.`);
  };

  const handleDeleteAccount = () => {
    const isConfirmed = window.confirm(
      "정말로 choicomma 회원 탈퇴를 진행하시겠습니까?\n\n탈퇴 시 회원 정보, 적립금(포인트), 주문 내역 연결이 삭제되며 복구할 수 없습니다."
    );
    if (!isConfirmed) return;

    if (typeof window !== "undefined") {
      localStorage.removeItem("membership_user_name");
      localStorage.removeItem("membership_user_email");
      localStorage.removeItem("membership_user_phone");
      localStorage.removeItem("membership_user_address");

      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        try {
          const list: any[] = JSON.parse(savedCustomers);
          const filtered = list.filter(
            (c) =>
              (c.email && userEmail && c.email.toLowerCase() === userEmail.toLowerCase()) ||
              (c.name && userName && c.name === userName)
                ? false
                : true
          );
          localStorage.setItem("admin_customers", JSON.stringify(filtered));
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent("storage"));
      window.dispatchEvent(new CustomEvent("admin_customers_updated"));
    }

    toast.success("회원 탈퇴가 성공적으로 완료되었습니다. 그동안 choicomma를 이용해 주셔서 감사합니다.");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  const [nowTick, setNowTick] = useState(Date.now());
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [itemExpiries, setItemExpiries] = useState<Record<string, number>>({});
  const [timeSaleDiscount, setTimeSaleDiscount] = useState("35");
  const [timeSaleTitle, setTimeSaleTitle] = useState("VIP 회원만을 위해 준비된 파격 할인 한정 단독 시크릿 타임세일");
  const [timeSaleStatus, setTimeSaleStatus] = useState("active");
  const [timeSaleCategory, setTimeSaleCategory] = useState("all");
  const [timeSaleProductIds, setTimeSaleProductIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_products");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return mockProducts;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTimeSaleProducts = useMemo(() => {
    if (!Array.isArray(timeSaleProductIds) || timeSaleProductIds.length === 0) {
      return [];
    }
    return allProducts.filter((p) => timeSaleProductIds.includes(p.id));
  }, [allProducts, timeSaleProductIds]);

  useEffect(() => {
    const loadSettings = () => {
      const savedExpiry = localStorage.getItem("secret_timesale_expiry_timestamp");
      if (savedExpiry) {
        const ts = parseInt(savedExpiry);
        if (!isNaN(ts)) setExpiryTimestamp(ts);
      } else {
        const savedSeconds = localStorage.getItem("secret_timesale_seconds");
        const sec = savedSeconds ? parseInt(savedSeconds) : 259200;
        setExpiryTimestamp(Date.now() + sec * 1000);
      }

      const savedItemExpiries = localStorage.getItem("secret_timesale_item_expiries");
      if (savedItemExpiries) {
        try {
          const parsed = JSON.parse(savedItemExpiries);
          if (parsed && typeof parsed === "object") setItemExpiries(parsed);
        } catch (e) {}
      }

      const savedDiscount = localStorage.getItem("secret_timesale_discount");
      if (savedDiscount) setTimeSaleDiscount(savedDiscount);
      const savedTitle = localStorage.getItem("secret_timesale_title");
      if (savedTitle) setTimeSaleTitle(savedTitle);
      const savedStatus = localStorage.getItem("secret_timesale_status");
      if (savedStatus) setTimeSaleStatus(savedStatus);
      const savedCat = localStorage.getItem("secret_timesale_category");
      if (savedCat) setTimeSaleCategory(savedCat);
      const savedProductIds = localStorage.getItem("secret_timesale_product_ids");
      if (savedProductIds) {
        try {
          const parsed = JSON.parse(savedProductIds);
          if (Array.isArray(parsed)) {
            setTimeSaleProductIds(parsed);
          } else {
            setTimeSaleProductIds([]);
          }
        } catch (e) {
          setTimeSaleProductIds([]);
        }
      } else {
        setTimeSaleProductIds([]);
      }

      const savedAdminProducts = localStorage.getItem("admin_products");
      if (savedAdminProducts) {
        try {
          const parsed = JSON.parse(savedAdminProducts);
          if (Array.isArray(parsed)) setAllProducts(parsed);
        } catch (e) {}
      }
    };

    loadSettings();

    const handleStorageChange = () => {
      loadSettings();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const liveTimeLeft = useMemo(() => {
    const targetTs = expiryTimestamp || (Date.now() + 259200 * 1000);
    const diffMs = Math.max(0, targetTs - nowTick);
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { hours, minutes, seconds };
  }, [expiryTimestamp, nowTick]);

  // Mock Orders Data
  const orderHistory = [
    {
      id: "ORD-20260801-0982",
      date: "2026.08.01",
      status: "배송 중",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      items: [
        {
          name: "코스탈 워시드 트위드 베스트",
          option: "Size: L / Color: Ivory",
          price: 499000,
          quantity: 1,
          image: mockProducts[0]?.featuredImage?.url,
        },
      ],
      total: 499000,
      trackingNumber: "CJ5892049102KR",
    },
    {
      id: "ORD-20260725-0412",
      date: "2026.07.25",
      status: "배송 완료",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      items: [
        {
          name: "베르데 레더 라운지 체어",
          option: "Color: Olive Green",
          price: 1850000,
          quantity: 1,
          image: mockProducts[1]?.featuredImage?.url,
        },
      ],
      total: 1850000,
      trackingNumber: "CJ1092837461KR",
    },
  ];

  // Wishlist items
  const wishlistItems = mockProducts.slice(0, 3);

  // Filtered popular collection
  const popularCollection = mockProducts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: (typeof mockProducts)[0]) => {
    if (product.variants && product.variants.length > 0) {
      addCartItem(product.variants[0], product);
      toast.success(`${product.title}이(가) 장바구니에 담겼습니다.`);
    } else {
      toast.info("상품 옵션을 선택해 주세요.");
    }
  };

  const handleLogout = () => {
    toast.info("성공적으로 로그아웃되었습니다.");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F5] text-neutral-900 font-sans items-start">
      {/* Left Sidebar - Slimmer for maximum central space */}
      <aside className="w-48 xl:w-52 border-r border-neutral-200/80 bg-white/60 backdrop-blur-md px-3.5 xl:px-4 py-8 flex flex-col justify-between max-md:hidden shrink-0 sticky top-0 h-screen">
        <div>
          {/* Brand Logo Header */}
          <div className="mb-6 pl-1">
            <Link href="/" className="inline-block">
              <span className="font-extrabold text-xl xl:text-2xl tracking-tighter text-black">
                choicomma
              </span>
              <span className="block text-[9px] tracking-widest text-neutral-400 font-medium uppercase mt-0.5">
                VIP Membership
              </span>
            </Link>
          </div>

          {/* User Card & Logout (Moved ABOVE Dashboard) */}
          <div className="space-y-2 mb-6 pb-4 border-b border-neutral-200/80">
            <div className="flex items-center gap-2.5 p-2 bg-neutral-100/80 rounded-xl border border-neutral-200/60 shadow-2xs">
              <Avatar className="w-8 h-8 border border-neutral-300">
                <AvatarFallback className="bg-black text-white font-extrabold text-[10px]">
                  VIP
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{userName} VIP 회원님</p>
                <p className="text-[10px] text-neutral-500 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs xl:text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <Home className="h-4 w-4 shrink-0" />
              대시보드
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs xl:text-sm font-semibold transition-all ${
                activeTab === "profile"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <User2 className="h-4 w-4 shrink-0" />
              회원 정보 관리
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area - Maximized width for central screen */}
      <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-10 py-8">
        {/* Header bar */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-200/60">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-neutral-900 text-white hover:bg-neutral-900 border-neutral-800 font-bold px-3 py-1 rounded-md text-xs gap-1.5">
                <Crown className="w-3.5 h-3.5 fill-white text-white" />
                GOLD MEMBER
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight">
              반갑습니다, {userName} VIP 회원님!
            </h1>
            <p className="text-base text-neutral-500 mt-1">
              choicomma 만의 프리미엄 혜택과 맞춤 쇼핑 서비스를 경험해 보세요.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                className="pl-11 pr-4 py-2.5 bg-white rounded-xl border-neutral-200 text-sm placeholder:text-neutral-400 focus-visible:ring-black"
                placeholder="관심 상품 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              className="rounded-xl border-neutral-200 bg-white hover:bg-neutral-100 relative shrink-0 w-11 h-11 cursor-pointer"
              onClick={() => {
                const answered = userInquiries.filter((i) => i.status === "답변완료" || (i.adminReply && i.adminReply.trim().length > 0));
                if (answered.length > 0) {
                  toast.success(`🔔 [1:1 VIP 문의 답변 도착] ${answered.length}건의 문의에 관리자 답변이 등록되었습니다!`, {
                    description: "Support 탭에서 관리자의 피드백 내용을 바로 확인하실 수 있습니다."
                  });
                  setActiveTab("support");
                } else {
                  toast.info("새로운 알림이 없습니다. 1:1 VIP 문의에 답변이 도착하면 알림이 생성됩니다.");
                }
              }}
            >
              <Bell className="h-5 w-5 text-neutral-800" />
              {userInquiries.some((i) => i.status === "답변완료" || (i.adminReply && i.adminReply.trim().length > 0)) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                  {userInquiries.filter((i) => i.status === "답변완료" || (i.adminReply && i.adminReply.trim().length > 0)).length}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Tab Content 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Set Bundle Special Sale Section */}
            <SetBundleSection products={popularCollection} />
          </div>
        )}

        {/* Tab Content 4: PROFILE */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-bold tracking-tight">회원 정보 관리</h3>
            <Card className="border border-neutral-200/80 bg-white rounded-3xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                <Avatar className="w-16 h-16 border-2 border-neutral-300">
                  <AvatarFallback className="bg-black text-white font-extrabold text-lg">
                    VIP
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-lg">{userName} VIP 회원님</h4>
                  <p className="text-xs text-neutral-500">
                    choicomma Platinum Club Member
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1.5">
                    이름
                  </label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="rounded-xl font-bold"
                    placeholder="이름 입력"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1.5">
                    이메일 주소
                  </label>
                  <Input
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="rounded-xl"
                    placeholder="이메일 입력"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1.5">
                    연락처
                  </label>
                  <Input
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="rounded-xl"
                    placeholder="연락처 입력"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1.5">
                    기본 배송지
                  </label>
                  <Input
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                    className="rounded-xl"
                    placeholder="배송지 입력"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-black text-white hover:bg-neutral-800 rounded-xl font-bold py-3 mt-4"
              >
                변경사항 저장
              </Button>

              <div className="pt-6 border-t border-neutral-100 space-y-2 mt-6">
                <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  회원 탈퇴 (Account Withdrawal)
                </h5>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  회원 탈퇴 시 보유 중인 회원 등급, 적립금 포인트, 쿠폰 및 개인 배송지 정보가 즉시 삭제됩니다.
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

      {/* Right Sidebar: Real-time Cart Summary (Sticky Fixed with Bottom Order Card) */}
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

        {/* Cart Items List - Scrollable Above */}
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
                    className="text-neutral-400 hover:text-rose-500 p-0.5"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-1.5 py-0.5">
                    <button
                      onClick={() => line.id && updateCartItem(line.id, "minus")}
                      className="text-neutral-500 hover:text-black font-bold text-xs px-1"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-3 text-center">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => line.id && updateCartItem(line.id, "plus")}
                      className="text-neutral-500 hover:text-black font-bold text-xs px-1"
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

        {/* Order Price & Checkout - Fixed at the BOTTOM (하단 고정) */}
        <div className="mt-auto space-y-3 bg-neutral-50 border border-neutral-200/80 p-4 rounded-2xl shadow-xs shrink-0">
          <div className="flex justify-between text-xs text-neutral-500 font-medium">
            <span>상품 금액</span>
            <span className="font-bold text-neutral-800">
              {formatPrice(
                cart?.cost.subtotalAmount.amount || "0",
                cart?.cost.subtotalAmount.currencyCode || "KRW"
              )}
            </span>
          </div>
          <div className="flex justify-between text-xs text-neutral-500 font-medium">
            <span>배송비</span>
            <span className="text-emerald-600 font-bold">무료배송</span>
          </div>
          <Separator className="bg-neutral-200" />
          <div className="flex justify-between text-sm font-extrabold text-black">
            <span>총 결제금액</span>
            <span className="text-base font-black text-rose-600">
              {formatPrice(
                cart?.cost.totalAmount.amount || "0",
                cart?.cost.totalAmount.currencyCode || "KRW"
              )}
            </span>
          </div>

          <Link href="/checkout" className="block w-full pt-1">
            <Button
              disabled={!cart || cart.lines.length === 0}
              className="w-full bg-black hover:bg-neutral-800 text-white rounded-xl font-bold py-3 text-xs flex items-center justify-between px-4 shadow-md transition-all disabled:opacity-50"
            >
              <span>주문하기</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </aside>
    </div>
  );
}
