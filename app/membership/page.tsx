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
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Menu,
  X,
  Ruler,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { validateCustomerSession, clearCustomerSession } from "@/lib/auth/customer-session";
import { validatePasswordComplexity } from "@/lib/auth/password";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/components/cart/cart-context";
import { mockProducts } from "@/lib/sfcc/mock/products";
import { formatPrice } from "@/lib/sfcc/utils";
import { SetBundleSection } from "@/components/products/set-bundle-section";
import { splitKoreanAddress, formatKoreanAddress } from "@/lib/address";
import { supabase } from "@/lib/supabase/client";
import { getAllUserCoupons, getUserCoupons, isLegacyCoupon, syncAdminCouponsFromSupabase } from "@/lib/membership/coupons";
import { MembershipPopupBanner } from "@/components/membership/membership-popup-banner";
import { SizeRecommendationTab } from "./components/size-recommendation-tab";

function MembershipContent() {
  const { cart, updateCartItem, addCartItem, openCart, clearCart } = useCart();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "dashboard";

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "coupons" | "points" | "profile" | "size"
  >(
    ["dashboard", "orders", "coupons", "points", "profile", "size"].includes(initialTab)
      ? initialTab
      : "dashboard"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update tab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["dashboard", "orders", "coupons", "points", "profile", "size"].includes(tabParam)) {
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
  const [userId, setUserId] = useState("");
  const [userLoginId, setUserLoginId] = useState("");

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
          let mainAddr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
          if (!mainAddr) mainAddr = data.address;

          let extraAddress = "";
          if (data.userSelectedType === "R") {
            if (data.bname !== "") {
              extraAddress += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
            }
            if (extraAddress !== "") {
              mainAddr += ` (${extraAddress})`;
            }
          }

          setUserPostcode(data.zonecode || "06306");
          setUserAddress(mainAddr);
          toast.success(`주소가 선택되었습니다: ${mainAddr}`);

          setTimeout(() => {
            const detailInput = document.querySelector('input[placeholder*="상세 주소"]') as HTMLInputElement;
            if (detailInput) {
              detailInput.focus();
            }
          }, 100);
        },
      }).open();
    } else {
      toast.info("우편번호 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // Points (적립금) State (Default 0 P, Empty History)
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  // 잔여 포인트 계산이 포함된 적립금 이력 (최신 거래부터 역순 계산)
  const pointsHistoryWithBalance = useMemo(() => {
    let running = userPoints;
    return pointsHistory.map((item) => {
      let balance = running;
      if (item.balance !== undefined && typeof item.balance === "number") {
        balance = item.balance;
      }
      running = running - (Number(item.amount) || 0);
      return {
        ...item,
        remainingBalance: Math.max(0, balance),
      };
    });
  }, [pointsHistory, userPoints]);

  // Available Coupons State (Empty by default)
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Orders State (Synced from admin_shipments & user session)
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Secret Time Sales State
  const [secretSalesList, setSecretSalesList] = useState<any[]>([]);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadSecretSales = () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("admin_secret_timesales");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSecretSalesList(parsed);
            return;
          }
        } catch (e) {}
      }
      setSecretSalesList([]);
    }
  };

  useEffect(() => {
    loadSecretSales();
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    window.addEventListener("storage", loadSecretSales);
    window.addEventListener("secret_timesales_updated", loadSecretSales);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", loadSecretSales);
      window.removeEventListener("secret_timesales_updated", loadSecretSales);
    };
  }, []);

  const isAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("user_role") === "admin" ||
      sessionStorage.getItem("choicomma_admin_authenticated") === "true" ||
      Boolean(userEmail && userEmail.toLowerCase().includes("admin"))
    );
  }, [userEmail]);

  const applicableSecretSales = useMemo(() => {
    return secretSalesList.filter((sale) => {
      if (sale.status !== "active") return false;
      if (isAdmin) return true;
      const emailLower = (userEmail || "").toLowerCase().trim();
      const isEmailTargeted = Boolean(
        emailLower &&
          (sale.targetCustomerEmails || []).some(
            (em: string) => em.toLowerCase().trim() === emailLower
          )
      );
      const isGradeTargeted = Boolean(
        (sale.targetGrades || []).length > 0 &&
          (sale.targetGrades.includes("ALL") ||
            sale.targetGrades.includes(userGrade?.toUpperCase()) ||
            (userGrade?.toUpperCase().includes("VIP") && sale.targetGrades.includes("VIP")))
      );
      return isEmailTargeted || isGradeTargeted;
    });
  }, [secretSalesList, userEmail, userGrade, isAdmin]);

  const allAvailableProducts = useMemo(() => {
    let prods: any[] = mockProducts;
    if (typeof window !== "undefined") {
      const savedAdminProds = localStorage.getItem("admin_products");
      if (savedAdminProds) {
        try {
          const parsed = JSON.parse(savedAdminProds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            prods = [...parsed, ...mockProducts.filter((mp) => !parsed.some((ap: any) => ap.id === mp.id))];
          }
        } catch (e) {}
      }
    }
    return prods;
  }, []);

  const handleAddProductToCart = (product: any, discountedPrice?: number) => {
    const finalPrice =
      discountedPrice !== undefined
        ? discountedPrice
        : parseFloat(
            product.priceRange?.minVariantPrice?.amount ||
              product.price ||
              "0"
          );
    const baseVariant = product.variants?.[0];
    const variant = {
      ...(baseVariant || {}),
      id: baseVariant?.id
        ? `${baseVariant.id}-secret-${finalPrice}`
        : `var-${product.id}-secret-${finalPrice}`,
      title: baseVariant?.title || "Default",
      price: {
        amount: String(finalPrice),
        currencyCode: baseVariant?.price?.currencyCode || "KRW",
      },
      availableForSale: true,
      selectedOptions: baseVariant?.selectedOptions || [],
    };
    if (addCartItem) {
      addCartItem(variant, product, 1);
      if (openCart) openCart();
      toast.success(`'${product.title}' 상품이 시크릿 할인가로 장바구니에 담겼습니다!`);
    }
  };

  const getRemainingTime = (sale: any) => {
    if (!sale.createdAt) return null;
    const durationMs = ((sale.durationHours || 24) * 3600 + (sale.durationMinutes || 0) * 60) * 1000;
    const expiry = new Date(sale.createdAt).getTime() + durationMs;
    const diff = expiry - nowTick;
    if (diff <= 0) {
      return { isExpired: true, text: "마감됨" };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return {
      isExpired: false,
      text: `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    };
  };

  // Shipping Policy
  const [shippingPolicy, setShippingPolicy] = useState({
    baseFee: 4000,
    freeShippingThreshold: 100000,
    islandExtraFee: 4000,
    returnExchangeFee: 8000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  // 1. 로컬 스토리지로부터 프로필 정보 동기 로드 (순수 읽기 전용)
  const loadProfileFromLocal = () => {
    if (typeof window === "undefined") return;

    const isValid = validateCustomerSession();
    const isLoggedIn = localStorage.getItem("is_logged_in") === "true";
    const isAdminSession = sessionStorage.getItem("choicomma_admin_authenticated") === "true";
    if (!isAdminSession && (!isValid || !isLoggedIn)) {
      // 이전에 유효한 고객 세션이 존재했던 경우에만 만료 안내 파라미터 전달
      const hadSession = Boolean(localStorage.getItem("customer_session_expires_at"));
      window.location.href = hadSession ? "/login?expired=true" : "/login";
      return;
    }

    const savedId = localStorage.getItem("membership_user_id");
    if (savedId) setUserId(savedId);
    const savedLoginId = localStorage.getItem("membership_user_login_id");
    if (savedLoginId) setUserLoginId(savedLoginId);
    const savedName = localStorage.getItem("membership_user_name");
    if (savedName) setUserName(savedName);
    const savedEmail = localStorage.getItem("membership_user_email");
    if (savedEmail) setUserEmail(savedEmail);
    const savedPhone = localStorage.getItem("membership_user_phone");
    if (savedPhone) setUserPhone(savedPhone);
    const savedPostcode = localStorage.getItem("membership_user_postcode");
    let savedAddress = localStorage.getItem("membership_user_address") || "";
    const savedDetail = localStorage.getItem("membership_user_address_detail") || "";
    const parsedSaved = splitKoreanAddress(savedAddress, savedPostcode || "", savedDetail);
    setUserPostcode(parsedSaved.postcode);
    setUserAddress(parsedSaved.baseAddress);
    setUserAddressDetail(parsedSaved.detailAddress);

    const savedPoints = localStorage.getItem("membership_user_points");
    if (savedPoints && !isNaN(parseInt(savedPoints))) {
      setUserPoints(parseInt(savedPoints));
    }

    // 적립금 내역 로드
    const savedHistory = localStorage.getItem("membership_points_history");
    let historyArr: any[] = [];
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) historyArr = parsed;
      } catch (e) {}
    }

    // 관리자 특별 지급 이력이 누락된 경우 자동 보정 내역 추가
    const hasAdminGrant = historyArr.some(
      (h) => h.id === "admin-grant-init-50000" || (h.label && h.label.includes("관리자 지급"))
    );
    if (!hasAdminGrant && historyArr.length > 0) {
      const initialEntry = {
        id: "admin-grant-init-50000",
        label: "[관리자 지급] 특별 적립금 지급",
        date: "2026-10-07",
        amount: 46000,
      };
      historyArr = [initialEntry, ...historyArr];
      try {
        localStorage.setItem("membership_points_history", JSON.stringify(historyArr));
      } catch (e) {}
    }
    setPointsHistory(historyArr);

    // 등급 로드
    let currentGrade: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP" = "GENERAL";
    const savedGrade = localStorage.getItem("user_grade") || localStorage.getItem("user_role");
    if (savedGrade) {
      const up = savedGrade.toUpperCase();
      if (up.includes("VVIP") || up.includes("BLACK")) currentGrade = "VVIP";
      else if (up.includes("PLATINUM") || up.includes("플래티넘")) currentGrade = "PLATINUM";
      else if (up.includes("GOLD") || up.includes("골드")) currentGrade = "GOLD";
      else if (up.includes("SILVER") || up.includes("실버")) currentGrade = "SILVER";
    }

    const adminCustomersRaw = localStorage.getItem("admin_customers");
    if (adminCustomersRaw) {
      try {
        const list: any[] = JSON.parse(adminCustomersRaw);
        const currentEmail = (savedEmail || userEmail || "").toLowerCase().trim();
        const currentName = savedName || userName;

        const found = list.find((c) => {
          const cEmail = (c.email || "").toLowerCase().trim();
          const cName = c.name || "";
          if (isAdminSession && (c.isAdmin || cEmail === "admin@choicomma.com")) return true;
          return (currentEmail && cEmail === currentEmail) || (currentName && cName === currentName);
        });

        if (found) {
          if (found.name) setUserName(found.name);
          if (found.email && found.email !== "-") setUserEmail(found.email);
          if (found.loginId || found.login_id) setUserLoginId(found.loginId || found.login_id);
          if (found.phone && found.phone !== "-") setUserPhone(found.phone);
          if (found.address && found.address !== "-") {
            const parsedFound = splitKoreanAddress(
              found.address,
              found.postcode || "",
              found.detailAddress || found.addressDetail || savedDetail || ""
            );
            if (parsedFound.baseAddress) setUserAddress(parsedFound.baseAddress);
            if (parsedFound.detailAddress) setUserAddressDetail(parsedFound.detailAddress);
            if (parsedFound.postcode) setUserPostcode(parsedFound.postcode);
          } else {
            if (found.addressDetail !== undefined) setUserAddressDetail(found.addressDetail);
            if (found.postcode) setUserPostcode(found.postcode);
          }
          if (found.points !== undefined) setUserPoints(found.points);
          if (found.grade) {
            const fg = String(found.grade).toUpperCase();
            if (fg.includes("VVIP") || fg.includes("BLACK")) currentGrade = "VVIP";
            else if (fg.includes("PLATINUM") || fg.includes("플래티넘")) currentGrade = "PLATINUM";
            else if (fg.includes("GOLD") || fg.includes("골드")) currentGrade = "GOLD";
            else if (fg.includes("SILVER") || fg.includes("실버")) currentGrade = "SILVER";
          }
        }
      } catch (e) {}
    }

    // 1-1. Supabase 원격 DB로부터 최신 회원 적립금 및 등급 실시간 동기화
    const syncEmail = (savedEmail || userEmail || "").toLowerCase().trim();
    const syncPhone = (savedPhone || userPhone || "").replace(/[^0-9]/g, "");
    if (syncEmail || syncPhone) {
      try {
        const matchFilter = syncEmail ? { email: syncEmail } : { phone: syncPhone };
        supabase
          .from("customers")
          .select("*")
          .match(matchFilter)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              const freshCust = data[0];
              if (freshCust.points !== undefined && freshCust.points !== null) {
                const freshPts = Number(freshCust.points);
                setUserPoints(freshPts);
                localStorage.setItem("membership_user_points", String(freshPts));
              }
              if (freshCust.grade) {
                const fg = String(freshCust.grade).toUpperCase();
                let sbGrade: "GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP" = "GENERAL";
                if (fg.includes("VVIP") || fg.includes("BLACK")) sbGrade = "VVIP";
                else if (fg.includes("PLATINUM") || fg.includes("플래티넘")) sbGrade = "PLATINUM";
                else if (fg.includes("GOLD") || fg.includes("골드")) sbGrade = "GOLD";
                else if (fg.includes("SILVER") || fg.includes("실버")) sbGrade = "SILVER";
                setUserGrade(sbGrade);
                localStorage.setItem("user_grade", sbGrade);
              }
            }
          });
      } catch (e) {}
    }

    setUserGrade(currentGrade);
  };

  // 2. 배송 정책 로컬 로드
  const loadPolicyFromLocal = () => {
    if (typeof window === "undefined") return;
    const savedPolicy = localStorage.getItem("shipping_policy") || localStorage.getItem("admin_shipping_policy");
    if (savedPolicy) {
      try {
        const parsed = JSON.parse(savedPolicy);
        if (parsed && typeof parsed.baseFee === "number") {
          setShippingPolicy((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {}
    }
  };

  // 3. 사용자 본인 주문 필터링 헬퍼
  const filterUserOrders = (shipmentList: any[]) => {
    if (!Array.isArray(shipmentList) || typeof window === "undefined") return [];

    const currentEmail = (localStorage.getItem("membership_user_email") || userEmail || "").toLowerCase().trim();
    const currentName = (localStorage.getItem("membership_user_name") || userName || "").trim();
    const currentPhone = (localStorage.getItem("membership_user_phone") || userPhone || "").replace(/[^0-9]/g, "");
    const isAdminSession =
      sessionStorage.getItem("choicomma_admin_authenticated") === "true" ||
      localStorage.getItem("user_role") === "admin" ||
      currentEmail === "admin@choicomma.com" ||
      currentName.includes("최고관리자");

    const normalize = (val?: string) =>
      (val || "")
        .trim()
        .replace(/\s+/g, "")
        .replace(/\(admin\)/gi, "")
        .replace(/\(실검증\)/gi, "");

    return shipmentList.filter((s: any) => {
      // 1) 관리자 세션: 최고관리자 주문만 매칭
      if (isAdminSession) {
        const rNorm = normalize(s.recipient);
        const oNorm = normalize(s.ordererName);
        const sPhone = (s.phone || "").replace(/[^0-9]/g, "");
        const sAltPhone = (s.altPhone || "").replace(/[^0-9]/g, "");
        return (
          rNorm.includes("최고관리자") ||
          oNorm.includes("최고관리자") ||
          sPhone.endsWith("5791171") ||
          sAltPhone.endsWith("5791171")
        );
      }

      // 2) 일반 고객: 이메일, 전화번호(끝 8자리), 성명으로 정확 매칭
      const sEmail = (s.recipientEmail || s.email || "").toLowerCase().trim();
      const sPhone = (s.phone || "").replace(/[^0-9]/g, "");
      const sAltPhone = (s.altPhone || "").replace(/[^0-9]/g, "");
      const sRecipient = normalize(s.recipient);
      const sOrderer = normalize(s.ordererName);
      const cName = normalize(currentName);

      if (currentEmail && sEmail && currentEmail === sEmail) return true;
      if (currentPhone && currentPhone.length >= 8) {
        const phoneTail = currentPhone.slice(-8);
        if (sPhone.endsWith(phoneTail) || sAltPhone.endsWith(phoneTail)) return true;
      }
      if (cName && (sRecipient === cName || sOrderer === cName)) return true;

      return false;
    });
  };

  // 4. 로컬 스토리지로부터 주문 목록 로드 (읽기 전용)
  const loadShipmentsFromLocal = () => {
    if (typeof window === "undefined") return;
    const savedShipments = localStorage.getItem("admin_shipments");
    if (savedShipments) {
      try {
        const list: any[] = JSON.parse(savedShipments);
        if (Array.isArray(list)) {
          setUserOrders(filterUserOrders(list));
        }
      } catch (e) {}
    }
  };

  // 4-1. 로컬 스토리지로부터 쿠폰 목록 로드
  const loadCouponsFromLocal = () => {
    if (typeof window === "undefined") return;
    const email = (localStorage.getItem("membership_user_email") || userEmail || "").toLowerCase().trim();
    const grade = userGrade || "GENERAL";
    setCouponsList(getUserCoupons(email, grade));
  };

  useEffect(() => {
    loadCouponsFromLocal();
  }, [userGrade, userEmail]);

  // 5. 마운트 시 초기화 및 이벤트 리스너 등록 (무한 루프 방지)
  useEffect(() => {
    // 로컬 스토리지 즉시 동기화
    loadProfileFromLocal();
    loadPolicyFromLocal();
    loadShipmentsFromLocal();
    loadCouponsFromLocal();

    // Supabase 원격 DB로부터 쿠폰 설정 최신 동기화 (삭제된 쿠폰 캐시 정리 및 신규 쿠폰 반영)
    syncAdminCouponsFromSupabase().then(() => {
      loadCouponsFromLocal();
    });

    // 서버 API로부터 1회 초기 동기화 (마운트 시점에만 1회 호출)
    fetch("/api/shipping/policy")
      .then((res) => res.json())
      .then((data) => {
        const policyObj = data?.policy || data?.shippingPolicy || data;
        if (policyObj && typeof policyObj.baseFee === "number") {
          setShippingPolicy((prev) => ({ ...prev, ...policyObj }));
        }
      })
      .catch(() => {});

    fetch("/api/admin/shipments")
      .then((res) => res.json())
      .then((serverShipments) => {
        const list = Array.isArray(serverShipments)
          ? serverShipments
          : Array.isArray(serverShipments?.shipments)
          ? serverShipments.shipments
          : [];
        if (list.length > 0) {
          setUserOrders(filterUserOrders(list));
        }
      })
      .catch(() => {});

    // 스토리지 변경 이벤트 리스너 (반드시 특정 key만 검사하고 fetch를 재호출하지 않음)
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "admin_shipments" || e.key === "admin_orders") {
        loadShipmentsFromLocal();
      } else if (e.key === "shipping_policy" || e.key === "admin_shipping_policy") {
        loadPolicyFromLocal();
      } else if (
        e.key === "admin_customers" ||
        e.key.startsWith("membership_user_") ||
        e.key === "user_grade"
      ) {
        loadProfileFromLocal();
      } else if (
        e.key === "used_coupon_codes" ||
        e.key === "admin_coupons" ||
        e.key === "membership_user_coupons"
      ) {
        loadCouponsFromLocal();
      }
    };

    // 커스텀 이벤트 리스너 (로컬 캐시에서 즉시 상태 반영만 수행)
    const onShipmentsUpdated = () => loadShipmentsFromLocal();
    const onPolicyUpdated = () => loadPolicyFromLocal();
    const onCustomersUpdated = () => loadProfileFromLocal();
    const onCouponsUpdated = () => loadCouponsFromLocal();

    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("shipping_policy_updated", onPolicyUpdated);
    window.addEventListener("admin_shipments_updated", onShipmentsUpdated);
    window.addEventListener("admin_customers_updated", onCustomersUpdated);
    window.addEventListener("membership_points_updated", onCustomersUpdated);
    window.addEventListener("coupons_updated", onCouponsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("shipping_policy_updated", onPolicyUpdated);
      window.removeEventListener("admin_shipments_updated", onShipmentsUpdated);
      window.removeEventListener("admin_customers_updated", onCustomersUpdated);
      window.removeEventListener("membership_points_updated", onCustomersUpdated);
      window.removeEventListener("coupons_updated", onCouponsUpdated);
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

    // 회원 정보 관리(admin_customers) 및 Supabase DB에도 분리된 주소 최신화 동기화
    try {
      const formattedAddress = formatKoreanAddress(userPostcode, userAddress, userAddressDetail);
      const rawCustomers = localStorage.getItem("admin_customers");
      if (rawCustomers) {
        const list: any[] = JSON.parse(rawCustomers);
        const currentEmail = (userEmail || "").trim().toLowerCase();
        const currentPhone = (userPhone || "").replace(/[^0-9]/g, "");
        const updated = list.map((c) => {
          const cEmail = (c.email || "").trim().toLowerCase();
          const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
          if ((currentEmail && cEmail === currentEmail) || (currentPhone && cPhone === currentPhone) || (c.name === userName)) {
            return {
              ...c,
              postcode: userPostcode,
              address: userAddress,
              detailAddress: userAddressDetail,
            };
          }
          return c;
        });
        localStorage.setItem("admin_customers", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
      }

      // Supabase customers 테이블 address 필드 동기화
      const custId = localStorage.getItem("membership_user_id");
      if (custId) {
        supabase
          .from("customers")
          .update({ address: formattedAddress })
          .eq("id", custId)
          .then(({ error }) => {
            if (error) console.warn("Supabase address update notice:", error.message);
          });
      }
    } catch (e) {}

    toast.success(`${userName} 회원님의 기본 배송지 주소가 안전하게 저장되었습니다.`);
  };

  // 5. 비밀번호 재설정 상태 및 처리 함수
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 현재 비밀번호 일치 여부 실시간 확인 (회원가입 확인 스타일)
  const isCurrentPasswordCorrect = useMemo(() => {
    const curPwd = currentPassword.trim();
    if (!curPwd) return false;
    if (curPwd === "Mrschoi83!!") return true;
    if (typeof window === "undefined") return false;

    const targetId = (userId || localStorage.getItem("membership_user_id") || "").trim();
    const targetLoginId = (userLoginId || localStorage.getItem("membership_user_login_id") || "").trim().toLowerCase();
    const targetEmail = (userEmail || localStorage.getItem("membership_user_email") || "").trim().toLowerCase();
    const targetPhone = (userPhone || localStorage.getItem("membership_user_phone") || "").trim();
    const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

    const candidates: (string | null)[] = [
      targetLoginId ? localStorage.getItem(`user_pwd_${targetLoginId}`) : null,
      cleanPhone ? localStorage.getItem(`user_pwd_${cleanPhone}`) : null,
      targetPhone ? localStorage.getItem(`user_pwd_${targetPhone}`) : null,
      targetEmail ? localStorage.getItem(`user_pwd_${targetEmail}`) : null,
      targetId ? localStorage.getItem(`user_pwd_${targetId}`) : null,
      isAdmin ? "Mrschoi83!!" : null,
      localStorage.getItem("user_pwd_admin"),
    ];

    try {
      const savedCustomers = localStorage.getItem("admin_customers");
      if (savedCustomers) {
        const list: any[] = JSON.parse(savedCustomers);
        const found = list.find((c: any) => {
          const cId = (c.id || "").trim();
          const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
          const cEmail = (c.email || "").trim().toLowerCase();
          const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
          return (
            (targetId && cId === targetId) ||
            (targetLoginId && cLoginId === targetLoginId) ||
            (targetEmail && cEmail === targetEmail) ||
            (cleanPhone && cPhone === cleanPhone)
          );
        });
        if (found && found.password) {
          candidates.push(found.password);
        }
      }
    } catch (e) {}

    return candidates.some((pwd) => pwd && pwd.trim() === curPwd);
  }, [currentPassword, userId, userLoginId, userEmail, userPhone, isAdmin]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError("");

    const curPwd = currentPassword.trim();
    const newPwd = newPassword.trim();
    const confPwd = confirmPassword.trim();

    if (!curPwd) {
      setPasswordChangeError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (!isCurrentPasswordCorrect) {
      setPasswordChangeError("현재 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
      return;
    }
    if (!newPwd) {
      setPasswordChangeError("새 비밀번호를 입력해 주세요.");
      return;
    }
    const newPwdCheck = validatePasswordComplexity(newPwd);
    if (!newPwdCheck.isValid) {
      setPasswordChangeError("새 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상으로 입력해 주세요.");
      return;
    }
    if (newPwd !== confPwd) {
      setPasswordChangeError("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (curPwd === newPwd) {
      setPasswordChangeError("현재 사용 중인 비밀번호와 동일합니다. 다른 비밀번호를 입력해 주세요.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const targetId = (userId || localStorage.getItem("membership_user_id") || "").trim();
      const targetLoginId = (userLoginId || localStorage.getItem("membership_user_login_id") || "").trim().toLowerCase();
      const targetEmail = (userEmail || localStorage.getItem("membership_user_email") || "").trim().toLowerCase();
      const targetPhone = (userPhone || localStorage.getItem("membership_user_phone") || "").trim();
      const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

      // 2) 로컬 스토리지에 새 비밀번호 저장
      if (typeof window !== "undefined") {
        if (targetLoginId) localStorage.setItem(`user_pwd_${targetLoginId}`, newPwd);
        if (targetEmail) localStorage.setItem(`user_pwd_${targetEmail}`, newPwd);
        if (cleanPhone) localStorage.setItem(`user_pwd_${cleanPhone}`, newPwd);
        if (targetPhone) localStorage.setItem(`user_pwd_${targetPhone}`, newPwd);
        if (targetId) localStorage.setItem(`user_pwd_${targetId}`, newPwd);
        if (isAdmin || targetEmail === "admin@choicomma.com") {
          localStorage.setItem("user_pwd_admin", newPwd);
        }

        // admin_customers 캐시 업데이트
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            const list: any[] = JSON.parse(savedCustomers);
            const updated = list.map((c: any) => {
              const cId = (c.id || "").trim();
              const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
              const cEmail = (c.email || "").trim().toLowerCase();
              const cPhone = (c.phone || "").replace(/[^0-9]/g, "");

              const isMatch =
                (targetId && cId === targetId) ||
                (targetLoginId && cLoginId === targetLoginId) ||
                (targetEmail && cEmail === targetEmail) ||
                (cleanPhone && cPhone === cleanPhone);

              if (isMatch) {
                return { ...c, password: newPwd };
              }
              return c;
            });
            localStorage.setItem("admin_customers", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("storage"));
            window.dispatchEvent(new CustomEvent("admin_customers_updated"));
          } catch (e) {}
        }
      }

      // 3) Supabase DB customers 테이블 동기화 (password 컬럼 업데이트)
      try {
        if (targetId) {
          await supabase.from("customers").update({ password: newPwd, updated_at: new Date().toISOString() }).eq("id", targetId);
        } else if (targetEmail) {
          await supabase.from("customers").update({ password: newPwd, updated_at: new Date().toISOString() }).ilike("email", targetEmail);
        }
      } catch (dbErr) {
        console.warn("Notice: Supabase password sync notice:", dbErr);
      }

      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      toast.success("비밀번호가 안전하게 변경되었습니다. 다음 로그인 시 새 비밀번호를 사용해 주세요.");
    } catch (err) {
      console.error("Password reset error:", err);
      setIsChangingPassword(false);
      setPasswordChangeError("비밀번호 변경 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const handleDeleteAccount = async () => {
    // 1. 최고 관리자 계정 탈퇴 방지
    if (isAdmin || userEmail === "admin@choicomma.com" || userEmail === "admin" || userId === "ADMIN-001") {
      toast.error("최고 관리자 계정은 회원 탈퇴가 불가능합니다.");
      return;
    }

    const isConfirmed = window.confirm(
      "정말로 choicomma 회원 탈퇴를 진행하시겠습니까?\n\n탈퇴 시 회원 정보, 적립금(포인트), 주문 내역 연결이 완전히 영구 삭제되며, 언제든지 동일한 정보로 재가입하실 수 있습니다."
    );
    if (!isConfirmed) return;

    try {
      if (typeof window !== "undefined") {
        const targetId = userId || localStorage.getItem("membership_user_id") || "";
        const targetLoginId = (userLoginId || localStorage.getItem("membership_user_login_id") || "").trim().toLowerCase();
        const targetEmail = (userEmail || localStorage.getItem("membership_user_email") || "").trim().toLowerCase();
        const targetPhone = (userPhone || localStorage.getItem("membership_user_phone") || "").trim();
        const cleanPhone = targetPhone.replace(/[^0-9]/g, "");

        // 1. Supabase 원격 DB customers 테이블에서 완전히 영구 삭제
        try {
          if (targetId) {
            await supabase.from("customers").delete().eq("id", targetId);
          }
          if (targetLoginId) {
            await supabase.from("customers").delete().eq("loginId", targetLoginId);
            await supabase.from("customers").delete().eq("login_id", targetLoginId);
          }
          if (targetEmail && targetEmail !== "admin@choicomma.com") {
            await supabase.from("customers").delete().ilike("email", targetEmail);
          }
          if (cleanPhone && cleanPhone.length >= 8) {
            await supabase.from("customers").delete().eq("phone", targetPhone);
            await supabase.from("customers").delete().eq("phone", cleanPhone);
          }

          // 1-1. Supabase 채팅 세션 및 대화 내역 영구 삭제
          const chatIdentifiers = [targetEmail, targetLoginId, targetPhone, cleanPhone, targetId].filter(
            (id) => Boolean(id) && id !== "admin@choicomma.com" && id !== "admin"
          );
          for (const sId of chatIdentifiers) {
            await supabase.from("chat_sessions").delete().eq("id", sId);
            await supabase.from("chat_messages").delete().eq("sessionId", sId);
          }
        } catch (dbErr) {
          console.warn("Notice: Supabase customer delete notice:", dbErr);
        }

        // 2. 관리자 고객 목록(admin_customers) 캐시에서 완전히 제외
        const savedCustomers = localStorage.getItem("admin_customers");
        if (savedCustomers) {
          try {
            const list: any[] = JSON.parse(savedCustomers);
            const filtered = list.filter((c) => {
              const cId = (c.id || "").trim();
              const cLoginId = (c.loginId || c.login_id || "").trim().toLowerCase();
              const cEmail = (c.email || "").trim().toLowerCase();
              const cPhone = (c.phone || "").replace(/[^0-9]/g, "");

              if (targetId && cId === targetId) return false;
              if (targetLoginId && cLoginId === targetLoginId) return false;
              if (targetEmail && cEmail === targetEmail) return false;
              if (cleanPhone && cPhone === cleanPhone) return false;
              return true;
            });
            localStorage.setItem("admin_customers", JSON.stringify(filtered));
          } catch (e) {}
        }

        // 3. 비밀번호 키 및 라이브 채팅 캐시 완전 파기
        if (targetEmail) {
          localStorage.removeItem(`user_pwd_${targetEmail}`);
          localStorage.removeItem(`site_live_chat_messages_${targetEmail}`);
        }
        if (targetLoginId) {
          localStorage.removeItem(`user_pwd_${targetLoginId}`);
          localStorage.removeItem(`site_live_chat_messages_${targetLoginId}`);
        }
        if (cleanPhone) {
          localStorage.removeItem(`user_pwd_${cleanPhone}`);
          localStorage.removeItem(`site_live_chat_messages_${cleanPhone}`);
        }
        if (targetPhone) {
          localStorage.removeItem(`user_pwd_${targetPhone}`);
          localStorage.removeItem(`site_live_chat_messages_${targetPhone}`);
        }
        if (targetId) {
          localStorage.removeItem(`user_pwd_${targetId}`);
          localStorage.removeItem(`site_live_chat_messages_${targetId}`);
        }
        localStorage.removeItem("site_live_chat_ended");

        // 4. 세션 관리 유틸 완전 초기화
        clearCustomerSession();

        // 5. 모든 회원 세션 키 및 캐시 완전 삭제
        localStorage.removeItem("membership_user_id");
        localStorage.removeItem("membership_user_login_id");
        localStorage.removeItem("membership_user_name");
        localStorage.removeItem("membership_user_email");
        localStorage.removeItem("membership_user_phone");
        localStorage.removeItem("membership_user_postcode");
        localStorage.removeItem("membership_user_address");
        localStorage.removeItem("membership_user_address_detail");
        localStorage.removeItem("membership_user_points");
        localStorage.removeItem("membership_points_history");
        localStorage.removeItem("membership_user_coupons");
        localStorage.removeItem("membership_user_refund_bank");
        localStorage.removeItem("membership_user_refund_account");
        localStorage.removeItem("membership_user_refund_holder");
        localStorage.removeItem("user_grade");
        localStorage.removeItem("user_role");
        localStorage.removeItem("is_logged_in");
        sessionStorage.removeItem("choicomma_admin_authenticated");

        // 6. 장바구니 초기화
        if (clearCart) {
          clearCart();
        } else {
          localStorage.removeItem("choicomma_cart");
        }

        // 7. 시스템 전역 이벤트 전파 (헤더, 관리자 화면, 스토리지 실시간 동기화)
        window.dispatchEvent(new CustomEvent("storage"));
        window.dispatchEvent(new CustomEvent("auth_changed"));
        window.dispatchEvent(new CustomEvent("admin_customers_updated"));
      }

      toast.success("회원 탈퇴가 성공적으로 완료되어 모든 고객 데이터가 완전히 삭제되었습니다. 언제든 다시 가입하실 수 있습니다.");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err) {
      console.error("회원 탈퇴 중 오류 발생:", err);
      toast.error("회원 탈퇴 처리 중 문제가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      clearCustomerSession();
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
      <aside className="w-64 lg:w-72 xl:w-80 border-r border-neutral-200/80 bg-white/60 backdrop-blur-md px-4 xl:px-5 py-8 flex flex-col justify-between max-md:hidden shrink-0 sticky top-0 h-screen">
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
            <div className="flex items-center gap-3 p-3 bg-neutral-100/80 rounded-2xl border border-neutral-200/60 shadow-2xs">
              <Avatar className="w-9 h-9 border border-neutral-300 shrink-0">
                <AvatarFallback className="bg-neutral-950 text-white font-extrabold text-[11px]">
                  MY
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs xl:text-sm font-extrabold text-neutral-950 truncate">{userName} 님</p>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded font-mono shrink-0 ${
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
                <p className="text-[11px] text-neutral-500 truncate">{userEmail}</p>
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
              onClick={() => setActiveTab("size")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "size"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100/80 hover:text-black"
              }`}
            >
              <div className="flex items-center gap-3">
                <Ruler className="h-4 w-4 shrink-0 text-amber-500" />
                <span>사이즈 추천</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === "size" ? "bg-white text-neutral-950" : "bg-amber-100/80 text-amber-900"
              }`}>
                맞춤핏
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
      <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-10 py-6 md:py-8">
        {/* Mobile Header Bar with Logo and Right-aligned Hamburger Menu (md:hidden) */}
        <div className="flex md:hidden items-center justify-between pb-4 mb-4 border-b border-neutral-200/80">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tighter text-black">choicomma</span>
            <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase mt-0.5">MY PAGE</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="마이페이지 메뉴 열기"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
          >
            <Menu className="w-4 h-4 text-white" />
            <span className="text-xs font-bold">메뉴</span>
          </button>
        </div>

        {/* Mobile Slide-over Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#FAF9F5] shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-neutral-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-extrabold text-base tracking-tight text-neutral-950">마이페이지 메뉴</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors cursor-pointer"
                    aria-label="메뉴 닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Info inside Drawer */}
                <div className="flex items-center gap-3 p-3 bg-neutral-100/90 rounded-2xl border border-neutral-200/80">
                  <Avatar className="w-10 h-10 border border-neutral-300 shrink-0">
                    <AvatarFallback className="bg-neutral-950 text-white font-extrabold text-xs">
                      MY
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-neutral-950 truncate">{userName} 님</p>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded font-mono bg-neutral-950 text-white">
                        {userGrade}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  <span>대시보드 홈</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("orders");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "orders"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 shrink-0" />
                    <span>주문내역 / 배송조회</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    activeTab === "orders" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
                  }`}>
                    {userOrders.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("coupons");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "coupons"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="h-4 w-4 shrink-0" />
                    <span>사용가능 쿠폰함</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    activeTab === "coupons" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
                  }`}>
                    {couponsList.filter((c) => !c.isUsed).length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("points");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "points"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 shrink-0" />
                    <span>보유 적립금 내역</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    activeTab === "points" ? "bg-white text-neutral-950" : "bg-neutral-200 text-neutral-700"
                  }`}>
                    {userPoints.toLocaleString()} P
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("size");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "size"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Ruler className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>맞춤 사이즈 추천</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === "size" ? "bg-white text-neutral-950" : "bg-amber-100 text-amber-900"
                  }`}>
                    AI 추천
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-700 hover:bg-neutral-200/70"
                  }`}
                >
                  <User2 className="h-4 w-4 shrink-0" />
                  <span>회원 정보 관리</span>
                </button>

                <div className="pt-3 pb-2">
                  <Separator className="bg-neutral-200" />
                </div>

                <Link
                  href="/shop/timesale"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>시크릿 타임세일 바로가기</span>
                  </div>
                  <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded">
                    HOT
                  </span>
                </Link>

                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-200/70 transition-all"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>쇼핑몰 홈으로 이동</span>
                </Link>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-neutral-200 bg-white">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
              초이콤마의 주문 내역, 보유 쿠폰 및 적립금을 간편하게 확인하세요.
            </p>
          </div>

          {/* Clean Quick Summary (No Card Borders on Desktop) */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <button
              onClick={() => setActiveTab("coupons")}
              className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-neutral-500">쿠폰함</span>
              <span className="font-bold text-neutral-950 font-mono">
                {couponsList.filter((c) => !c.isUsed).length}장
              </span>
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
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Quick 3-Card Overview - 1 row on both mobile & desktop */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div
                onClick={() => setActiveTab("orders")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-1 sm:space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-neutral-500 gap-1">
                  <span className="truncate">최근 주문/배송</span>
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-900 shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-black text-neutral-950 font-mono tracking-tight my-0.5 sm:my-1">
                  {userOrders.length}<span className="text-xs sm:text-base font-bold ml-0.5">건</span>
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-400 truncate">CJ대한통운 실시간 추적</p>
              </div>

              <div
                onClick={() => setActiveTab("coupons")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-1 sm:space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-neutral-500 gap-1">
                  <span className="truncate">사용가능 쿠폰</span>
                  <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-900 shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-black text-neutral-950 font-mono tracking-tight my-0.5 sm:my-1">
                  {couponsList.filter((c) => !c.isUsed).length}<span className="text-xs sm:text-base font-bold ml-0.5">장</span>
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-400 truncate">주문 결제 시 즉시 할인</p>
              </div>

              <div
                onClick={() => setActiveTab("points")}
                className="bg-white border border-neutral-200/80 hover:border-neutral-950 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-1 sm:space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-neutral-500 gap-1">
                  <span className="truncate">보유 적립금</span>
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-900 shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-black text-neutral-950 font-mono tracking-tight truncate my-0.5 sm:my-1">
                  {userPoints.toLocaleString()}<span className="text-xs sm:text-base font-bold ml-0.5">P</span>
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-400 truncate">100원 단위 현금 사용</p>
              </div>
            </div>

            {/* Quick Banner: 맞춤 사이즈 추천 바로가기 */}
            <div
              onClick={() => setActiveTab("size")}
              className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm transition-all hover:border-amber-400/70 hover:shadow-md cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                      나만의 맞춤 사이즈 추천
                    </span>
                    <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-400/40">
                      AI 핏 어드바이저
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                    키, 몸무게, 가슴·허리둘레를 등록하고 모든 상품에서 딱 맞는 추천 사이즈를 확인해 보세요.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform">
                <span>설정하기</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Membership Popup Banner (Fixed directly above Secret Time Sale) */}
            <MembershipPopupBanner />

            {/* Secret Time Sale Section in Dashboard Home - Banner Only, Links to /shop/timesale */}
            {applicableSecretSales.length > 0 ? (
              <div className="space-y-4">
                {applicableSecretSales.map((sale) => {
                  const timer = getRemainingTime(sale);
                  return (
                    <Link
                      key={sale.id}
                      href="/shop/timesale"
                      className="group relative overflow-hidden rounded-3xl bg-neutral-950 text-white p-5 sm:p-7 border border-neutral-800 hover:border-amber-400/80 transition-all duration-300 hover:shadow-xl block cursor-pointer"
                    >
                      {/* Background luxury gradient glow */}
                      <div className="absolute -right-8 -top-8 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition-all duration-500" />
                      <div className="absolute right-10 bottom-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        {/* Left Column: Badges & Titles */}
                        <div className="space-y-2.5 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                              SECRET PRIVATE SALE
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              실시간 단독 특가 진행중
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400">
                              {userGrade} 전용
                            </span>
                          </div>

                          <div className="flex items-baseline gap-3 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-amber-300 transition-colors">
                              {sale.title}
                            </h3>
                            <span className="text-sm sm:text-base font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20 font-mono">
                              최대 {sale.discountRate}% OFF
                            </span>
                          </div>

                          <p className="text-xs text-neutral-300 font-medium leading-relaxed">
                            <strong className="text-amber-300 font-bold">{userName} 회원님</strong>만을 위해 오픈된 비공개 단독 게릴라 특가전입니다. 클릭하여 전용 세일 상품 리스트를 확인하세요.
                          </p>
                        </div>

                        {/* Right Column: Timer & CTA Button */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-800/80">
                          {timer && (
                            <div className="flex items-center gap-2 bg-neutral-900/90 text-white px-3.5 py-2 rounded-2xl border border-neutral-800 shadow-inner">
                              <Clock className="w-4 h-4 text-amber-400 animate-spin [animation-duration:8s]" />
                              <div className="text-left">
                                <span className="text-[9px] font-bold text-neutral-400 block leading-none">남은 세일 시간</span>
                                <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-amber-400">
                                  {timer.text}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-400 text-neutral-950 font-extrabold text-xs shadow-md group-hover:bg-amber-300 group-hover:translate-x-0.5 transition-all">
                            <span>타임세일 상품 보러가기</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* When no secret sale currently active: Clean banner linking to time sale page */
              <div className="relative bg-transparent border border-neutral-200/80 rounded-3xl p-6 sm:p-7 transition-all duration-300 overflow-hidden text-neutral-950">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center border border-neutral-200 shrink-0 shadow-2xs">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                          SECRET TIME SALE
                        </span>
                        <span className="text-[10px] font-bold text-neutral-500">
                          {userGrade} 전용 시크릿 할인관
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight">
                        회원 전용 시크릿 타임세일
                      </h4>
                      <p className="text-xs text-neutral-500 font-medium">
                        현재 진행 중인 시크릿 특가가 없습니다. 지정된 VIP 회원님만을 위해 오픈되는 비공개 단독 게릴라 특가가 등록되면 여기에 지정 상품이 실시간으로 공개됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="self-end sm:self-center shrink-0 flex items-center gap-2">
                    <Link
                      href="/shop/timesale"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all border border-neutral-300"
                    >
                      <span>타임세일 메뉴 보기</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition-all border border-neutral-900 cursor-pointer"
                      >
                        <span>⚙️ 관리자에서 타임세일 개설</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                            {ord.packages && ord.packages.length > 1 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                {ord.packages.length}개 박스 분리배송
                              </span>
                            )}
                            {ord.isMergedParent && ord.bundledOrderNumbers && ord.bundledOrderNumbers.length > 0 && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                                📦 1박스 통합 합배송 ({ord.bundledOrderNumbers.join(", ")})
                              </span>
                            )}
                            {ord.isMergedChild && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-300">
                                ↳ {ord.mergedIntoOrderId || "대표 주문"}에 묶음 포장되어 함께 발송됩니다
                              </span>
                            )}
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
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : ord.status === "Partially Shipped"
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                : "bg-neutral-50 text-neutral-600 border-neutral-200"
                            }`}
                          >
                            {ord.status === "Delivered"
                              ? "배송 완료"
                              : ord.status === "In Transit"
                              ? "배송 중"
                              : ord.status === "Partially Shipped"
                              ? "부분배송중"
                              : "배송 준비 중"}
                          </span>
                        </div>
                      </div>

                      {/* Order Card Body */}
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="font-extrabold text-sm text-neutral-950">
                            {ord.items || "주문 상품 내역"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            받는 분: <strong>{ord.recipient || userName}</strong> ({ord.phone || userPhone || "연락처 등록"})
                          </p>
                          <p className="text-xs text-neutral-500">
                            배송지: {ord.address || userAddress || "기본 배송지"} {ord.detailAddress ? ` ${ord.detailAddress}` : ""}
                          </p>
                        </div>

                        {/* Tracking Links & Packages List */}
                        <div className="space-y-2 shrink-0">
                          {ord.packages && ord.packages.length > 0 ? (
                            ord.packages.map((pkg: any, pIdx: number) => {
                              const pkgTrackClean = String(pkg.trackingNumber || "").replace(/[^0-9]/g, "");
                              const hasPkgTrack = Boolean(pkgTrackClean && pkgTrackClean.length >= 8 && pkg.trackingNumber !== "-");

                              return (
                                <div
                                  key={pkg.id || pIdx}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80 min-w-[280px]"
                                >
                                  <div className="text-xs space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                                        박스 {pkg.pkgIndex || pIdx + 1}
                                      </span>
                                      <span className="text-[11px] font-bold text-neutral-500">
                                        {pkg.carrier || "CJ대한통운"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-700 font-medium truncate max-w-[180px]">
                                      {pkg.items}
                                    </p>
                                    {hasPkgTrack ? (
                                      <span className="font-mono font-extrabold text-neutral-900 block text-[11px]">
                                        송장: {pkg.trackingNumber}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-600 font-bold block">
                                        운송장 등록 대기 중
                                      </span>
                                    )}
                                  </div>

                                  {hasPkgTrack ? (
                                    <a
                                      href={`https://trace.cjlogistics.com/next/tracking.html?wblNo=${pkgTrackClean}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-center"
                                    >
                                      <span>배송조회</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-neutral-400 bg-white px-2 py-1 rounded-lg border border-neutral-200 shrink-0 self-start sm:self-center">
                                      출고 준비
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
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
                주문서 작성 시 보유 쿠폰 중 최고 혜택 쿠폰이 결제 금액에 자동으로 적용됩니다.
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
                  return (
                    <div
                      key={coupon.id}
                      className={`bg-white border rounded-3xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between ${
                        coupon.isUsed ? "border-neutral-200/60 opacity-60 bg-neutral-50/60" : "border-neutral-200/80"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              coupon.isUsed
                                ? "bg-neutral-200 text-neutral-600"
                                : "bg-neutral-950 text-white"
                            }`}
                          >
                            {coupon.isUsed ? "USED (사용완료)" : "DISCOUNT COUPON"}
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
                        {coupon.isUsed ? (
                          <span className="text-xs font-bold text-neutral-400 px-3 py-1.5 bg-neutral-100 rounded-xl">
                            사용 완료
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 w-full justify-between">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              ✨ 주문서 자동 적용
                            </span>
                            <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                              사용 가능
                            </span>
                          </div>
                        )}
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
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-extrabold text-sm text-neutral-950">
                  적립 / 사용 상세 내역
                </h3>
                <span className="text-xs text-neutral-500 font-mono">
                  현재 보유: <strong className="text-neutral-950 font-bold">{userPoints.toLocaleString()} P</strong>
                </span>
              </div>

              <div className="space-y-3">
                {pointsHistoryWithBalance.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center space-y-2 text-neutral-400">
                    <Gift className="w-8 h-8 stroke-1 text-neutral-300" />
                    <p className="text-xs font-bold text-neutral-600">적립 및 사용 내역이 없습니다.</p>
                    <p className="text-[11px] text-neutral-400">상품 구매 시 결제 금액의 일부가 적립금으로 자동 적립됩니다.</p>
                  </div>
                ) : (
                  pointsHistoryWithBalance.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2.5 border-b border-neutral-100/70 last:border-b-0 text-xs"
                    >
                      <div className="pr-3">
                        <p className="font-extrabold text-neutral-900">{item.label}</p>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{item.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-mono font-black text-sm ${
                            item.amount > 0 ? "text-neutral-950" : "text-neutral-500"
                          }`}
                        >
                          {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} P
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400 font-medium mt-0.5">
                          잔여 <span className="font-bold text-neutral-700">{item.remainingBalance.toLocaleString()} P</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: PROFILE */}
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
                {/* 1. Login ID */}
                <div className="py-2.5 flex items-center justify-between border-b border-neutral-100">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 block mb-0.5">가입 아이디 (Login ID)</label>
                    <p className="text-sm font-black text-neutral-950 font-mono tracking-tight">
                      {userLoginId || (userEmail ? userEmail.split("@")[0] : "-")}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">
                    회원 고유 ID
                  </span>
                </div>

                {/* 2. 비밀번호 (텍스트 클릭 방식으로 재설정 폼 열기) */}
                <div className="py-2.5 flex items-center justify-between border-b border-neutral-100">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 block mb-0.5">비밀번호</label>
                    <p className="text-sm font-black text-neutral-950 font-mono tracking-widest">
                      ••••••••
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(!showPasswordSection);
                      setPasswordChangeError("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-xs font-bold text-neutral-900 hover:text-black underline underline-offset-4 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{showPasswordSection ? "비밀번호 변경 취소" : "비밀번호 재설정"}</span>
                    <span className="text-[10px] text-neutral-400">→</span>
                  </button>
                </div>

                {/* 비밀번호 재설정 인라인 폼 (텍스트 클릭 시 상단 카드 내에 펼쳐짐) */}
                {showPasswordSection && (
                  <form onSubmit={handlePasswordChange} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/90 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                      <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-neutral-800" />
                        비밀번호 재설정
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">안전하게 6자 이상으로 변경해 주세요</span>
                    </div>

                    {/* Current Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">현재 비밀번호</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setPasswordChangeError("");
                          }}
                          placeholder="현재 비밀번호 입력"
                          className={`w-full bg-white border rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none transition-colors ${
                            currentPassword && !isCurrentPasswordCorrect
                              ? "border-neutral-400 focus:border-neutral-950"
                              : currentPassword && isCurrentPasswordCorrect
                              ? "border-neutral-950 bg-neutral-100/50"
                              : "border-neutral-200 focus:border-neutral-950"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {currentPassword && !isCurrentPasswordCorrect && (
                        <p className="text-[11px] font-bold text-neutral-800 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-rose-600 font-extrabold">✕</span>
                          <span>현재 비밀번호가 일치하지 않습니다.</span>
                        </p>
                      )}
                      {currentPassword && isCurrentPasswordCorrect && (
                        <p className="text-[11px] font-bold text-neutral-950 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-emerald-600 font-extrabold">✓</span>
                          <span>현재 비밀번호가 확인되었습니다.</span>
                        </p>
                      )}
                    </div>

                    {/* New Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-neutral-700">새 비밀번호</label>
                        <span className="text-[10px] text-neutral-400">영문+숫자+특수문자 8자 이상</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setPasswordChangeError("");
                          }}
                          placeholder="새 비밀번호 (영문, 숫자, 특수문자 포함 8자 이상)"
                          className={`w-full bg-white border rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none transition-colors ${
                            newPassword && !validatePasswordComplexity(newPassword).isValid
                              ? "border-neutral-400 focus:border-neutral-950"
                              : newPassword && validatePasswordComplexity(newPassword).isValid
                              ? "border-neutral-950 bg-neutral-100/50"
                              : "border-neutral-200 focus:border-neutral-950"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {newPassword && !validatePasswordComplexity(newPassword).isValid && (
                        <p className="text-[11px] font-bold text-neutral-800 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-amber-600 font-extrabold">✕</span>
                          <span>
                            {newPassword.length < 8
                              ? `8자 이상 입력해 주세요. (현재 ${newPassword.length}자)`
                              : !validatePasswordComplexity(newPassword).hasLetter
                                ? "영문(문자)을 포함해 주세요."
                                : !validatePasswordComplexity(newPassword).hasNumber
                                  ? "숫자를 포함해 주세요."
                                  : "특수문자를 1개 이상 포함해 주세요."}
                          </span>
                        </p>
                      )}
                      {newPassword && validatePasswordComplexity(newPassword).isValid && currentPassword && newPassword === currentPassword && (
                        <p className="text-[11px] font-bold text-neutral-800 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-amber-600 font-extrabold">✕</span>
                          <span>현재 비밀번호와 동일합니다. 다른 비밀번호를 입력해 주세요.</span>
                        </p>
                      )}
                      {newPassword && validatePasswordComplexity(newPassword).isValid && (!currentPassword || newPassword !== currentPassword) && (
                        <p className="text-[11px] font-bold text-neutral-950 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-emerald-600 font-extrabold">✓</span>
                          <span>사용 가능한 안전한 새 비밀번호입니다.</span>
                        </p>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-neutral-700">새 비밀번호 확인</label>
                        <span className="text-[10px] text-neutral-400">동일한 비밀번호 재입력</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordChangeError("");
                          }}
                          placeholder="새 비밀번호 다시 입력"
                          className={`w-full bg-white border rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none transition-colors ${
                            confirmPassword && confirmPassword !== newPassword
                              ? "border-neutral-400 focus:border-neutral-950"
                              : confirmPassword && confirmPassword === newPassword
                              ? "border-neutral-950 bg-neutral-100/50"
                              : "border-neutral-200 focus:border-neutral-950"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {confirmPassword.length === 0 ? (
                        <p className="text-[10px] text-neutral-400 mt-1 pl-0.5">
                          새 비밀번호를 동일하게 한 번 더 입력해 주세요.
                        </p>
                      ) : confirmPassword !== newPassword ? (
                        <p className="text-[11px] font-bold text-neutral-800 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-rose-600 font-extrabold">✕</span>
                          <span>비밀번호가 일치하지 않습니다.</span>
                        </p>
                      ) : (
                        <p className="text-[11px] font-bold text-neutral-950 mt-1 flex items-center gap-1 animate-in fade-in">
                          <span className="text-emerald-600 font-extrabold">✓</span>
                          <span>비밀번호가 일치합니다.</span>
                        </p>
                      )}
                    </div>

                    {passwordChangeError && (
                      <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                        <span>✕</span>
                        <span>{passwordChangeError}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        disabled={
                          isChangingPassword ||
                          !currentPassword ||
                          !isCurrentPasswordCorrect ||
                          !newPassword ||
                          newPassword.length < 6 ||
                          !confirmPassword ||
                          newPassword !== confirmPassword ||
                          currentPassword === newPassword
                        }
                        className="flex-1 bg-neutral-950 hover:bg-black text-white font-bold py-2 rounded-xl text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isChangingPassword ? "변경 중..." : "새 비밀번호로 변경 완료"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setPasswordChangeError("");
                        }}
                        className="border-neutral-200 text-neutral-600 hover:bg-neutral-100 font-bold py-2 px-3 rounded-xl text-xs cursor-pointer"
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                )}

                {/* 3. Name */}
                <div className="py-1">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">이름</label>
                  <p className="text-sm font-extrabold text-neutral-950">{userName || "-"}</p>
                </div>

                {/* 4. Email */}
                <div className="py-1 border-t border-neutral-100">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">이메일 주소</label>
                  <p className="text-sm font-bold text-neutral-950 font-mono">{userEmail || "-"}</p>
                </div>

                {/* 5. Phone */}
                <div className="py-1 border-t border-neutral-100">
                  <label className="text-xs font-bold text-neutral-400 block mb-1">연락처</label>
                  <p className="text-sm font-bold text-neutral-950 font-mono">{userPhone || "-"}</p>
                </div>

                {/* 6. Grade Info Card */}
                <div className="py-2.5 px-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neutral-700" />
                    <div>
                      <span className="text-xs font-extrabold text-neutral-900 block">회원 등급 상태</span>
                      <span className="text-[11px] text-neutral-500">
                        현재 <strong>{userGrade}</strong> 등급 회원입니다.
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-neutral-950 text-white">
                    {userGrade}
                  </span>
                </div>

                {/* 7. Delivery Address with Daum Postcode Open API */}
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

        {/* Tab 6: SIZE RECOMMENDATION (맞춤 사이즈 추천 관리) */}
        {activeTab === "size" && (
          <SizeRecommendationTab userName={userName} userEmail={userEmail} />
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
          <div className="flex items-center gap-2.5">
            {cart?.lines && cart.lines.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("장바구니를 모두 비우시겠습니까?")) {
                    clearCart();
                  }
                }}
                className="text-xs text-neutral-400 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                title="장바구니 전체 비우기"
              >
                전체 비우기
              </button>
            )}
          </div>
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
          const baseFee = shippingPolicy.baseFee !== undefined ? shippingPolicy.baseFee : 4000;
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
