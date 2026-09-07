"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, ShieldCheck, Lock, CreditCard, Truck, CheckCircle2, ChevronRight } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/sfcc/utils";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { translateProductTitle, getCurrentLanguage } from "@/lib/i18n/translation";
import { useEffect } from "react";

export default function CheckoutClientWrapper() {
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
    // Payment
    paymentMethod: "easypay", // easypay | card | vbank
  });

  // Sync Member Profile from My Page (membership_user_*)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("membership_user_name") || "홍길동";
      const savedEmail = localStorage.getItem("membership_user_email") || "customer@choicomma.com";
      const savedPhone = localStorage.getItem("membership_user_phone") || "010-1234-5678";
      const savedAddress = localStorage.getItem("membership_user_address") || "서울특별시 강남구 테헤란로 123";
      const savedRefundBank = localStorage.getItem("membership_user_refund_bank") || "국민은행";
      const savedRefundAccount = localStorage.getItem("membership_user_refund_account") || "";
      const savedRefundHolder = localStorage.getItem("membership_user_refund_holder") || savedName;

      setFormData((prev) => ({
        ...prev,
        ordererName: prev.ordererName || savedName,
        ordererEmail: prev.ordererEmail || savedEmail,
        ordererPhone: prev.ordererPhone || savedPhone,
        recipientName: prev.recipientName || savedName,
        recipientPhone: prev.recipientPhone || savedPhone,
        address: prev.address || savedAddress,
        refundBank: prev.refundBank || savedRefundBank,
        refundAccountNumber: prev.refundAccountNumber || savedRefundAccount,
        refundAccountHolder: prev.refundAccountHolder || savedRefundHolder,
      }));
    }
  }, []);

  // Coupon / Discount State
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

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
      setAppliedDiscount(3000);
      setCouponMessage("🎉 무료 배송 지원 쿠폰이 정상 적용되었습니다! (-3,000원)");
    }
    else {
      setCouponMessage("❌ 유효하지 않은 쿠폰 코드입니다. 마이페이지 [쿠폰함]의 코드를 복사하여 입력해 주세요.");
      setAppliedDiscount(0);
    }
  };

  // Dynamic Shipping Policy State
  const [shippingPolicy, setShippingPolicy] = useState({
    baseFee: 3000,
    freeShippingThreshold: 100000,
    islandExtraFee: 3000,
    returnExchangeFee: 6000,
    courierName: "CJ대한통운 (주계약)",
    shippingNotice: "평일 14:00 이전 결제 완료 시 당일 출고됩니다.",
  });

  // Rewards Points (적립금) State
  const [availablePoints, setAvailablePoints] = useState(5000);
  const [usedPointsInput, setUsedPointsInput] = useState("");
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPoints = localStorage.getItem("membership_user_points");
      if (savedPoints && !isNaN(parseInt(savedPoints))) {
        setAvailablePoints(parseInt(savedPoints));
      } else {
        localStorage.setItem("membership_user_points", "5000");
        setAvailablePoints(5000);
      }
    }
  }, []);

  useEffect(() => {
    const updateShippingPolicy = () => {
      if (typeof window !== "undefined") {
        const savedPolicy = localStorage.getItem("shipping_policy");
        if (savedPolicy) {
          try {
            setShippingPolicy(JSON.parse(savedPolicy));
          } catch (e) { }
        }
      }
    };
    updateShippingPolicy();
    window.addEventListener("storage", updateShippingPolicy);
    window.addEventListener("shipping_policy_updated", updateShippingPolicy);
    return () => {
      window.removeEventListener("storage", updateShippingPolicy);
      window.removeEventListener("shipping_policy_updated", updateShippingPolicy);
    };
  }, []);

  const totalItemAmount = Number(cart?.cost?.totalAmount?.amount || 0);
  const freeThreshold = shippingPolicy.freeShippingThreshold !== undefined ? shippingPolicy.freeShippingThreshold : 100000;
  const baseShippingFee = shippingPolicy.baseFee !== undefined ? shippingPolicy.baseFee : 3000;
  const shippingFee = (freeThreshold > 0 && totalItemAmount >= freeThreshold) || totalItemAmount === 0 || baseShippingFee === 0 ? 0 : baseShippingFee;

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
    const maxUsable = Math.max(0, totalItemAmount + shippingFee - appliedDiscount);
    const finalUse = Math.min(amount, maxUsable);
    setAppliedPoints(finalUse);
    setPointsMessage(`🎉 ${finalUse.toLocaleString()}P 적립금이 적용되었습니다.`);
  };

  const handleUseAllPoints = () => {
    const maxUsable = Math.max(0, totalItemAmount + shippingFee - appliedDiscount);
    const finalUse = Math.min(availablePoints, maxUsable);
    setUsedPointsInput(String(finalUse));
    handleApplyPoints(finalUse);
  };

  const finalTotalAmount = Math.max(0, totalItemAmount + shippingFee - appliedDiscount - appliedPoints);
  const earnedPoints = Math.floor(finalTotalAmount * 0.01);

  let rawClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_docs_Oabc1234567890";
  if (rawClientKey.includes("yL0qZ4G1VOlDEDezkwPProWb2MQY")) {
    rawClientKey = "test_ck_docs_Oabc1234567890";
  }
  const clientKey = rawClientKey;
  const customerKey = "CHOICOMMA_TEST_USER_99";
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
      const orderId = `CHOICOMMA_ORDER_${Date.now()}`;
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
        sessionStorage.setItem(
          `pending_order_${orderId}`,
          JSON.stringify({
            orderId,
            formData,
            cart,
            finalTotalAmount,
            paidAt: new Date().toISOString(),
          })
        );
      }

      // Use direct Payment window request (Card & EasyPay supported)
      const payment = tossPayments.payment({ customerKey });
      await (payment as any).requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: finalTotalAmount > 0 ? finalTotalAmount : 50000,
        },
        orderId,
        orderName,
        successUrl: `${origin}/order/success`,
        failUrl: `${origin}/order/fail`,
        customerEmail: formData.ordererEmail || "customer@choicomma.com",
        customerName: formData.recipientName || "홍길동",
      });
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
      console.error("Direct Payment Request Failed:", err);
      alert(err?.message || "결제 창 호출 중 오류가 발생했습니다. 클라이언트 키 또는 네트워크 상태를 확인해 주세요.");
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
              </div>
            </div>
          </div>

          {/* Section 3: Refund Account Info (환불 계좌 정보) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>🏦</span> 환불 계좌 정보
              </h2>
              <span className="text-xs text-neutral-400 font-semibold">
                무통장입금 주문건은 환불 취소 시 환불계좌 입력.
                주문건 취소시 환불계좌로 자동 입금됩니다.
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

            {/* Coupon Code Section inside Order Summary */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <label className="block text-xs font-extrabold text-neutral-900 dark:text-white">
                🎟️ 쿠폰 할인 적용
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="쿠폰 코드 (예: CHOI10, WELCOME)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 font-bold focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-black transition-colors"
                >
                  적용
                </button>
              </div>
              {couponMessage && (
                <p className="text-[11px] font-bold text-neutral-900 dark:text-white">
                  {couponMessage}
                </p>
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
                <span>배송비</span>
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
                <span>🎁 구매 시 적립 예정 혜택 (1%)</span>
                <span className="font-mono font-black">+{earnedPoints.toLocaleString()}P</span>
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
