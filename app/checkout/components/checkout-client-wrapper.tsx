"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Lock,
  CreditCard,
  Truck,
  CheckCircle2,
  ChevronRight,
  ArrowRightLeft,
  Zap,
  Ticket,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/sfcc/utils";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { translateProductTitle, getCurrentLanguage } from "@/lib/i18n/translation";
import { generateNextOrderId } from "@/lib/shipping/order-id";
import { splitKoreanAddress } from "@/lib/address";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  normalizeUserGrade,
  getTierPointRate,
  DEFAULT_TIER_POLICIES,
} from "@/lib/membership/tiers";
import {
  AvailableCoupon,
  DEFAULT_AVAILABLE_COUPONS,
  getAvailableCoupons,
} from "@/lib/membership/coupons";

export default function CheckoutClientWrapper() {
  const router = useRouter();
  const { cart } = useCart();
  const [isTossModalOpen, setIsTossModalOpen] = useState(false);
  const [isDirectPayLoading, setIsDirectPayLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState("ko");

  useEffect(() => {
    setCurrentLang(getCurrentLanguage());
    const handleLangChange = () => setCurrentLang(getCurrentLanguage());
    window.addEventListener("language_changed", handleLangChange);
    return () => window.removeEventListener("language_changed", handleLangChange);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    // Orderer
    ordererName: "",
    ordererEmail: "",
    ordererPhone: "",
    // Shipping
    recipientName: "",
    recipientPhone: "",
    postcode: "06123",
    address: "",
    addressDetail: "",
    deliveryMemo: "문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)",
    customDeliveryMemo: "",
    // Refund Account (환불 계좌)
    refundBank: "국민은행",
    refundAccountNumber: "",
    refundAccountHolder: "",
    // Payment Method: CARD | EASY_PAY | VIRTUAL_ACCOUNT | TRANSFER | MOBILE_PHONE
    paymentMethod: "CARD",
  });


  // Sync Member Profile from 회원 정보 관리 & 세션 (admin_customers / membership_user_*)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("membership_user_name") || "";
      const savedEmail = localStorage.getItem("membership_user_email") || "";
      const savedPhone = localStorage.getItem("membership_user_phone") || "";
      const savedPostcode = localStorage.getItem("membership_user_postcode") || "";
      const savedAddress = localStorage.getItem("membership_user_address") || "";
      const savedDetail = localStorage.getItem("membership_user_address_detail") || "";
      const savedRefundBank = localStorage.getItem("membership_user_refund_bank") || "국민은행";
      const savedRefundAccount = localStorage.getItem("membership_user_refund_account") || "";
      const savedRefundHolder = localStorage.getItem("membership_user_refund_holder") || savedName;

      // 회원 정보 관리(admin_customers)에서 최신 등록된 회원 정보 조회
      const adminCustomersRaw = localStorage.getItem("admin_customers");
      let matchedCust: any = null;
      if (adminCustomersRaw) {
        try {
          const list: any[] = JSON.parse(adminCustomersRaw);
          const currentEmail = (savedEmail || "").toLowerCase().trim();
          const currentPhone = (savedPhone || "").replace(/[^0-9]/g, "");
          matchedCust = list.find((c) => {
            const cEmail = (c.email || "").toLowerCase().trim();
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            return (
              (currentEmail && cEmail === currentEmail) ||
              (currentPhone && currentPhone.length >= 8 && cPhone === currentPhone) ||
              (savedName && c.name === savedName)
            );
          });
        } catch (e) {}
      }

      let finalName = matchedCust?.name || savedName || "고객님";
      let finalEmail = matchedCust?.email || savedEmail || "customer@choicomma.com";
      let finalPhone = matchedCust?.phone || savedPhone || "010-1234-5678";
      let rawTargetAddress = matchedCust?.address || savedAddress || "서울특별시 강남구 테헤란로 123";
      let rawFallbackPostcode = matchedCust?.postcode || savedPostcode || "06306";
      let rawFallbackDetail = matchedCust?.detailAddress || matchedCust?.addressDetail || savedDetail || "";

      // 지능형 한국 주소 파서를 통한 우편번호/기본주소/상세주소 완벽 분리
      const parsed = splitKoreanAddress(rawTargetAddress, rawFallbackPostcode, rawFallbackDetail);
      let finalPostcode = parsed.postcode || rawFallbackPostcode || "06306";
      let finalAddress = parsed.baseAddress || "서울특별시 강남구 테헤란로 123";
      let finalDetail = parsed.detailAddress || rawFallbackDetail || "";

      // 만약 분리 후에도 상세주소가 비어있고 localStorage에 저장된 savedDetail이 있다면 보정
      if (!finalDetail && savedDetail) {
        finalDetail = savedDetail;
        if (finalAddress.endsWith(savedDetail)) {
          finalAddress = finalAddress.slice(0, -savedDetail.length).trim();
        }
      }

      setFormData((prev) => ({
        ...prev,
        ordererName: prev.ordererName || finalName,
        ordererEmail: prev.ordererEmail || finalEmail,
        ordererPhone: prev.ordererPhone || finalPhone,
        recipientName: prev.recipientName || finalName,
        recipientPhone: prev.recipientPhone || finalPhone,
        postcode: prev.postcode && prev.postcode !== "06123" && prev.postcode !== "06306" ? prev.postcode : finalPostcode,
        address: finalAddress,
        addressDetail: finalDetail,
        refundBank: prev.refundBank || savedRefundBank,
        refundAccountNumber: prev.refundAccountNumber || savedRefundAccount,
        refundAccountHolder: prev.refundAccountHolder || savedRefundHolder,
      }));
    }
  }, []);

  // Coupon / Discount State
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>("");
  const [isDirectCouponInput, setIsDirectCouponInput] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // 주문서 진입 시 보유 쿠폰을 자동으로 불러와 최고 할인 혜택 쿠폰을 기본 '자동 적용'
  useEffect(() => {
    if (typeof window === "undefined") return;

    const list = getAvailableCoupons();
    setAvailableCoupons(list);

    if (list.length > 0) {
      // 할인 금액이 가장 큰 쿠폰을 우선 정렬하여 최우선 쿠폰 자동 선택
      const sorted = [...list].sort((a, b) => b.discountAmount - a.discountAmount);
      const bestCoupon = sorted[0];

      setSelectedCouponCode(bestCoupon.code);
      setCouponCode(bestCoupon.code);
      setAppliedDiscount(bestCoupon.discountAmount);
      setCouponMessage(`✨ [자동 적용] ${bestCoupon.title}이 자동 적용되었습니다! (-${bestCoupon.discountAmount.toLocaleString()}원)`);
    } else {
      setSelectedCouponCode("NONE");
      setCouponCode("");
      setAppliedDiscount(0);
      setCouponMessage(null);
    }
  }, []);

  const handleSelectCoupon = (code: string) => {
    setSelectedCouponCode(code);

    if (code === "NONE") {
      setIsDirectCouponInput(false);
      setCouponCode("");
      setAppliedDiscount(0);
      setCouponMessage("쿠폰 적용이 취소되었습니다.");
      return;
    }

    if (code === "DIRECT") {
      setIsDirectCouponInput(true);
      setCouponCode("");
      setAppliedDiscount(0);
      setCouponMessage(null);
      return;
    }

    setIsDirectCouponInput(false);
    const found = availableCoupons.find((c) => c.code === code);
    if (found) {
      setCouponCode(found.code);
      setAppliedDiscount(found.discountAmount);
      setCouponMessage(`🎉 ${found.title}이 선택 적용되었습니다! (-${found.discountAmount.toLocaleString()}원)`);
    }
  };

  // Terms Agreement
  const [agreedTerms, setAgreedTerms] = useState({
    all: true,
    privacy: true,
    thirdParty: true,
    paymentService: true,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyCoupon = () => {
    const cleanedCode = couponCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanedCode) return;

    // Check if this coupon has already been used by the user
    const usedCouponsRaw = localStorage.getItem("used_coupon_codes") || "[]";
    let usedCoupons: string[] = [];
    try {
      usedCoupons = JSON.parse(usedCouponsRaw);
    } catch (e) { }

    if (usedCoupons.includes(cleanedCode)) {
      setCouponMessage("⚠️ 이미 사용 완료된 1회용 쿠폰 코드입니다. 다른 쿠폰을 입력해 주세요.");
      setAppliedDiscount(0);
      return;
    }

    // 10,000 KRW Discount
    if (cleanedCode === "CC26-X8K9-10KRW" || cleanedCode === "CHOI10" || cleanedCode === "VIP") {
      setAppliedDiscount(10000);
      setCouponMessage("🎉 10,000원 스페셜 할인 쿠폰이 정상 적용되었습니다! (-10,000원)");
    }
    // 5,000 KRW Welcome Discount
    else if (cleanedCode === "CC26-W9L4-5KRW" || cleanedCode === "WELCOME") {
      setAppliedDiscount(5000);
      setCouponMessage("🎉 5,000원 웰컴 첫 구매 할인 쿠폰이 정상 적용되었습니다! (-5,000원)");
    }
    // Free Shipping Voucher
    else if (cleanedCode === "CC26-FREE-S8P2" || cleanedCode === "FREESHIP") {
      const freeAmount = shippingPolicy.baseFee || 4000;
      setAppliedDiscount(freeAmount);
      setCouponMessage(`🎉 무료 배송 지원 쿠폰이 정상 적용되었습니다! (-${freeAmount.toLocaleString()}원)`);
    }
    else {
      setCouponMessage("❌ 유효하지 않은 쿠폰 코드입니다. 마이페이지 [쿠폰함]의 코드를 복사하여 입력해 주세요.");
      setAppliedDiscount(0);
    }
  };

  // Dynamic Shipping Policy State
  const [shippingPolicy, setShippingPolicy] = useState({
    baseFee: 4000,
    freeShippingThreshold: 100000,
    islandExtraFee: 4000,
    returnExchangeFee: 8000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  // Rewards Points (적립금) State
  const [availablePoints, setAvailablePoints] = useState(5000);
  const [usedPointsInput, setUsedPointsInput] = useState("");
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);

  // Customer Tier & Point Rate State
  const [userGrade, setUserGrade] = useState<"GENERAL" | "SILVER" | "GOLD" | "PLATINUM" | "VVIP">("GENERAL");
  const [pointRate, setPointRate] = useState<number>(1);

  // 회원 등급 및 적립금 포인트 실시간 동기화 (localStorage 및 Supabase DB 연동)
  useEffect(() => {
    let isMounted = true;

    const syncMemberGradeAndPoints = async () => {
      if (typeof window === "undefined") return;

      const currentEmail = (formData.ordererEmail || localStorage.getItem("membership_user_email") || "").toLowerCase().trim();
      const currentPhone = (formData.ordererPhone || localStorage.getItem("membership_user_phone") || "").replace(/[^0-9]/g, "");
      const currentName = (formData.ordererName || localStorage.getItem("membership_user_name") || "").trim();

      let determinedGrade: string = localStorage.getItem("user_grade") || localStorage.getItem("membership_user_grade") || "";
      let foundPoints: number | null = null;

      const savedPoints = localStorage.getItem("membership_user_points");
      if (savedPoints !== null && !isNaN(parseInt(savedPoints))) {
        foundPoints = parseInt(savedPoints);
      }

      // 회원 정보 관리(admin_customers) 목록 매칭
      const adminCustomersRaw = localStorage.getItem("admin_customers");
      if (adminCustomersRaw) {
        try {
          const list: any[] = JSON.parse(adminCustomersRaw);
          const matched = list.find((c: any) => {
            const cEmail = (c.email || "").toLowerCase().trim();
            const cPhone = (c.phone || "").replace(/[^0-9]/g, "");
            const cName = (c.name || "").trim();
            return (
              (currentEmail && cEmail === currentEmail) ||
              (currentPhone && currentPhone.length >= 8 && cPhone === currentPhone) ||
              (currentName && cName === currentName)
            );
          });
          if (matched) {
            if (matched.grade) determinedGrade = matched.grade;
            if (matched.points !== undefined && !isNaN(Number(matched.points))) {
              foundPoints = Number(matched.points);
            }
          }
        } catch (e) {}
      }

      // Supabase DB customers 실시간 조회 (DB에 최신 등급/적립금이 있는 경우)
      if (currentEmail || currentPhone) {
        try {
          let query = supabase.from("customers").select("grade, points, email, phone");
          if (currentEmail) {
            query = query.eq("email", currentEmail);
          } else if (currentPhone) {
            query = query.eq("phone", currentPhone);
          }
          const { data, error } = await query;
          if (!error && data && data.length > 0 && isMounted) {
            const sbCust = data[0];
            if (sbCust.grade) determinedGrade = sbCust.grade;
            if (sbCust.points !== undefined && !isNaN(Number(sbCust.points))) {
              foundPoints = Number(sbCust.points);
            }
          }
        } catch (e) {}
      }

      if (!isMounted) return;

      const finalGrade = normalizeUserGrade(determinedGrade);
      const rate = getTierPointRate(finalGrade);
      setUserGrade(finalGrade);
      setPointRate(rate);

      if (foundPoints !== null && !isNaN(foundPoints)) {
        setAvailablePoints(foundPoints);
      }
    };

    syncMemberGradeAndPoints();

    const handleStorageUpdate = () => {
      syncMemberGradeAndPoints();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("admin_customers_updated", handleStorageUpdate);
    window.addEventListener("membership_points_updated", handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("admin_customers_updated", handleStorageUpdate);
      window.removeEventListener("membership_points_updated", handleStorageUpdate);
    };
  }, [formData.ordererEmail, formData.ordererPhone, formData.ordererName]);

  useEffect(() => {
    const updateShippingPolicy = () => {
      if (typeof window !== "undefined") {
        const savedPolicy = localStorage.getItem("shipping_policy") || localStorage.getItem("admin_shipping_policy");
        if (savedPolicy) {
          try {
            setShippingPolicy(JSON.parse(savedPolicy));
          } catch (e) { }
        }
      }
    };
    updateShippingPolicy();

    // Fetch authoritative policy from server API
    fetch("/api/shipping/policy")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.baseFee === "number") {
          setShippingPolicy((prev) => ({ ...prev, ...data }));
          localStorage.setItem("shipping_policy", JSON.stringify(data));
        }
      })
      .catch(() => {});

    window.addEventListener("storage", updateShippingPolicy);
    window.addEventListener("shipping_policy_updated", updateShippingPolicy);
    return () => {
      window.removeEventListener("storage", updateShippingPolicy);
      window.removeEventListener("shipping_policy_updated", updateShippingPolicy);
    };
  }, []);

  const totalItemAmount = Number(cart?.cost?.totalAmount?.amount || 0);
  const freeThreshold = shippingPolicy.freeShippingThreshold !== undefined ? shippingPolicy.freeShippingThreshold : 100000;
  const baseShippingFee = shippingPolicy.baseFee !== undefined ? shippingPolicy.baseFee : 4000;

  // 실 상품 결제 대상 금액 (총 상품금액에서 쿠폰 할인 및 적립금 사용을 차감한 금액)
  const netProductAmount = Math.max(0, totalItemAmount - appliedDiscount - appliedPoints);

  // 적립금 또는 할인으로 인해 결제금액이 10만원 미만이 되었는지 확인 (배송비 부과 트리거)
  const isDiscountedUnderThreshold = (appliedDiscount > 0 || appliedPoints > 0) && netProductAmount < freeThreshold;

  // 등급별 상시 무료배송 혜택 여부 (PLATINUM, VVIP)
  const isTierFreeShipping = userGrade === "PLATINUM" || userGrade === "VVIP";

  // 배송비 계산:
  // 1) 장바구니가 비어있거나(0원) 기본 배송비가 0원이면 0원
  // 2) 적립금이나 할인으로 인해 실 결제금액이 10만원 미만으로 떨어지면 무조건 배송비 발생 (VVIP/플래티넘 포함)
  // 3) 등급별 상시 무료배송(PLATINUM, VVIP) 대상인 경우 무료배송 (할인/적립금으로 10만원 미만이 되지 않은 경우)
  // 4) 일반 회원의 경우 실 결제금액이 10만원 이상이면 무료배송, 10만원 미만이면 배송비 발생
  const shippingFee =
    totalItemAmount === 0 || baseShippingFee === 0
      ? 0
      : isDiscountedUnderThreshold
      ? baseShippingFee
      : isTierFreeShipping
      ? 0
      : netProductAmount >= freeThreshold
      ? 0
      : baseShippingFee;

  const handleApplyPoints = (amountToUse?: number) => {
    const amount = amountToUse !== undefined ? amountToUse : parseInt(usedPointsInput) || 0;
    if (amount <= 0) {
      setAppliedPoints(0);
      setPointsMessage(null);
      return;
    }
    if (amount > availablePoints) {
      setPointsMessage(`❌ 보유 적립금(${availablePoints.toLocaleString()}P) 초과 사용은 불가능합니다.`);
      return;
    }
    // 적립금은 상품 금액(쿠폰 할인 차감 후)에 대해 최대 사용 가능 (배송비는 별도 부과)
    const maxUsable = Math.max(0, totalItemAmount - appliedDiscount);
    const finalUse = Math.min(amount, maxUsable);
    setAppliedPoints(finalUse);
    setPointsMessage(`🎉 ${finalUse.toLocaleString()}P 적립금이 적용되었습니다.`);
  };

  const handleUseAllPoints = () => {
    const maxUsable = Math.max(0, totalItemAmount - appliedDiscount);
    const finalUse = Math.min(availablePoints, maxUsable);
    setUsedPointsInput(String(finalUse));
    handleApplyPoints(finalUse);
  };

  const finalTotalAmount = Math.max(0, totalItemAmount + shippingFee - appliedDiscount - appliedPoints);
  const earnedPoints = Math.floor(finalTotalAmount * (pointRate / 100));


  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY &&
    !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY.includes("docs_") &&
    !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY.includes("yL0qZ4G1VOlDEDezkwPProWb2MQY")
      ? process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      : "live_ck_24xLea5zVA9vgOXeeq92VQAMYNwW";
  const customerKey = "CHOICOMMA_USER_" + (formData.ordererPhone ? formData.ordererPhone.replace(/[^0-9]/g, "") : "GUEST");
  const isWidgetKey = clientKey.includes("_gck_");

  const handlePayment = async () => {
    if (!agreedTerms.privacy || !agreedTerms.thirdParty || !agreedTerms.paymentService) {
      alert("주문 진행을 위해 필수 약관에 동의해 주세요.");
      return;
    }

    if (!formData.recipientName || !formData.recipientPhone || !formData.address) {
      alert("배송지 정보를 정확히 입력해 주세요.");
      return;
    }

    try {
      setIsDirectPayLoading(true);

      const tossPayments = await loadTossPayments(clientKey);

      // 주문서번호 생성 규칙: CH + 날짜(YYYYMMDD) + '-' + 주문순서(001, 002...)
      let orderId = "";
      try {
        const nextIdRes = await fetch("/api/orders/next-id", { cache: "no-store" });
        if (nextIdRes.ok) {
          const idData = await nextIdRes.json();
          if (idData?.nextOrderId) orderId = idData.nextOrderId;
        }
      } catch {}
      if (!orderId) {
        orderId = generateNextOrderId();
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const orderName = cart?.lines?.[0]?.merchandise?.product?.title
        ? cart.lines.length > 1
          ? `${cart.lines[0].merchandise.product.title} 외 ${cart.lines.length - 1}건`
          : cart.lines[0].merchandise.product.title
        : "초이콤마 오리지널 패션 주문건";

      // If coupon was applied, mark this coupon code as used to prevent reuse
      if (couponCode.trim() && appliedDiscount > 0) {
        const cleanedCode = couponCode.trim().toUpperCase().replace(/\s+/g, "");
        const usedCouponsRaw = localStorage.getItem("used_coupon_codes") || "[]";
        let usedCoupons: string[] = [];
        try {
          usedCoupons = JSON.parse(usedCouponsRaw);
        } catch (e) { }
        if (!usedCoupons.includes(cleanedCode)) {
          usedCoupons.push(cleanedCode);
          localStorage.setItem("used_coupon_codes", JSON.stringify(usedCoupons));
        }
      }

      // Deduct used rewards points if any
      if (appliedPoints > 0) {
        const remaining = Math.max(0, availablePoints - appliedPoints);
        localStorage.setItem("membership_user_points", String(remaining));
        setAvailablePoints(remaining);
      }

      // Save refund account & pending order info
      if (typeof window !== "undefined") {
        if (formData.refundAccountNumber) {
          localStorage.setItem("membership_user_refund_bank", formData.refundBank);
          localStorage.setItem("membership_user_refund_account", formData.refundAccountNumber);
          localStorage.setItem("membership_user_refund_holder", formData.refundAccountHolder);
        }
        const effectiveDeliveryMemo =
          formData.deliveryMemo === "직접 입력"
            ? (formData.customDeliveryMemo.trim() || "직접 입력")
            : formData.deliveryMemo;

        sessionStorage.setItem(
          `pending_order_${orderId}`,
          JSON.stringify({
            orderId,
            formData: {
              ...formData,
              deliveryMemo: effectiveDeliveryMemo,
            },
            cart,
            finalTotalAmount,
            earnedPoints,
            pointRate,
            userGrade,
            appliedPoints,
            appliedDiscount,
            shippingFee,
            paidAt: new Date().toISOString(),
          })
        );
      }

      // 전액 적립금 또는 전액 할인 쿠폰으로 최종 결제 금액이 0원인 경우
      // 외부 PG 결제창(신용카드 등)을 호출하지 않고 즉시 주문 완료로 이동
      if (finalTotalAmount <= 0) {
        setIsDirectPayLoading(true);
        try {
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("choicomma_cart");
              window.dispatchEvent(new CustomEvent("choicomma_cart_updated", { detail: { action: "clear" } }));
            } catch (e) {}
          }
          router.push(`/order/success?orderId=${orderId}&amount=0&paymentType=FREE`);
          return;
        } finally {
          setIsDirectPayLoading(false);
        }
      }

      // Use direct Payment window request (Card, EasyPay, Virtual Account, Transfer, Mobile Phone)
      const payment = tossPayments.payment({ customerKey });

      const basePaymentConfig = {
        amount: {
          currency: "KRW",
          value: finalTotalAmount,
        },
        orderId,
        orderName,
        successUrl: `${origin}/order/success`,
        failUrl: `${origin}/order/fail`,
        customerEmail: formData.ordererEmail || "customer@choicomma.com",
        customerName: formData.recipientName || "홍길동",
      };

      if (formData.paymentMethod === "VIRTUAL_ACCOUNT") {
        await (payment as any).requestPayment({
          ...basePaymentConfig,
          method: "VIRTUAL_ACCOUNT",
          virtualAccount: {
            cashReceipt: {
              type: "소득공제",
            },
            useEscrow: false,
            validHours: 72,
          },
        });
      } else if (formData.paymentMethod === "TRANSFER") {
        await (payment as any).requestPayment({
          ...basePaymentConfig,
          method: "TRANSFER",
          transfer: {
            cashReceipt: {
              type: "소득공제",
            },
            useEscrow: false,
          },
        });
      } else if (formData.paymentMethod === "MOBILE_PHONE") {
        await (payment as any).requestPayment({
          ...basePaymentConfig,
          method: "MOBILE_PHONE",
        });
      } else {
        // CARD and EASY_PAY (Toss CARD window includes all Cards & EasyPay)
        await (payment as any).requestPayment({
          ...basePaymentConfig,
          method: "CARD",
          card: {
            useEscrow: false,
            flowMode: "DEFAULT",
            useCardPoint: false,
            useAppCardOnly: false,
          },
        });
      }
    } catch (err: any) {
      // Ignore user cancellation (closing the payment popup/window)
      if (
        err?.code === "PAY_PROCESS_CANCELED" ||
        err?.code === "USER_CANCEL" ||
        err?.message?.includes("취소")
      ) {
        console.log("사용자가 결제창을 취소하거나 닫았습니다.");
        return;
      }
      console.error("Direct Payment Request Failed Full Error:", err);
      const detailMsg = err?.message || (typeof err === "object" ? JSON.stringify(err) : String(err));
      alert(`결제창 호출 중 오류가 발생했습니다.\n\n[오류 내용]\n${detailMsg}\n\n(오류 코드: ${err?.code || "알 수 없음"})`);
    } finally {
      setIsDirectPayLoading(false);
    }
  };

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-24 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto text-neutral-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">장바구니가 비어 있습니다</h2>
          <p className="text-sm text-neutral-500">주문서에 담을 상품을 먼저 장바구니에 담아주세요.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center gap-2 bg-neutral-950 text-white font-extrabold px-8 py-3.5 rounded-2xl text-sm shadow-lg hover:bg-neutral-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
        <Link href="/" className="hover:text-neutral-900 transition-colors">HOME</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-neutral-900 transition-colors">SHOP</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-neutral-900 dark:text-white font-bold">CHECKOUT</span>
      </nav>

      {/* Page Title */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
          주문서 작성 및 결제
        </h1>
        <p className="text-sm text-neutral-500 mt-1 font-medium">
          주문 내역과 배송 정보를 확인하신 후 결제를 진행해 주세요.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Forms (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">

          {/* Section 1: Orderer Info */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>👤</span> 주문자 정보
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">주문자 성함</label>
                <input
                  type="text"
                  value={formData.ordererName}
                  onChange={(e) => handleInputChange("ordererName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">연락처</label>
                <input
                  type="tel"
                  value={formData.ordererPhone}
                  onChange={(e) => handleInputChange("ordererPhone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">이메일 주소 (주문 확인서 수신용)</label>
                <input
                  type="email"
                  value={formData.ordererEmail}
                  onChange={(e) => handleInputChange("ordererEmail", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Info */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-neutral-900 dark:text-white" /> 배송지 정보
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    recipientName: prev.ordererName,
                    recipientPhone: prev.ordererPhone,
                  }));
                }}
                className="text-xs font-bold text-neutral-900 dark:text-neutral-300 hover:underline"
              >
                주문자 정보와 동일하게 채우기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">수령인 성함 *</label>
                <input
                  type="text"
                  required
                  value={formData.recipientName}
                  onChange={(e) => handleInputChange("recipientName", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">수령인 연락처 *</label>
                <input
                  type="tel"
                  required
                  value={formData.recipientPhone}
                  onChange={(e) => handleInputChange("recipientPhone", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">우편번호 및 기본주소 *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.postcode}
                    className="w-32 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 font-bold text-center text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
                        new (window as any).daum.Postcode({
                          oncomplete: function (data: any) {
                            let fullAddress = data.address;
                            let extraAddress = "";
                            if (data.addressType === "R") {
                              if (data.bname !== "") extraAddress += data.bname;
                              if (data.buildingName !== "") extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
                              fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
                            }
                            setFormData((prev) => ({
                              ...prev,
                              postcode: data.zonecode || "06306",
                              address: fullAddress,
                            }));
                          },
                        }).open();
                      } else {
                        alert("우편번호 검색 서비스를 로딩 중입니다.");
                      }
                    }}
                    className="px-5 py-3 bg-neutral-900 text-white rounded-xl text-xs font-extrabold hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    우편번호 검색
                  </button>
                </div>
                <input
                  type="text"
                  required
                  readOnly
                  value={formData.address}
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
                      new (window as any).daum.Postcode({
                        oncomplete: function (data: any) {
                          let fullAddress = data.address;
                          let extraAddress = "";
                          if (data.addressType === "R") {
                            if (data.bname !== "") extraAddress += data.bname;
                            if (data.buildingName !== "") extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
                            fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
                          }
                          setFormData((prev) => ({
                            ...prev,
                            postcode: data.zonecode || "06306",
                            address: fullAddress,
                          }));
                        },
                      }).open();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-2 cursor-pointer text-xs"
                  placeholder="우편번호 검색 버튼을 눌러 기본주소를 입력하세요"
                />
                <input
                  type="text"
                  value={formData.addressDetail}
                  onChange={(e) => handleInputChange("addressDetail", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="상세주소 (동, 호수 등)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">배송 요청사항</label>
                <select
                  value={formData.deliveryMemo}
                  onChange={(e) => handleInputChange("deliveryMemo", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)">문 앞에 놓아주세요 (배송 전 연락 부탁드립니다)</option>
                  <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                  <option value="배송 전 미리 연락 바랍니다">배송 전 미리 연락 바랍니다</option>
                  <option value="택배함에 보관해 주세요">택배함에 보관해 주세요</option>
                  <option value="직접 입력">직접 입력</option>
                </select>
                {formData.deliveryMemo === "직접 입력" && (
                  <input
                    type="text"
                    value={formData.customDeliveryMemo}
                    onChange={(e) => handleInputChange("customDeliveryMemo", e.target.value)}
                    placeholder="배송 기사님께 전달할 요청사항을 직접 입력해주세요"
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Payment Method Selection (결제 방법 선택) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-neutral-900 dark:text-white" /> 결제 방법 선택
              </h2>
              <span className="text-xs text-neutral-400 font-semibold">
                원하시는 결제 수단을 선택해 주세요
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. 신용/체크카드 */}
              <button
                type="button"
                onClick={() => handleInputChange("paymentMethod", "CARD")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer ${
                  formData.paymentMethod === "CARD"
                    ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-neutral-950/20 dark:ring-white/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <CreditCard className="w-5 h-5" />
                  {formData.paymentMethod === "CARD" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className="font-black text-sm">신용·체크카드</p>
                  <p className={`text-[11px] mt-0.5 ${formData.paymentMethod === "CARD" ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400"}`}>
                    모든 카드사 · 무이자할부
                  </p>
                </div>
              </button>

              {/* 2. 간편결제 */}
              <button
                type="button"
                onClick={() => handleInputChange("paymentMethod", "EASY_PAY")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer ${
                  formData.paymentMethod === "EASY_PAY"
                    ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-neutral-950/20 dark:ring-white/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Zap className="w-5 h-5 text-amber-500" />
                  {formData.paymentMethod === "EASY_PAY" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className="font-black text-sm">간편결제</p>
                  <p className={`text-[11px] mt-0.5 ${formData.paymentMethod === "EASY_PAY" ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400"}`}>
                    토스 · 카카오 · 네이버페이
                  </p>
                </div>
              </button>

              {/* 3. 실시간 계좌이체 */}
              <button
                type="button"
                onClick={() => handleInputChange("paymentMethod", "TRANSFER")}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 relative cursor-pointer ${
                  formData.paymentMethod === "TRANSFER"
                    ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md ring-2 ring-neutral-950/20 dark:ring-white/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                  {formData.paymentMethod === "TRANSFER" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  )}
                </div>
                <div>
                  <p className="font-black text-sm">실시간 계좌이체</p>
                  <p className={`text-[11px] mt-0.5 ${formData.paymentMethod === "TRANSFER" ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400"}`}>
                    은행 즉시 출금 이체
                  </p>
                </div>
              </button>
            </div>

            {/* Selected Method Description */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {formData.paymentMethod === "CARD" && "국내외 모든 신용카드 및 체크카드로 안전하게 결제하실 수 있습니다."}
                {formData.paymentMethod === "EASY_PAY" && "토스페이, 카카오페이, 네이버페이, 페이코 등 등록된 간편결제 수단으로 원클릭 결제합니다."}
                {formData.paymentMethod === "TRANSFER" && "금융결제원 연동을 통해 고객님의 은행 계좌에서 실시간으로 이체 결제됩니다."}
              </span>
            </div>
          </div>

          {/* Section 4: Refund Account Info (환불 계좌 정보) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>🏦</span> 환불 계좌 정보
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-semibold">
                주문 취소 및 반품 시 입력하신 환불계좌로 자동 입금됩니다.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">
                  은행명
                </label>
                <select
                  value={formData.refundBank}
                  onChange={(e) => handleInputChange("refundBank", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="국민은행">국민은행</option>
                  <option value="신한은행">신한은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="하나은행">하나은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="토스뱅크">토스뱅크</option>
                  <option value="농협은행">농협은행</option>
                  <option value="기업은행">기업은행</option>
                  <option value="SC제일은행">SC제일은행</option>
                  <option value="케이뱅크">케이뱅크</option>
                  <option value="우체국">우체국</option>
                  <option value="새마을금고">새마을금고</option>
                  <option value="신협">신협</option>
                  <option value="수협은행">수협은행</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">
                  계좌번호 (- 없이 숫자만 입력)
                </label>
                <input
                  type="text"
                  value={formData.refundAccountNumber}
                  onChange={(e) => handleInputChange("refundAccountNumber", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="예: 123456789012"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-neutral-500 uppercase mb-1.5">
                  예금주명 - 반드시 본인 계좌로 입력바랍니다.
                </label>
                <input
                  type="text"
                  value={formData.refundAccountHolder}
                  onChange={(e) => handleInputChange("refundAccountHolder", e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              * 가상계좌/무통장입금 주문의 취소 및 부분 환불 또는 반품 처리 시 위 등록된 환불 계좌로 안전하게 입금됩니다.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout CTA (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-black text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-800 pb-4">
              주문 상품 요약 ({cart.lines.length}개)
            </h2>

            {/* Cart Items List */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {cart.lines.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  {item.merchandise.product.featuredImage?.url && (
                    <img
                      src={item.merchandise.product.featuredImage.url}
                      alt={item.merchandise.product.title}
                      className="w-14 h-14 object-cover rounded-xl border border-neutral-200/60 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-neutral-900 dark:text-white truncate">
                      {translateProductTitle(item.merchandise.product.title, currentLang)}
                    </p>
                    <p className="text-[11px] text-neutral-400 font-medium">
                      수량: {item.quantity}개
                    </p>
                  </div>
                  <p className="text-xs font-black text-neutral-900 dark:text-white">
                    {formatPrice(item.cost.totalAmount.amount, item.cost.totalAmount.currencyCode)}
                  </p>
                </div>
              ))}
            </div>

            {/* Coupon Auto-Apply & Selector Section inside Order Summary */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-extrabold text-neutral-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                  쿠폰 할인
                  {appliedDiscount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      자동 적용
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-neutral-500 font-bold">
                  보유 쿠폰: <strong className="text-neutral-900 dark:text-white">{availableCoupons.length}장</strong>
                </span>
              </div>

              {/* Coupon Select Dropdown */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedCouponCode}
                    onChange={(e) => handleSelectCoupon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs appearance-none pr-8 cursor-pointer text-neutral-900 dark:text-white"
                  >
                    {availableCoupons.length > 0 ? (
                      availableCoupons.map((coupon, idx) => (
                        <option key={coupon.id} value={coupon.code}>
                          {idx === 0 ? "✨ [자동 적용] " : "🎟️ "}
                          {coupon.title} (-{coupon.discountAmount.toLocaleString()}원)
                        </option>
                      ))
                    ) : (
                      <option value="NONE">사용 가능한 보유 쿠폰 없음</option>
                    )}
                    <option value="NONE">❌ 쿠폰 적용 안 함 (0원)</option>
                    <option value="DIRECT">✍️ 쿠폰 코드 직접 입력하기</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </div>
                </div>

                {/* Direct Coupon Input Field (shown when user chooses '직접 입력하기') */}
                {isDirectCouponInput && (
                  <div className="flex gap-2 pt-1 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="쿠폰 코드 직접 입력 (예: CHOI10)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-colors shrink-0"
                    >
                      적용
                    </button>
                  </div>
                )}
              </div>

              {couponMessage && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-bold ${
                    appliedDiscount > 0
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {couponMessage}
                </div>
              )}
            </div>

            {/* Rewards Points (적립금) Section */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-neutral-900 dark:text-white">
                <span>💰 보유 적립금 사용</span>
                <span className="text-neutral-500 font-bold">보유: <strong className="text-neutral-900 dark:text-white">{availablePoints.toLocaleString()}P</strong></span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={usedPointsInput}
                  onChange={(e) => {
                    setUsedPointsInput(e.target.value);
                    const val = parseInt(e.target.value) || 0;
                    handleApplyPoints(val);
                  }}
                  placeholder="0 P"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs"
                />
                <button
                  type="button"
                  onClick={handleUseAllPoints}
                  className="px-3.5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-colors shrink-0"
                >
                  전액사용
                </button>
              </div>
              {pointsMessage && (
                <p className="text-[11px] font-bold text-neutral-900 dark:text-white">
                  {pointsMessage}
                </p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-sm font-bold">
              <div className="flex justify-between text-neutral-500">
                <span>총 상품 금액</span>
                <span className="font-bold text-neutral-900 dark:text-white">{formatPrice(totalItemAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span>배송비</span>
                  {isDiscountedUnderThreshold && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      실결제 10만원 미만
                    </span>
                  )}
                </div>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {shippingFee === 0 ? "무료배송 (0원)" : formatPrice(shippingFee)}
                </span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-neutral-900 dark:text-white font-bold">
                  <span>쿠폰 할인</span>
                  <span className="font-black text-neutral-950 dark:text-white">-{formatPrice(appliedDiscount)}</span>
                </div>
              )}
              {appliedPoints > 0 && (
                <div className="flex justify-between text-neutral-900 dark:text-white font-bold">
                  <span>적립금 사용</span>
                  <span className="font-black text-neutral-950 dark:text-white">-{appliedPoints.toLocaleString()}P</span>
                </div>
              )}
              <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex justify-between items-center text-xs text-neutral-900 dark:text-white font-extrabold">
                <div className="flex items-center gap-1.5">
                  <span>🎁 {userGrade} 등급 적립 예정 혜택</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                    {pointRate}%
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  +{earnedPoints.toLocaleString()}P
                </span>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 flex justify-between items-baseline">
                <span className="text-base font-black text-neutral-900 dark:text-white">최종 결제 금액</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-white">
                  {formatPrice(finalTotalAmount)}
                </span>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-extrabold text-neutral-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={agreedTerms.all}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAgreedTerms({ all: checked, privacy: checked, thirdParty: checked, paymentService: checked });
                  }}
                  className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900 accent-black"
                />
                <span>구매 조건 확인 및 전체 약관 동의</span>
              </label>
              <div className="pl-6 space-y-1 text-neutral-400 font-medium text-[11px]">
                <p>✓ 개인정보 수집·이용 동의 (필수)</p>
                <p>✓ 결제대행 서비스 이용약관 동의 (필수)</p>
              </div>
            </div>

            {/* Final Submit Payment Button */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isDirectPayLoading}
                onClick={handlePayment}
                className="w-full bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDirectPayLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    토스결제창 로딩 중...
                  </span>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-white" />
                    <span>{formatPrice(finalTotalAmount)} 결제하기</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-neutral-500 font-medium">
                결제 수단: <span className="font-extrabold text-neutral-900 dark:text-neutral-200">{
                  formData.paymentMethod === "CARD" ? "신용·체크카드" :
                  formData.paymentMethod === "EASY_PAY" ? "간편결제 (카카오/네이버/토스)" :
                  "실시간 계좌이체"
                }</span>
              </div>
            </div>

            <p className="text-[11px] text-center text-neutral-400 font-medium flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              토스페이먼츠 PG 연동으로 안전하게 보호됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
